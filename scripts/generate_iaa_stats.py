#!/usr/bin/env python3
"""
Generate iaa_stats.json for the IAA dashboard page.

Downloads annotation JSONL from Vercel Blob, computes IAA metrics,
and writes web/public/iaa_stats.json for the frontend.

Can be run standalone or called from compress_data.py / generate_all_reports.sh.
"""

import json
import os
import sys
import csv
import gzip
import urllib.request
import urllib.error
import urllib.parse
from collections import defaultdict, Counter
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

# Canonical refusal verdicts (kept in sync with src/refusal.py). Duplicated here
# because this script must run standalone without importing the package.
_REFUSAL_VERDICTS = {"REMOVED", "REFUSAL", "POLICY_REFUSAL", "META_REFUSAL", "BLOCKED", "Hard Refusal", "unsafe"}
_NON_VERDICTS = {"ERROR", "", "UNKNOWN"}
_AUDIT_CSV_PATHS = ["web/public/audit_log.csv", "web/public/audit_log.csv.gz"]

BLOB_BASE = os.environ.get(
    "BLOB_BASE_URL",
    "https://oeqbf51ent3zxva1.public.blob.vercel-storage.com"
)
# API host used by @vercel/blob's list() operation (needs the RW token).
BLOB_API_BASE = "https://blob.vercel-storage.com"
BLOB_TOKEN = os.environ.get("BLOB_READ_WRITE_TOKEN")
ANNOTATIONS_PREFIX = "annotations/"
OUTPUT_PATH = "web/public/iaa_stats.json"
VERDICT_TO_INT = {"ALLOWED": 0, "REMOVED": 1}


def _list_blob_urls(prefix: str) -> list:
    """List every blob URL under `prefix` via the Vercel Blob REST list API.

    The annotation write path stores each submission as an individual JSON file
    (annotations/{date}/{annotatorId}_{uniqueId}.json), so this is the ONLY way
    to discover them — the legacy rollup/daily JSONL files are no longer written.
    Requires BLOB_READ_WRITE_TOKEN; returns [] if it is unavailable.
    """
    if not BLOB_TOKEN:
        return []
    urls: list = []
    cursor: Optional[str] = None
    while True:
        params = {"prefix": prefix, "limit": "1000"}
        if cursor:
            params["cursor"] = cursor
        url = f"{BLOB_API_BASE}/?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {BLOB_TOKEN}"})
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            print(f"  ⚠️  Blob list failed: {e}")
            break
        for blob in data.get("blobs", []):
            # Skip "folder" placeholders (pathnames ending in '/').
            if blob.get("url") and not blob.get("pathname", "").endswith("/"):
                urls.append(blob["url"])
        if data.get("hasMore") and data.get("cursor"):
            cursor = data["cursor"]
        else:
            break
    return urls


def _download_records(url: str) -> list:
    """Download and parse one blob; tolerates a single JSON object or JSONL."""
    try:
        with urllib.request.urlopen(url, timeout=15) as resp:
            content = resp.read().decode("utf-8").strip()
    except Exception:
        return []
    out = []
    for line in content.split("\n"):
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except Exception:
            pass
    return out


def _fetch_annotations() -> list:
    """Fetch all annotations from Vercel Blob.

    Primary path: enumerate the individual per-submission JSON blobs written by
    the /api/annotate/submit route. Fallback: the legacy summary / daily JSONL
    rollups (kept so historical data or a tokenless run still works).
    """
    # Primary: list + download the individual annotation blobs.
    blob_urls = _list_blob_urls(ANNOTATIONS_PREFIX)
    if blob_urls:
        records: list = []
        with ThreadPoolExecutor(max_workers=16) as pool:
            for chunk in pool.map(_download_records, blob_urls):
                records.extend(chunk)
        if records:
            print(f"  ✅ Fetched {len(records)} annotations from {len(blob_urls)} individual blobs")
            return records

    # Fallback: legacy summary roll-up.
    for suffix in ["annotations_summary.jsonl", "annotations/summary.jsonl"]:
        url = f"{BLOB_BASE}/{suffix}"
        try:
            with urllib.request.urlopen(url, timeout=15) as resp:
                content = resp.read().decode("utf-8").strip()
                records = [json.loads(l) for l in content.split("\n") if l.strip()]
                if records:
                    print(f"  ✅ Fetched {len(records)} annotations from {suffix}")
                    return records
        except Exception:
            pass

    # Fallback: legacy daily files — enumerate known date range.
    from datetime import datetime, timedelta
    records = []
    day = datetime(2026, 1, 1)
    end = datetime.now() + timedelta(days=1)
    while day <= end:
        date_str = day.strftime("%Y-%m-%d")
        url = f"{BLOB_BASE}/annotations/{date_str}.jsonl"
        try:
            with urllib.request.urlopen(url, timeout=10) as resp:
                content = resp.read().decode("utf-8").strip()
                for line in content.split("\n"):
                    line = line.strip()
                    if line:
                        records.append(json.loads(line))
        except Exception:
            pass
        day += timedelta(days=1)

    if records:
        print(f"  ✅ Fetched {len(records)} annotations from daily JSONL files")
    return records


def _cohens_kappa(labels_a: list, labels_b: list) -> float:
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


def _krippendorffs_alpha(ratings_matrix: list) -> float:
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
    val_counts = defaultdict(int)
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


def _percent_agreement(a: list, b: list) -> float:
    if not a:
        return 0.0
    return sum(x == y for x, y in zip(a, b)) / len(a) * 100


def _interpret_kappa(k: float) -> str:
    if k != k:  # nan
        return "N/A"
    if k < 0:      return "Poor"
    elif k < 0.20: return "Slight"
    elif k < 0.40: return "Fair"
    elif k < 0.60: return "Moderate"
    elif k < 0.80: return "Substantial"
    else:          return "Almost Perfect"


def _base_prompt_id(pid: str) -> str:
    """Normalize a prompt/item id for cross-source matching.

    Audit `prompt_id` and annotation `itemId` share the same scheme
    (e.g. ``HS-22``, ``B-02-H``). Strip a trailing ``-V<n>`` variant/repetition
    suffix if one is present so a variant still matches its base prompt.
    """
    pid = (pid or "").strip()
    parts = pid.rsplit("-V", 1)
    if len(parts) == 2 and parts[1].isdigit():
        return parts[0]
    return pid


def _find_audit_csv() -> Optional[str]:
    for p in _AUDIT_CSV_PATHS:
        if os.path.exists(p):
            return p
    return None


def compute_human_alignment(records: list) -> dict:
    """Agreement between the human-annotation consensus and each model's verdict.

    For every prompt that has human annotations, we take the majority human
    verdict (ALLOWED / REMOVED; ties are dropped) as ground truth, then compare
    it against each model's binarized verdict on the same prompt from the audit
    log. We report Cohen's kappa and raw percent agreement per model, plus an
    "overall" comparison of the human consensus against the models' majority
    verdict. This is the alignment layer that lets the benchmark be validated
    against real human judgement rather than an LLM judge alone.

    Returns ``{}`` when there is no usable overlap (e.g. no annotations yet, or
    the audit log is not present in this checkout).
    """
    # 1. Human consensus verdict per (base) prompt id.
    human_votes: dict = defaultdict(Counter)
    for r in records:
        verdict = (r.get("verdict") or "").upper()
        iid = _base_prompt_id(str(r.get("itemId", "")))
        if verdict in ("ALLOWED", "REMOVED") and iid:
            human_votes[iid][verdict] += 1

    human_consensus: dict = {}
    multi_annotator_items: set = set()  # consensus items backed by >=2 annotators
    for iid, counts in human_votes.items():
        if counts["ALLOWED"] == counts["REMOVED"]:
            continue  # tie — no consensus, drop
        human_consensus[iid] = "REMOVED" if counts["REMOVED"] > counts["ALLOWED"] else "ALLOWED"
        if (counts["ALLOWED"] + counts["REMOVED"]) >= 2:
            multi_annotator_items.add(iid)

    if not human_consensus:
        return {}

    csv_path = _find_audit_csv()
    if not csv_path:
        return {
            "humanConsensusItems": len(human_consensus),
            "note": "Audit log not available in this checkout; alignment not computed.",
        }

    # 2. Per-(model, prompt) binarized verdicts from the audit log. Only prompts
    #    that a human annotated are retained, to keep the scan cheap.
    #    model_item[model][iid] = list of 1 (refusal) / 0 (allowed) across reps.
    model_item: dict = defaultdict(lambda: defaultdict(list))
    opener = gzip.open if csv_path.endswith(".gz") else open
    try:
        with opener(csv_path, "rt", encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                verdict = (row.get("verdict") or "").strip()
                if verdict in _NON_VERDICTS:
                    continue  # ERROR / blank — unscorable, exclude from denominator
                iid = _base_prompt_id(str(row.get("prompt_id", "")))
                if iid in human_consensus:
                    model = (row.get("model") or "").strip()
                    if model:
                        model_item[model][iid].append(1 if verdict in _REFUSAL_VERDICTS else 0)
    except OSError:
        return {
            "humanConsensusItems": len(human_consensus),
            "note": "Audit log could not be read; alignment not computed.",
        }

    MIN_OVERLAP = 5  # need at least this many shared prompts for a stable kappa

    # 3. Per-model agreement vs human consensus.
    per_model = []
    for model, items in model_item.items():
        human_labels, model_labels = [], []
        for iid, votes in items.items():
            if not votes:
                continue
            model_verdict = "REMOVED" if (sum(votes) / len(votes)) >= 0.5 else "ALLOWED"
            human_labels.append(human_consensus[iid])
            model_labels.append(model_verdict)
        if len(human_labels) < MIN_OVERLAP:
            continue
        kappa = _cohens_kappa(human_labels, model_labels)
        per_model.append({
            "model": model,
            "n": len(human_labels),
            "kappa": round(kappa, 4),
            "kappaInterpretation": _interpret_kappa(kappa),
            "percentAgreement": round(_percent_agreement(human_labels, model_labels), 1),
        })
    per_model.sort(key=lambda m: m["kappa"], reverse=True)

    # 4. Overall: human consensus vs the models' majority verdict per prompt.
    overall_human, overall_model = [], []
    for iid, human_verdict in human_consensus.items():
        model_verdicts = []
        for model in model_item:
            votes = model_item[model].get(iid)
            if votes:
                model_verdicts.append(1 if (sum(votes) / len(votes)) >= 0.5 else 0)
        if not model_verdicts:
            continue
        majority = "REMOVED" if (sum(model_verdicts) / len(model_verdicts)) >= 0.5 else "ALLOWED"
        overall_human.append(human_verdict)
        overall_model.append(majority)

    overall = {}
    if len(overall_human) >= MIN_OVERLAP:
        kappa = _cohens_kappa(overall_human, overall_model)
        overall = {
            "n": len(overall_human),
            "kappa": round(kappa, 4),
            "kappaInterpretation": _interpret_kappa(kappa),
            "percentAgreement": round(_percent_agreement(overall_human, overall_model), 1),
        }

    multi_annotator_consensus = len(multi_annotator_items)
    result = {
        "humanConsensusItems": len(human_consensus),
        "multiAnnotatorConsensusItems": multi_annotator_consensus,
        "modelsCompared": len(per_model),
        "overall": overall,
        "perModel": per_model,
    }
    # Honesty gate: most "consensus" items may rest on a SINGLE annotator (no true
    # agreement). Flag the figures as preliminary based on how many consensus items
    # actually have >=2 annotators backing them, not the inflated total.
    if multi_annotator_consensus < 30:
        result["note"] = (
            f"Preliminary — only {multi_annotator_consensus} of {len(human_consensus)} "
            "consensus prompts are backed by 2+ annotators; the rest rest on a single "
            "label. Alignment figures stabilize as multi-annotator coverage grows."
        )
    return result


def generate_iaa_json(records: Optional[list] = None) -> dict:
    if records is None:
        records = _fetch_annotations()

    if not records:
        print("  ⚠️  No annotations found — skipping IAA stats")
        return {}

    annotators = sorted(set(r.get("annotatorId", "unknown") for r in records))
    
    # Per-annotator stats
    annotator_stats = []
    for ann_id in annotators:
        ann_records = [r for r in records if r.get("annotatorId") == ann_id]
        allowed = sum(1 for r in ann_records if r.get("verdict", "").upper() == "ALLOWED")
        removed = sum(1 for r in ann_records if r.get("verdict", "").upper() == "REMOVED")
        avg_time = 0
        times = [r.get("timeSpentMs", 0) for r in ann_records if r.get("timeSpentMs")]
        if times:
            avg_time = sum(times) / len(times)
        annotator_stats.append({
            "id": ann_id,
            "shortId": ann_id[:12] + "…" if len(ann_id) > 12 else ann_id,
            "total": len(ann_records),
            "allowed": allowed,
            "removed": removed,
            "refusalRate": round(removed / len(ann_records) * 100, 1) if ann_records else 0,
            "avgTimeMs": round(avg_time),
        })
    annotator_stats.sort(key=lambda x: x["total"], reverse=True)

    # Per-category stats
    by_category = defaultdict(lambda: {"allowed": 0, "removed": 0, "total": 0})
    for r in records:
        cat = r.get("category", "Unknown")
        v = r.get("verdict", "").upper()
        by_category[cat]["total"] += 1
        if v == "ALLOWED":
            by_category[cat]["allowed"] += 1
        elif v == "REMOVED":
            by_category[cat]["removed"] += 1

    category_stats = []
    for cat, stats in sorted(by_category.items()):
        category_stats.append({
            "category": cat,
            **stats,
            "refusalRate": round(stats["removed"] / stats["total"] * 100, 1) if stats["total"] else 0,
        })

    # Pairwise human agreement (items rated by 2+ annotators)
    item_map = defaultdict(dict)
    for r in records:
        v = r.get("verdict", "").upper()
        if v in ("ALLOWED", "REMOVED"):
            item_map[r.get("itemId", "")][r.get("annotatorId", "")] = v

    multi = {iid: v for iid, v in item_map.items() if len(v) >= 2}

    pairwise_results = []
    overall_alpha = None
    overall_fleiss_kappa = None
    overall_pct_agreement = None

    if multi and len(annotators) >= 2:
        for i, ann_a in enumerate(annotators):
            for ann_b in annotators[i + 1:]:
                shared = [(v[ann_a], v[ann_b])
                          for v in multi.values()
                          if ann_a in v and ann_b in v]
                if len(shared) < 2:
                    continue
                la, lb = zip(*shared)
                k = _cohens_kappa(list(la), list(lb))
                pct = _percent_agreement(list(la), list(lb))
                pairwise_results.append({
                    "annotatorA": ann_a[:12],
                    "annotatorB": ann_b[:12],
                    "n": len(shared),
                    "kappa": round(k, 4),
                    "kappaInterpretation": _interpret_kappa(k),
                    "percentAgreement": round(pct, 1),
                })

        # Krippendorff's Alpha across all annotators
        all_items = sorted(multi.keys())
        alpha_mat = [
            [VERDICT_TO_INT.get(multi[iid].get(ann))
             for iid in all_items]
            for ann in annotators
        ]
        alpha = _krippendorffs_alpha(alpha_mat)
        if alpha == alpha:  # not nan
            overall_alpha = round(alpha, 4)

        # Overall percent agreement on multi-rated items
        agree_count = sum(1 for v in multi.values() if len(set(v.values())) == 1)
        overall_pct_agreement = round(agree_count / len(multi) * 100, 1) if multi else 0

    # Per-category kappa (on multi-rated items)
    category_agreement = []
    if multi:
        cat_items = defaultdict(dict)
        for r in records:
            iid = r.get("itemId", "")
            if iid in multi:
                cat = r.get("category", "Unknown")
                if iid not in cat_items:
                    cat_items[iid] = {"cat": cat, "verdicts": {}}
                cat_items[iid]["verdicts"][r.get("annotatorId", "")] = r.get("verdict", "").upper()

        cats_grouped = defaultdict(list)
        for iid, info in cat_items.items():
            cats_grouped[info["cat"]].append(info["verdicts"])

        for cat, items in sorted(cats_grouped.items()):
            if len(items) < 2:
                continue
            agree = sum(1 for v in items if len(set(v.values())) == 1)
            pct = round(agree / len(items) * 100, 1)
            category_agreement.append({
                "category": cat,
                "items": len(items),
                "percentAgreement": pct,
            })

    # Verdict distribution
    total_allowed = sum(1 for r in records if r.get("verdict", "").upper() == "ALLOWED")
    total_removed = sum(1 for r in records if r.get("verdict", "").upper() == "REMOVED")

    result = {
        "lastUpdated": max((r.get("timestamp", "") for r in records), default=""),
        "totalAnnotations": len(records),
        "uniqueAnnotators": len(annotators),
        "targetAnnotations": 500,
        "verdictDistribution": {
            "allowed": total_allowed,
            "removed": total_removed,
        },
        "multiRatedItems": len(multi),
        "overallAlpha": overall_alpha,
        "overallAlphaInterpretation": _interpret_kappa(overall_alpha) if overall_alpha is not None else "N/A",
        "overallPercentAgreement": overall_pct_agreement,
        "pairwiseAgreement": pairwise_results,
        "categoryStats": category_stats,
        "categoryAgreement": category_agreement,
        "annotatorStats": annotator_stats,
        "humanAlignment": compute_human_alignment(records),
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(result, f, separators=(",", ":"))
    print(f"  ✅ iaa_stats.json ({len(records)} annotations, {len(annotators)} annotators, {os.path.getsize(OUTPUT_PATH)} bytes)")
    return result


if __name__ == "__main__":
    generate_iaa_json()
