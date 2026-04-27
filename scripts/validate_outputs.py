#!/usr/bin/env python3
"""
Validate pre-computed JSON outputs before deployment.

Run this after compress_data.py to catch malformed or incomplete output
before it reaches production. Returns exit code 1 on failure.

Usage:
    python scripts/validate_outputs.py [--dir web/public]
"""

import json
import sys
import os
import argparse
from pathlib import Path

# Expected JSON files and their required top-level keys
REQUIRED_FILES = {
    "summary_stats.json": {
        "required_keys": ["totalCases", "modelsCount", "totalEvaluations", "lastUpdated", "allModels"],
        "min_models": 5,          # At least 5 models expected
        "min_evaluations": 1000,   # Sanity check: should have > 1k evaluations
    },
    "spectrum_data.json": {
        "type": "array",
        "min_length": 5,           # At least 5 models
        "item_keys": ["name", "refusalRate", "total"],
    },
    "heatmap_matrix.json": {
        "required_keys": ["models", "categories", "cells"],
        "min_models": 5,
        "min_categories": 3,
    },
    "compare_data.json": {
        "required_keys": ["models", "categories", "modelStats"],
        "min_models": 5,
    },
    "consensus_stats.json": {
        "required_keys": ["totalPrompts", "distribution", "perModel"],
    },
    "reliability_scores.json": {
        "required_keys": ["globalKappa", "interpretation", "modelsCount"],
    },
    "significance_pairwise.json": {
        "type": "array",
        "min_length": 1,
        "item_keys": ["modelA", "modelB", "pValue", "significant"],
    },
}

# Optional files — warn if missing but don't fail
OPTIONAL_FILES = [
    "political_compass.json",
    "paternalism.json",
    "clusters.json",
    "drift_report.json",
    "longitudinal_data.json",
]


def validate_file(filepath: Path, spec: dict) -> list[str]:
    """Validate a single JSON file against its spec. Returns list of errors."""
    errors = []

    if not filepath.exists():
        errors.append(f"MISSING: {filepath.name}")
        return errors

    if filepath.stat().st_size == 0:
        errors.append(f"EMPTY: {filepath.name} is 0 bytes")
        return errors

    try:
        with open(filepath) as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        errors.append(f"INVALID JSON: {filepath.name} — {e}")
        return errors

    # Array type checks
    if spec.get("type") == "array":
        if not isinstance(data, list):
            errors.append(f"TYPE: {filepath.name} should be an array, got {type(data).__name__}")
            return errors

        min_len = spec.get("min_length", 0)
        if len(data) < min_len:
            errors.append(f"SIZE: {filepath.name} has {len(data)} items, expected >= {min_len}")

        item_keys = spec.get("item_keys", [])
        if data and item_keys:
            missing = [k for k in item_keys if k not in data[0]]
            if missing:
                errors.append(f"SCHEMA: {filepath.name}[0] missing keys: {missing}")

        return errors

    # Object type checks
    if not isinstance(data, dict):
        errors.append(f"TYPE: {filepath.name} should be an object, got {type(data).__name__}")
        return errors

    required = spec.get("required_keys", [])
    missing = [k for k in required if k not in data]
    if missing:
        errors.append(f"SCHEMA: {filepath.name} missing keys: {missing}")

    # Model count checks
    min_models = spec.get("min_models", 0)
    if min_models:
        models_field = data.get("models") or data.get("allModels") or []
        if len(models_field) < min_models:
            errors.append(f"DATA: {filepath.name} has {len(models_field)} models, expected >= {min_models}")

    # Category count checks
    min_categories = spec.get("min_categories", 0)
    if min_categories:
        cats = data.get("categories", [])
        if len(cats) < min_categories:
            errors.append(f"DATA: {filepath.name} has {len(cats)} categories, expected >= {min_categories}")

    # Evaluation count checks
    min_evals = spec.get("min_evaluations", 0)
    if min_evals:
        total = data.get("totalEvaluations", 0)
        if total < min_evals:
            errors.append(f"DATA: {filepath.name} has {total} evaluations, expected >= {min_evals}")

    return errors


def main():
    parser = argparse.ArgumentParser(description="Validate pre-computed JSON outputs")
    parser.add_argument("--dir", default="web/public", help="Directory containing JSON files")
    args = parser.parse_args()

    base_dir = Path(args.dir)
    if not base_dir.exists():
        print(f"❌ Directory not found: {base_dir}")
        sys.exit(1)

    all_errors = []
    all_warnings = []

    print(f"🔍 Validating {len(REQUIRED_FILES)} required JSON files in {base_dir}/\n")

    for filename, spec in REQUIRED_FILES.items():
        filepath = base_dir / filename
        errors = validate_file(filepath, spec)
        if errors:
            all_errors.extend(errors)
            print(f"  ❌ {filename}")
            for e in errors:
                print(f"     └─ {e}")
        else:
            size_kb = filepath.stat().st_size / 1024
            print(f"  ✅ {filename} ({size_kb:.1f} KB)")

    print()

    for filename in OPTIONAL_FILES:
        filepath = base_dir / filename
        if not filepath.exists():
            all_warnings.append(f"OPTIONAL MISSING: {filename}")
            print(f"  ⚠️  {filename} (optional, not found)")
        else:
            try:
                with open(filepath) as f:
                    json.load(f)
                size_kb = filepath.stat().st_size / 1024
                print(f"  ✅ {filename} ({size_kb:.1f} KB)")
            except json.JSONDecodeError:
                all_errors.append(f"INVALID JSON: {filename}")
                print(f"  ❌ {filename} (invalid JSON)")

    print()

    if all_warnings:
        print(f"⚠️  {len(all_warnings)} warning(s)")
        for w in all_warnings:
            print(f"   {w}")

    if all_errors:
        print(f"\n❌ VALIDATION FAILED: {len(all_errors)} error(s)")
        for e in all_errors:
            print(f"   {e}")
        sys.exit(1)
    else:
        print("✅ All validations passed!")
        sys.exit(0)


if __name__ == "__main__":
    main()
