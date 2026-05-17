#!/usr/bin/env python3
"""
Calculate Inter-Annotator Agreement (IAA) between human annotators and AI verdict labels.

Reads crowd annotations stored in Vercel Blob (via the /api/annotate/submit endpoint)
or from a local JSONL dump, and computes:
  - Cohen's Kappa (AI judge vs human verdicts)
  - Krippendorff's Alpha (multi-annotator, nominal)
  - Percent Agreement
  - Per-category breakdown
  - Confusion matrix (AI vs human)

Usage:
  # Fetch latest annotations from Blob and compute IAA
  python scripts/calculate_iaa.py

  # Use a local JSONL dump
  python scripts/calculate_iaa.py --input data/annotations_dump.jsonl

  # Write JSON results for downstream use
  python scripts/calculate_iaa.py --output data/iaa_results.json
"""

import argparse
import json
import os
import sys
import csv
import urllib.request
import urllib.error
from collections import defaultdict
from typing import Optional

load_dotenv_path = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.exists(load_dotenv_path):
    with open(load_dotenv_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

BLOB_BASE_URL = os.environ.get(
    "BLOB_BASE_URL",
    "https://oeqbf51ent3zxva1.public.blob.vercel-storage.com"
)

VERDICT_TO_INT = {"ALLOWED": 0, "REMOVED": 1}


# ══════════════════════════════════════════════════════════════════════════════
# Data loading
# ══════════════════════════════════════════════════════════════════════════════

def load_from_jsonl(path: str) -> list:
    records = []
    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    print(f"  Loaded {len(records)} annotations from {path}")
    return records


def load_from_csv(path: str) -> list:
    """Load from annotations_crowd.csv (prepare_human_annotations.py output)."""
    records = []
    with open(path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            verdict = row.get("human_verdict", "").strip().upper()
            ai_label = row.get("AI_Label", "").strip().upper()
            if verdict in ("ALLOWED", "REMOVED"):
                records.append({
                    "itemId": row.get("row_id", ""),
                    "verdict": verdict,
                    "AI_Label": ai_label,
                    "annotatorId": "human",
                    "model": row.get("model", ""),
                    "category": row.get("category", ""),
                })
    print(f"  Loaded {len(records)} completed annotations from {path}")
    return records


def fetch_blob_annotations() -> list:
    """
    Fetch annotation JSONL files from Vercel Blob public storage.
    The annotation API stores one file per annotation under annotations/<id>.jsonl
    We fetch the summary roll-up if it exists, else fall back.
    """
    urls_to_try = [
        f"{BLOB_BASE_URL}/annotations_summary.jsonl",
        f"{BLOB_BASE_URL}/annotations/summary.jsonl",
    ]
    for url in urls_to_try:
        try:
            print(f"  Trying {url} ...")
            with urllib.request.urlopen(url, timeout=15) as resp:
                content = resp.read().decode("utf-8").strip()
                records = [json.loads(l) for l in content.split("\n") if l.strip()]
                print(f"  ✅ Fetched {len(records)} annotations from Blob")
                return records
        except urllib.error.HTTPError as e:
            print(f"  HTTP {e.code} — skipping")
        except Exception as e:
            print(f"  Failed: {e}")
    print("  ⚠️  Could not fetch from Blob. Use --input to provide a local file.")
    return []


# ══════════════════════════════════════════════════════════════════════════════
# IAA metrics
# ══════════════════════════════════════════════════════════════════════════════

def percent_agreement(labels_a: list, labels_b: list) -> float:
    if not labels_a:
        return 0.0
    return sum(a == b for a, b in zip(labels_a, labels_b)) / len(labels_a) * 100


def cohens_kappa(labels_a: list, labels_b: list) -> float:
    """Cohen's Kappa — no external dependencies."""
    n = len(labels_a)
    if n == 0:
        return 0.0
    a = [VERDICT_TO_INT.get(x, x) if isinstance(x, str) else x for x in labels_a]
    b = [VERDICT_TO_INT.get(x, x) if isinstance(x, str) else x for x in labels_b]

    po = sum(ai == bi for ai, bi in zip(a, b)) / n

    p_a1 = sum(v == 1 for v in a) / n
    p_b1 = sum(v == 1 for v in b) / n
    pe = (p_a1 * p_b1) + ((1 - p_a1) * (1 - p_b1))

    if pe >= 1.0:
        return 1.0 if po >= 1.0 else 0.0
    return (po - pe) / (1 - pe)


def krippendorffs_alpha(ratings_matrix: list) -> float:
    """
    Krippendorff's Alpha for nominal data (no external dependencies).
    ratings_matrix: list of lists, one per annotator. None = missing rating.
    """
    n_annotators = len(ratings_matrix)
    if n_annotators < 2:
        return float("nan")
    n_units = max(len(row) for row in ratings_matrix)

    Do = 0.0
    total_unit_pairs = 0
    all_values = []

    for u in range(n_units):
        unit_vals = [
            ratings_matrix[a][u]
            for a in range(n_annotators)
            if u < len(ratings_matrix[a]) and ratings_matrix[a][u] is not None
        ]
        if len(unit_vals) < 2:
            continue
        mu = len(unit_vals)
        pairs = 0
        unit_Do = 0.0
        for i in range(mu):
            for j in range(i + 1, mu):
                d = 0 if unit_vals[i] == unit_vals[j] else 1
                unit_Do += d * 2
                pairs += 1
        if pairs:
            Do += unit_Do / (mu - 1)
            total_unit_pairs += pairs
        all_values.extend(unit_vals)

    if total_unit_pairs == 0:
        return float("nan")
    Do /= total_unit_pairs

    n = len(all_values)
    if n < 2:
        return float("nan")
    val_counts: dict = defaultdict(int)
    for v in all_values:
        val_counts[v] += 1
    De = 0.0
    for v1, c1 in val_counts.items():
        for v2, c2 in val_counts.items():
            if v1 != v2:
                De += c1 * c2
    De /= n * (n - 1)

    if De == 0:
        return 1.0
    return 1.0 - Do / De


def interpret_kappa(k: float) -> str:
    if k is None or (isinstance(k, float) and k != k):  # nan check
        return "N/A"
    if k < 0:       return "Poor (less than chance)"
    elif k < 0.20:  return "Slight"
    elif k < 0.40:  return "Fair"
    elif k < 0.60:  return "Moderate"
    elif k < 0.80:  return "Substantial"
    else:           return "Almost Perfect"


# ══════════════════════════════════════════════════════════════════════════════
# Main analysis
# ══════════════════════════════════════════════════════════════════════════════

def analyse(records: list) -> dict:
    if not records:
        print("❌ No annotation records to analyse.")
        return {}

    print(f"\n{'='*62}")
    print(f"  Inter-Annotator Agreement Analysis")
    print(f"  N = {len(records)} annotations")
    print(f"{'='*62}\n")

    annotators = sorted(set(r.get("annotatorId", "unknown") for r in records))
    print(f"Annotators ({len(annotators)}): {', '.join(annotators)}")

    results: dict = {"n": len(records), "annotators": annotators}

    # ── 1. AI label vs Human verdict ──────────────────────────────────────
    ai_human = [r for r in records
                if r.get("AI_Label") and r.get("verdict")
                and r["AI_Label"].upper() in ("ALLOWED", "REMOVED")
                and r["verdict"].upper() in ("ALLOWED", "REMOVED")]

    if ai_human:
        ai_l = [r["AI_Label"].upper() for r in ai_human]
        hum_l = [r["verdict"].upper() for r in ai_human]

        pct   = percent_agreement(ai_l, hum_l)
        kappa = cohens_kappa(ai_l, hum_l)
        alpha = krippendorffs_alpha([
            [VERDICT_TO_INT[v] for v in ai_l],
            [VERDICT_TO_INT[v] for v in hum_l],
        ])

        print(f"\n── AI Judge vs Human Annotators (N={len(ai_human)}) ──────────────")
        print(f"  Percent Agreement : {pct:.1f}%")
        print(f"  Cohen's Kappa     : {kappa:.3f}  ({interpret_kappa(kappa)})")
        print(f"  Krippendorff's α  : {alpha:.3f}")

        # Confusion matrix
        cm: dict = defaultdict(int)
        for a, h in zip(ai_l, hum_l):
            cm[(a, h)] += 1
        cats = ["ALLOWED", "REMOVED"]
        print(f"\n  Confusion Matrix (AI rows × Human columns):")
        print(f"  {'':14} {'ALLOWED':>10} {'REMOVED':>10}")
        for ai_v in cats:
            print(f"  {ai_v:14} " + "  ".join(f"{cm[(ai_v,h)]:>9}" for h in cats))

        # Per-category breakdown
        by_cat: dict = defaultdict(list)
        for r in ai_human:
            by_cat[r.get("category", "Unknown")].append(r)
        if len(by_cat) > 1:
            print(f"\n  Agreement by Category:")
            for cat, recs in sorted(by_cat.items()):
                a_l = [r["AI_Label"].upper() for r in recs]
                h_l = [r["verdict"].upper() for r in recs]
                print(f"    {cat:38} n={len(recs):3}  "
                      f"agree={percent_agreement(a_l, h_l):.0f}%  "
                      f"κ={cohens_kappa(a_l, h_l):.2f}")

        results.update({
            "ai_human_kappa": round(kappa, 4),
            "ai_human_alpha": round(alpha, 4),
            "ai_human_pct_agreement": round(pct, 2),
            "n_ai_human_pairs": len(ai_human),
        })

    # ── 2. Pairwise human agreement ────────────────────────────────────────
    if len(annotators) >= 2:
        item_map: dict = defaultdict(dict)
        for r in records:
            verdict = r.get("verdict", "").upper()
            if verdict in ("ALLOWED", "REMOVED"):
                item_map[r["itemId"]][r["annotatorId"]] = verdict

        multi = {iid: v for iid, v in item_map.items() if len(v) >= 2}
        print(f"\n── Pairwise Human Agreement ({len(multi)} doubly-rated items) ──────")

        pairwise_kappas = []
        if multi:
            for i, ann_a in enumerate(annotators):
                for ann_b in annotators[i+1:]:
                    shared = [(v[ann_a], v[ann_b])
                              for v in multi.values()
                              if ann_a in v and ann_b in v]
                    if not shared:
                        continue
                    la, lb = zip(*shared)
                    k = cohens_kappa(list(la), list(lb))
                    pairwise_kappas.append(k)
                    pct = percent_agreement(list(la), list(lb))
                    print(f"  {ann_a[:20]} × {ann_b[:20]}  "
                          f"n={len(shared):3}  agree={pct:.1f}%  "
                          f"κ={k:.3f}  ({interpret_kappa(k)})")

            # Multi-annotator alpha
            all_items = sorted(multi.keys())
            alpha_mat = [
                [VERDICT_TO_INT.get(multi[iid].get(ann))
                 for iid in all_items]
                for ann in annotators
            ]
            alpha = krippendorffs_alpha(alpha_mat)
            print(f"\n  Krippendorff's α (all, N={len(all_items)}): {alpha:.3f}")
            results["pairwise_human_kappas"] = pairwise_kappas
            results["human_alpha"] = round(alpha, 4) if alpha == alpha else None
        else:
            print("  No items rated by ≥2 human annotators yet.")

    # ── 3. Summary ─────────────────────────────────────────────────────────
    allowed = sum(1 for r in records if r.get("verdict","").upper() == "ALLOWED")
    removed = sum(1 for r in records if r.get("verdict","").upper() == "REMOVED")
    print(f"\n── Summary ────────────────────────────────────────────────────")
    print(f"  Total annotations : {len(records)}")
    print(f"  ALLOWED           : {allowed} ({allowed/len(records)*100:.1f}%)")
    print(f"  REMOVED           : {removed} ({removed/len(records)*100:.1f}%)")
    target = 500
    pct_done = len(records) / target * 100
    print(f"  Progress          : {len(records)}/{target} ({pct_done:.1f}%)")
    if len(records) < 100:
        print(f"\n  ⚠️  n<100: estimates unreliable. Share /annotate to collect more.")
    elif len(records) < 200:
        print(f"\n  ⚠️  n<200: tentative IAA. Target n≥200 for publishable results.")
    else:
        print(f"\n  ✅ Sample sufficient for publication-grade IAA reporting.")

    return results


# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Calculate Inter-Annotator Agreement for Moderation Bias"
    )
    parser.add_argument("--input", help="Local JSONL or CSV annotation file")
    parser.add_argument("--annotators", nargs="+",
                        help="Filter to specific annotator IDs")
    parser.add_argument("--output", help="Write JSON results to this path")
    args = parser.parse_args()

    records = []
    if args.input:
        ext = os.path.splitext(args.input)[1].lower()
        records = load_from_csv(args.input) if ext == ".csv" else load_from_jsonl(args.input)
    else:
        local_csv = os.path.join(os.path.dirname(__file__), "..", "data",
                                 "annotations_crowd.csv")
        if os.path.exists(local_csv):
            records = load_from_csv(local_csv)
        else:
            records = fetch_blob_annotations()

    if args.annotators and records:
        records = [r for r in records if r.get("annotatorId") in args.annotators]
        print(f"  Filtered to {len(records)} records for: {args.annotators}")

    results = analyse(records)

    if args.output and results:
        with open(args.output, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\n  Results written to {args.output}")


if __name__ == "__main__":
    main()
