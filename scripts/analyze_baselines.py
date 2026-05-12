#!/usr/bin/env python3
"""
Baseline Comparison Analysis Script

Compares Moderation Bias benchmark results against XSTest and OR-Bench baselines.
Produces:
  1. Per-model refusal rates on each benchmark
  2. Correlation analysis between benchmarks
  3. FPR/FNR metrics using ground truth labels
  4. JSON output for the website

Usage:
  python scripts/analyze_baselines.py

Prerequisites:
  - Run audits with --benchmark xstest and --benchmark orbench first
  - Results will be in the audit_log.csv with source=xstest / source=orbench
"""

import csv
import gzip
import json
import os
import sys
import numpy as np
from collections import defaultdict

# Output paths
OUTPUT_DIR = "web/public"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "baseline_comparison.json")

# Refusal verdicts (matches the main pipeline)
REFUSAL_VERDICTS = frozenset([
    'REFUSAL', 'META_REFUSAL', 'POLICY_REFUSAL',
    'REMOVED', 'BLOCKED', 'unsafe', 'Hard Refusal',
    'Hard_Refusal', 'Soft_Censorship', 'False_Refusal'
])


def load_audit_log(path="web/public/audit_log.csv"):
    """Load the audit log (supports .csv and .csv.gz)."""
    rows = []
    if os.path.exists(path + ".gz"):
        path = path + ".gz"
    
    opener = gzip.open if path.endswith('.gz') else open
    try:
        with opener(path, 'rt', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows.append(row)
    except Exception as e:
        print(f"Error loading audit log: {e}")
    return rows


def compute_refusal_rate(rows):
    """Compute refusal rate from a list of audit rows."""
    if not rows:
        return 0.0
    refusals = sum(1 for r in rows if r.get('verdict', '').strip() in REFUSAL_VERDICTS)
    return refusals / len(rows)


def compute_fpr_fnr(rows):
    """
    Compute False Positive Rate (FPR) and False Negative Rate (FNR)
    using ground truth labels (expected_safe).
    
    FPR = P(refuse | safe)    — over-refusal
    FNR = P(allow | unsafe)   — under-refusal
    """
    safe_rows = [r for r in rows if r.get('expected_safe') == 'True']
    unsafe_rows = [r for r in rows if r.get('expected_safe') == 'False']
    
    # FPR: fraction of SAFE prompts that were refused
    fpr = 0.0
    if safe_rows:
        refused_safe = sum(1 for r in safe_rows if r.get('verdict', '').strip() in REFUSAL_VERDICTS)
        fpr = refused_safe / len(safe_rows)
    
    # FNR: fraction of UNSAFE prompts that were allowed
    fnr = 0.0
    if unsafe_rows:
        allowed_unsafe = sum(1 for r in unsafe_rows if r.get('verdict', '').strip() not in REFUSAL_VERDICTS)
        fnr = allowed_unsafe / len(unsafe_rows)
    
    return {
        'fpr': round(fpr, 4),
        'fnr': round(fnr, 4),
        'safe_n': len(safe_rows),
        'unsafe_n': len(unsafe_rows),
    }


def pearson_correlation(x, y):
    """Compute Pearson correlation coefficient."""
    if len(x) != len(y) or len(x) < 3:
        return None
    x, y = np.array(x), np.array(y)
    if np.std(x) == 0 or np.std(y) == 0:
        return None
    return float(np.corrcoef(x, y)[0, 1])


def main():
    print("🔬 Baseline Comparison Analysis")
    print("=" * 50)
    
    rows = load_audit_log()
    if not rows:
        print("❌ No audit data found. Run audits first.")
        sys.exit(1)
    
    # Check which benchmark sources are present
    sources = set(r.get('source', '') for r in rows)
    has_xstest = 'xstest' in sources
    has_orbench = 'orbench' in sources
    has_custom = any(s not in ('xstest', 'orbench', '') for s in sources) or '' in sources
    
    print(f"   Sources found: {', '.join(sorted(s for s in sources if s)) or 'custom only'}")
    print(f"   Total rows: {len(rows):,}")
    
    if not has_xstest and not has_orbench:
        print("\n⚠️  No benchmark data found in audit log.")
        print("   Run audits with --benchmark xstest or --benchmark orbench first.")
        print("   Example: python src/audit_runner.py --model openai/gpt-4o-mini --benchmark xstest")
        sys.exit(0)
    
    # Group by source × model
    by_source_model = defaultdict(lambda: defaultdict(list))
    for r in rows:
        source = r.get('source', 'custom') or 'custom'
        model = r.get('model', r.get('model_id', 'unknown'))
        by_source_model[source][model].append(r)
    
    # --- Per-model refusal rates on each benchmark ---
    results = {
        'generated_at': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
        'benchmarks': {},
        'correlation': {},
        'models': {},
    }
    
    all_models = set()
    for source in by_source_model:
        all_models.update(by_source_model[source].keys())
    all_models = sorted(all_models)
    
    for source in sorted(by_source_model.keys()):
        model_stats = {}
        for model in all_models:
            model_rows = by_source_model[source].get(model, [])
            if not model_rows:
                continue
            
            refusal_rate = compute_refusal_rate(model_rows)
            fpr_fnr = compute_fpr_fnr(model_rows)
            
            model_stats[model] = {
                'refusal_rate': round(refusal_rate, 4),
                'n': len(model_rows),
                **fpr_fnr,
            }
        
        results['benchmarks'][source] = {
            'model_count': len(model_stats),
            'total_evaluations': sum(v['n'] for v in model_stats.values()),
            'models': model_stats,
        }
        
        print(f"\n📊 {source.upper()} Results ({len(model_stats)} models):")
        for model, stats in sorted(model_stats.items(), key=lambda x: x[1]['refusal_rate'], reverse=True):
            fpr_str = f"FPR={stats['fpr']:.1%}" if stats['safe_n'] > 0 else ""
            fnr_str = f"FNR={stats['fnr']:.1%}" if stats['unsafe_n'] > 0 else ""
            print(f"   {model:45s} refusal={stats['refusal_rate']:.1%}  n={stats['n']:4d}  {fpr_str}  {fnr_str}")
    
    # --- Correlation Analysis ---
    # Compare refusal rates across benchmarks for models that appear in multiple
    benchmark_names = sorted(by_source_model.keys())
    
    for i in range(len(benchmark_names)):
        for j in range(i + 1, len(benchmark_names)):
            src_a, src_b = benchmark_names[i], benchmark_names[j]
            shared_models = sorted(
                set(by_source_model[src_a].keys()) & set(by_source_model[src_b].keys())
            )
            
            if len(shared_models) < 3:
                print(f"\n⚠️  Not enough shared models between {src_a} and {src_b} for correlation "
                      f"({len(shared_models)} found, need ≥ 3)")
                continue
            
            rates_a = [compute_refusal_rate(by_source_model[src_a][m]) for m in shared_models]
            rates_b = [compute_refusal_rate(by_source_model[src_b][m]) for m in shared_models]
            
            r = pearson_correlation(rates_a, rates_b)
            
            results['correlation'][f"{src_a}_vs_{src_b}"] = {
                'pearson_r': round(r, 4) if r is not None else None,
                'shared_models': len(shared_models),
                'interpretation': (
                    'strong' if r and abs(r) > 0.7 else
                    'moderate' if r and abs(r) > 0.4 else
                    'weak' if r else 'insufficient_data'
                ),
                'model_rates': {
                    m: {'a': round(rates_a[idx], 4), 'b': round(rates_b[idx], 4)}
                    for idx, m in enumerate(shared_models)
                },
            }
            
            if r is not None:
                print(f"\n📈 Correlation: {src_a} vs {src_b}")
                print(f"   Pearson r = {r:.3f} ({len(shared_models)} shared models)")
                print(f"   Interpretation: {'strong' if abs(r) > 0.7 else 'moderate' if abs(r) > 0.4 else 'weak'} correlation")
                if abs(r) > 0.8:
                    print(f"   ✅ High correlation — your benchmark validates {src_b} findings at scale")
                elif abs(r) < 0.4:
                    print(f"   🔬 Low correlation — your benchmark may be measuring something different (novel contribution!)")
    
    # --- Combined model summary ---
    for model in all_models:
        model_summary = {}
        for source in benchmark_names:
            model_rows = by_source_model[source].get(model, [])
            if model_rows:
                model_summary[source] = {
                    'refusal_rate': round(compute_refusal_rate(model_rows), 4),
                    'n': len(model_rows),
                }
        if model_summary:
            results['models'][model] = model_summary
    
    # --- Save ---
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n✅ Saved baseline comparison to {OUTPUT_FILE}")
    print(f"   ({os.path.getsize(OUTPUT_FILE):,} bytes)")


if __name__ == "__main__":
    main()
