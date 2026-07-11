"""Multi-judge robustness harness.

Re-judges a stratified sample of already-recorded model responses with one or
more *alternative* judge models and measures how stable the binary ALLOW/REMOVE
verdict is to the choice of judge. This quantifies the benchmark's largest
construct-validity risk — judge dependence — described in LIMITATIONS.md and
docs/ANALYSIS_PLAN.md §5.

What it reports (written to web/public/judge_robustness.json):
  - Per alternate judge: Cohen's kappa and percent agreement vs. the primary
    judge's recorded verdict, on the shared sample.
  - Fleiss' kappa across all raters (primary judge + every alternate) on the
    binary refusal decision.
  - Verdict flip rate: the fraction of sampled items where the raters do not
    unanimously agree — i.e. how often a finding depends on which judge is used.

Binary verdict mapping matches the pipeline (src/audit_runner.py):
    "Authorized" -> ALLOW, everything else -> REFUSAL.

COST: makes (sample x judges) live API calls. This is *not* part of the default
pipeline; run it manually when you want a robustness snapshot:

    OPENROUTER_API_KEY=... python scripts/judge_robustness.py \\
        --sample 200 \\
        --judges anthropic/claude-3.5-haiku,google/gemini-flash-1.5,meta-llama/llama-3.1-70b-instruct
"""
import os
import sys
import csv
import json
import math
import random
import asyncio
import argparse
import logging
from collections import defaultdict

# Keep stdlib CSV happy with very large response_text cells.
csv.field_size_limit(min(sys.maxsize, 2**31 - 1))

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

DEFAULT_INPUT = "web/public/audit_log.csv"
DEFAULT_OUTPUT = "web/public/judge_robustness.json"
# Verdicts that are not scorable (excluded, mirrors src/refusal.py NON_VERDICTS).
NON_VERDICTS = {"ERROR", "", "UNKNOWN"}
# Recorded-verdict strings that count as a refusal (mirrors src/refusal.py).
REFUSAL_VERDICTS = {"REMOVED", "REFUSAL", "POLICY_REFUSAL", "META_REFUSAL", "BLOCKED", "Hard Refusal", "unsafe"}


# --------------------------------------------------------------------------- #
# Pure aggregation math (unit-tested without network access).
# --------------------------------------------------------------------------- #
def cohens_kappa_binary(a, b):
    """Cohen's kappa for two 0/1 label lists."""
    n = len(a)
    if n == 0:
        return 0.0
    po = sum(x == y for x, y in zip(a, b)) / n
    pa1 = sum(a) / n
    pb1 = sum(b) / n
    pe = pa1 * pb1 + (1 - pa1) * (1 - pb1)
    if pe >= 1.0:
        return 1.0 if po >= 1.0 else 0.0
    return (po - pe) / (1 - pe)


def percent_agreement(a, b):
    if not a:
        return 0.0
    return sum(x == y for x, y in zip(a, b)) / len(a) * 100.0


def fleiss_kappa_binary(matrix):
    """Fleiss' kappa for N items x R raters of 0/1 labels (fixed rater count).

    `matrix` is a list of per-item rater-label lists, all length R.
    """
    if not matrix:
        return float("nan")
    n_items = len(matrix)
    n_raters = len(matrix[0])
    if n_raters < 2:
        return float("nan")
    # Per-item agreement P_i.
    p_i_sum = 0.0
    ones_total = 0
    for row in matrix:
        ones = sum(row)
        ones_total += ones
        zeros = n_raters - ones
        p_i = (ones * ones + zeros * zeros - n_raters) / (n_raters * (n_raters - 1))
        p_i_sum += p_i
    p_bar = p_i_sum / n_items
    p1 = ones_total / (n_items * n_raters)
    p_e = p1 * p1 + (1 - p1) * (1 - p1)
    if p_e >= 1.0:
        return 1.0 if p_bar >= 1.0 else 0.0
    return (p_bar - p_e) / (1 - p_e)


def interpret_kappa(k):
    if k != k:  # nan
        return "N/A"
    if k < 0:
        return "Poor"
    if k < 0.20:
        return "Slight"
    if k < 0.40:
        return "Fair"
    if k < 0.60:
        return "Moderate"
    if k < 0.80:
        return "Substantial"
    return "Almost Perfect"


def category_to_refusal(category):
    """Binary refusal from a taxonomy category: Authorized -> allow (0), else refuse (1)."""
    return 0 if str(category).strip() == "Authorized" else 1


def recorded_verdict_to_refusal(verdict):
    return 1 if str(verdict).strip() in REFUSAL_VERDICTS else 0


# --------------------------------------------------------------------------- #
# Sampling
# --------------------------------------------------------------------------- #
def load_scorable_rows(path):
    rows = []
    with open(path, "r", encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            verdict = (r.get("verdict") or "").strip()
            prompt_text = (r.get("prompt_text") or "").strip()
            response_text = (r.get("response_text") or "").strip()
            if verdict in NON_VERDICTS or not prompt_text or not response_text:
                continue
            rows.append(r)
    return rows


def stratified_sample(rows, n, seed):
    """Deduplicate by (prompt_id, model), then sample ~n rows stratified by category."""
    rng = random.Random(seed)
    # One row per (prompt_id, model) for coverage per API dollar.
    seen = set()
    unique = []
    order = list(range(len(rows)))
    rng.shuffle(order)
    for i in order:
        r = rows[i]
        key = (r.get("prompt_id", ""), r.get("model", ""))
        if key in seen:
            continue
        seen.add(key)
        unique.append(r)

    if n >= len(unique):
        return unique

    by_cat = defaultdict(list)
    for r in unique:
        by_cat[r.get("category", "Uncategorized")].append(r)

    total = len(unique)
    sample = []
    for cat, cat_rows in by_cat.items():
        k = max(1, round(n * len(cat_rows) / total))
        sample.extend(cat_rows[:k])
    rng.shuffle(sample)
    return sample[:n]


# --------------------------------------------------------------------------- #
# Judging
# --------------------------------------------------------------------------- #
async def judge_sample(sample, judges, concurrency):
    """Return {judge_model: [0/1 refusal per sampled item]} using TaxonomyClassifier."""
    from openai import AsyncOpenAI
    from src.taxonomy import TaxonomyClassifier

    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        logger.error("❌ OPENROUTER_API_KEY is not set. Cannot run live judging.")
        sys.exit(1)

    client = AsyncOpenAI(base_url="https://openrouter.ai/api/v1", api_key=api_key)
    results = {}
    for judge in judges:
        classifier = TaxonomyClassifier(client, model=judge)
        sem = asyncio.Semaphore(concurrency)

        async def classify_one(row):
            async with sem:
                out = await classifier.classify(row.get("prompt_text", ""), row.get("response_text", ""))
                return category_to_refusal(out.get("category", "Unknown"))

        logger.info(f"⚖️  Judging {len(sample)} items with {judge} ...")
        results[judge] = await asyncio.gather(*(classify_one(r) for r in sample))
    return results


def build_report(sample, judge_labels, judges, primary_model, sample_n_requested):
    primary = [recorded_verdict_to_refusal(r.get("verdict", "")) for r in sample]

    per_judge = []
    for judge in judges:
        labels = judge_labels[judge]
        per_judge.append({
            "judge": judge,
            "n": len(labels),
            "kappaVsPrimary": round(cohens_kappa_binary(primary, labels), 4),
            "kappaInterpretation": interpret_kappa(cohens_kappa_binary(primary, labels)),
            "percentAgreement": round(percent_agreement(primary, labels), 1),
            "refusalRate": round(sum(labels) / len(labels) * 100, 1) if labels else 0.0,
        })
    per_judge.sort(key=lambda j: j["kappaVsPrimary"], reverse=True)

    # Fleiss across primary + all alternate judges.
    matrix = [[primary[i]] + [judge_labels[j][i] for j in judges] for i in range(len(sample))]
    fleiss = fleiss_kappa_binary(matrix)

    unanimous = sum(1 for row in matrix if len(set(row)) == 1)
    flip_rate = round((1 - unanimous / len(matrix)) * 100, 1) if matrix else 0.0

    # Majority of alternate judges vs primary (how often the primary is the outlier).
    disagree_majority = 0
    for i in range(len(sample)):
        alt = [judge_labels[j][i] for j in judges]
        if not alt:
            continue
        majority = 1 if sum(alt) / len(alt) >= 0.5 else 0
        if majority != primary[i]:
            disagree_majority += 1
    majority_disagreement = round(disagree_majority / len(sample) * 100, 1) if sample else 0.0

    return {
        "primaryJudge": primary_model,
        "alternateJudges": judges,
        "sampleRequested": sample_n_requested,
        "sampleEvaluated": len(sample),
        "primaryRefusalRate": round(sum(primary) / len(primary) * 100, 1) if primary else 0.0,
        "fleissKappaAllJudges": None if fleiss != fleiss else round(fleiss, 4),
        "fleissInterpretation": interpret_kappa(fleiss),
        "verdictFlipRate": flip_rate,
        "primaryVsJudgeMajorityDisagreement": majority_disagreement,
        "perJudge": per_judge,
        "note": (
            "Verdict flip rate is the share of items where the primary judge and the "
            "alternate judges do not unanimously agree; lower is more robust."
        ),
    }


def parse_args(argv=None):
    from src.judge_config import JUDGE_MODEL

    p = argparse.ArgumentParser(description="Multi-judge robustness harness.")
    p.add_argument("--sample", type=int, default=200, help="Number of items to re-judge (default 200).")
    p.add_argument(
        "--judges",
        type=str,
        default="anthropic/claude-3.5-haiku,google/gemini-flash-1.5,meta-llama/llama-3.1-70b-instruct",
        help="Comma-separated alternate judge model ids.",
    )
    p.add_argument("--input", type=str, default=DEFAULT_INPUT, help="Audit CSV with prompt_text/response_text.")
    p.add_argument("--out", type=str, default=DEFAULT_OUTPUT, help="Output JSON path.")
    p.add_argument("--seed", type=int, default=42, help="Sampling seed for reproducibility.")
    p.add_argument("--concurrency", type=int, default=8, help="Concurrent API calls per judge.")
    args = p.parse_args(argv)
    args.primary_model = JUDGE_MODEL
    return args


def main(argv=None):
    args = parse_args(argv)
    judges = [j.strip() for j in args.judges.split(",") if j.strip()]
    if not judges:
        logger.error("❌ No alternate judges specified.")
        sys.exit(1)

    if not os.path.exists(args.input):
        logger.error(f"❌ Input not found: {args.input} (decompress audit_log.csv.gz first).")
        sys.exit(1)

    logger.info(f"📂 Loading scorable rows from {args.input} ...")
    rows = load_scorable_rows(args.input)
    logger.info(f"   {len(rows)} scorable rows with prompt+response text.")
    sample = stratified_sample(rows, args.sample, args.seed)
    logger.info(f"   Sampled {len(sample)} unique (prompt, model) items.")

    judge_labels = asyncio.run(judge_sample(sample, judges, args.concurrency))
    report = build_report(sample, judge_labels, judges, args.primary_model, args.sample)

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(report, f, separators=(",", ":"))

    logger.info("✅ Judge robustness report written to %s", args.out)
    logger.info(
        "   Fleiss κ=%s (%s) · flip rate=%s%% · primary-vs-majority disagreement=%s%%",
        report["fleissKappaAllJudges"], report["fleissInterpretation"],
        report["verdictFlipRate"], report["primaryVsJudgeMajorityDisagreement"],
    )
    for j in report["perJudge"]:
        logger.info("   %-42s κ=%.3f (%s)  agree=%.1f%%", j["judge"], j["kappaVsPrimary"], j["kappaInterpretation"], j["percentAgreement"])


if __name__ == "__main__":
    main()
