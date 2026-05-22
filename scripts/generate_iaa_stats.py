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
import urllib.request
import urllib.error
from collections import defaultdict
from typing import Optional

BLOB_BASE = os.environ.get(
    "BLOB_BASE_URL",
    "https://oeqbf51ent3zxva1.public.blob.vercel-storage.com"
)
OUTPUT_PATH = "web/public/iaa_stats.json"
VERDICT_TO_INT = {"ALLOWED": 0, "REMOVED": 1}


def _fetch_annotations() -> list:
    """Fetch all annotation JSONL files from Vercel Blob."""
    # Try the summary roll-up first
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

    # Try daily files — enumerate known date range
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
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(result, f, separators=(",", ":"))
    print(f"  ✅ iaa_stats.json ({len(records)} annotations, {len(annotators)} annotators, {os.path.getsize(OUTPUT_PATH)} bytes)")
    return result


if __name__ == "__main__":
    generate_iaa_json()
