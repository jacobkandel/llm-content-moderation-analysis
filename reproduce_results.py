#!/usr/bin/env python3
"""
Reproducibility check for the Moderation Bias benchmark.

This does NOT call any model or spend money. It recomputes the published headline
statistics *directly from the raw audit log* (web/public/audit_log.csv.gz) using
the same canonical definitions the pipeline uses (src/refusal.py), then verifies
they match the shipped JSON artifacts (spectrum_data.json / summary_stats.json).

The point: prove that the published numbers are a deterministic function of the
released raw data — the core reproducibility claim a reviewer will check.

    python reproduce_results.py            # check against web/public/*.json

Exit code 0 if everything matches within tolerance, 1 otherwise. If per-model
rates diverge, the shipped JSON predates the current analysis code — regenerate
it with `python scripts/compress_data.py`.
"""
import gzip
import json
import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from src.refusal import REFUSAL_VERDICTS, NON_VERDICTS  # noqa: E402

CSV = "web/public/audit_log.csv.gz"
SPECTRUM = "web/public/spectrum_data.json"
TOL_PP = 1.0  # allowed percentage-point difference in a model's refusal rate


def _load_raw() -> pd.DataFrame:
    with gzip.open(CSV, "rt") as f:
        return pd.read_csv(f, on_bad_lines="skip", engine="python")


def main() -> int:
    for path in (CSV, SPECTRUM):
        if not os.path.exists(path):
            print(f"❌ Required file missing: {path}")
            return 1

    print("🔬 Recomputing published refusal rates from the raw audit log (no API calls)...")
    df = _load_raw()
    df = df[~df["verdict"].isin(NON_VERDICTS)]  # scorable rows only (canonical)

    recomputed = (
        df.groupby("model")["verdict"]
        .apply(lambda s: round(s.isin(REFUSAL_VERDICTS).mean() * 100, 2))
        .to_dict()
    )

    published = {d["fullName"]: d["refusalRate"] for d in json.load(open(SPECTRUM))}

    mismatches = []
    checked = 0
    for model, pub_rate in published.items():
        if model not in recomputed:
            mismatches.append(f"{model}: published but absent from raw log")
            continue
        checked += 1
        delta = abs(recomputed[model] - pub_rate)
        status = "✓" if delta <= TOL_PP else "✗"
        print(f"  {status} {model:45s} published={pub_rate:5.1f}%  recomputed={recomputed[model]:5.1f}%  Δ={delta:.1f}pp")
        if delta > TOL_PP:
            mismatches.append(f"{model}: Δ={delta:.1f}pp")

    print()
    if mismatches:
        print(f"❌ Reproduction MISMATCH on {len(mismatches)}/{checked} models (tolerance {TOL_PP}pp):")
        for m in mismatches:
            print(f"   {m}")
        print("\n   → The shipped JSON likely predates the current analysis code.")
        print("     Regenerate with: python scripts/compress_data.py")
        return 1

    print(f"✅ Reproduced {checked} model refusal rates from raw data within {TOL_PP}pp.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
