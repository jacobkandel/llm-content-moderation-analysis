#!/usr/bin/env python3
"""
Prompt dataset integrity checks — runs in CI against the real data/prompts.csv.
Fails with a non-zero exit code if any issues are found.
"""

import sys
import csv
from pathlib import Path

PROMPTS_FILE = Path(__file__).parent.parent / "data" / "prompts.csv"
JUDGE_MODEL = "google/gemini-2.0-flash-001"  # Keep in sync with src/taxonomy.py


def check_no_duplicate_ids(rows: list[dict]) -> list[str]:
    """Every prompt must have a unique ID."""
    seen = {}
    errors = []
    for i, row in enumerate(rows, start=2):  # row 1 is header
        pid = row.get("id", "").strip()
        if not pid:
            errors.append(f"Row {i}: missing id")
        elif pid in seen:
            errors.append(f"Row {i}: duplicate id '{pid}' (first seen at row {seen[pid]})")
        else:
            seen[pid] = i
    return errors


def check_no_empty_text(rows: list[dict]) -> list[str]:
    """Every prompt must have non-empty text."""
    errors = []
    for i, row in enumerate(rows, start=2):
        if not row.get("text", "").strip():
            errors.append(f"Row {i} (id={row.get('id')}): empty text field")
    return errors


def check_no_empty_category(rows: list[dict]) -> list[str]:
    """Every prompt must have a category."""
    errors = []
    for i, row in enumerate(rows, start=2):
        if not row.get("category", "").strip():
            errors.append(f"Row {i} (id={row.get('id')}): missing category")
    return errors


def check_judge_not_in_prompts(rows: list[dict]) -> list[str]:
    """
    Guard: the judge/taxonomy classifier model must not appear as a subject
    model in the prompts dataset. (Separation of instrument from dock.)
    """
    errors = []
    for i, row in enumerate(rows, start=2):
        model = row.get("model", "").strip()
        if model and model == JUDGE_MODEL:
            errors.append(
                f"Row {i}: judge model '{JUDGE_MODEL}' appears as audited model — "
                "conflict of interest. Use a different judge."
            )
    return errors


def main():
    if not PROMPTS_FILE.exists():
        print(f"❌ prompts.csv not found at {PROMPTS_FILE}", file=sys.stderr)
        sys.exit(1)

    with open(PROMPTS_FILE, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    print(f"📋 Checking {len(rows)} prompts in {PROMPTS_FILE.name}...")

    all_errors = []
    all_errors.extend(check_no_duplicate_ids(rows))
    all_errors.extend(check_no_empty_text(rows))
    all_errors.extend(check_no_empty_category(rows))
    all_errors.extend(check_judge_not_in_prompts(rows))

    if all_errors:
        print(f"\n❌ Found {len(all_errors)} issue(s):", file=sys.stderr)
        for err in all_errors:
            print(f"   • {err}", file=sys.stderr)
        sys.exit(1)

    print(f"✅ All checks passed ({len(rows)} prompts, no duplicates, no empty fields).")


if __name__ == "__main__":
    main()
