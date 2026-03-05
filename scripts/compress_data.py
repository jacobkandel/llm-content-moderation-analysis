import gzip
import shutil
import os
import sys
import json
from collections import defaultdict

INPUT_FILE = "web/public/audit_log.csv"
OUTPUT_FILE_FULL = "web/public/audit_log.csv.gz"
OUTPUT_FILE_LITE = "web/public/audit_log_lite.csv.gz"

# Must match frontend filters exactly
BLOCKLIST = ['yi-34b', 'mistral-medium', 'gpt-audio']
SKIP_CATEGORIES = {'EdgeCase', 'Jailbreak', 'Multilingual', 'Roleplay'}
REFUSAL_VERDICTS = {'REFUSAL', 'REMOVED', 'unsafe', 'Hard Refusal'}
SAFE_VERDICTS = {'ALLOWED', 'safe', 'safe_response'}
HEATMAP_REFUSAL_VERDICTS = REFUSAL_VERDICTS | {'Soft Censorship'}

def normalize_category(cat: str) -> str:
    if cat in ('Sexual', 'Explicit Content'):
        return 'Explicit/Sexual'
    return cat


def generate_precomputed_json(df):
    """Generate summary_stats.json, heatmap_matrix.json, spectrum_data.json from DataFrame."""
    import pandas as pd

    print("\n📊 Generating pre-computed JSON files...")

    # --- Apply same filters as frontend data-loading.ts ---
    df = df.copy()
    df['model'] = df['model'].fillna('').astype(str)
    df['category'] = df['category'].fillna('').astype(str).apply(normalize_category)
    df['verdict'] = df['verdict'].fillna('').astype(str)

    # Handle various timestamp column names
    if 'timestamp' in df.columns:
        df['_date'] = df['timestamp'].fillna('').astype(str)
    elif 'test_date' in df.columns:
        df['_date'] = df['test_date'].fillna('').astype(str)
    elif 'date' in df.columns:
        df['_date'] = df['date'].fillna('').astype(str)
    else:
        df['_date'] = ''

    # Handle various ID column names
    if 'case_id' in df.columns:
        df['_pid'] = df['case_id'].fillna('').astype(str)
    elif 'prompt_id' in df.columns:
        df['_pid'] = df['prompt_id'].fillna('').astype(str)
    elif 'run_id' in df.columns:
        df['_pid'] = df['run_id'].fillna('').astype(str)
    else:
        df['_pid'] = ''

    # Handle cost column
    cost_col = 'cost' if 'cost' in df.columns else ('run_cost' if 'run_cost' in df.columns else None)

    # Count per model
    model_counts = df['model'].value_counts()
    model_refusals = df[df['verdict'].isin(REFUSAL_VERDICTS)].groupby('model').size()

    # Filter: min 50 entries, blocklist with 0 refusals, skip categories
    keep_models = set()
    for model, count in model_counts.items():
        if count < 50:
            continue
        refusal_count = model_refusals.get(model, 0)
        if refusal_count == 0 and any(b in model.lower() for b in BLOCKLIST):
            continue
        keep_models.add(model)

    df = df[df['model'].isin(keep_models)]
    df = df[~df['category'].isin(SKIP_CATEGORIES)]
    df = df[df['category'] != '']

    print(f"   Filtered to {len(df)} rows, {len(keep_models)} models")

    # --- 1. spectrum_data.json ---
    spectrum = []
    for model in sorted(keep_models):
        rows = df[df['model'] == model]
        total = len(rows)
        if total == 0:
            continue
        refused = rows['verdict'].isin(REFUSAL_VERDICTS).sum()
        cost = rows[cost_col].astype(float).fillna(0).sum() if cost_col else 0
        spectrum.append({
            'name': model.split('/')[-1] if '/' in model else model,
            'fullName': model,
            'refusalRate': round((refused / total) * 100, 2),
            'costPer1k': round((cost / total) * 1000, 4) if total > 0 else 0,
            'total': int(total),
        })

    with open('web/public/spectrum_data.json', 'w') as f:
        json.dump(spectrum, f, separators=(',', ':'))
    print(f"   ✅ spectrum_data.json ({len(spectrum)} models, {os.path.getsize('web/public/spectrum_data.json')} bytes)")

    # --- 2. heatmap_matrix.json ---
    models_sorted = sorted(keep_models)
    categories_sorted = sorted(df['category'].unique())
    cells = {}
    for model in models_sorted:
        model_rows = df[df['model'] == model]
        cells[model] = {}
        for cat in categories_sorted:
            cat_rows = model_rows[model_rows['category'] == cat]
            total = len(cat_rows)
            refusals = int(cat_rows['verdict'].isin(HEATMAP_REFUSAL_VERDICTS).sum())
            cells[model][cat] = {'total': int(total), 'refusals': refusals}

    heatmap = {
        'models': models_sorted,
        'categories': categories_sorted,
        'cells': cells,
    }
    with open('web/public/heatmap_matrix.json', 'w') as f:
        json.dump(heatmap, f, separators=(',', ':'))
    print(f"   ✅ heatmap_matrix.json ({len(models_sorted)} models × {len(categories_sorted)} categories, {os.path.getsize('web/public/heatmap_matrix.json')} bytes)")

    # --- 3. summary_stats.json ---
    dates = df['_date'].str.split('T').str[0].unique()
    dates = sorted([d for d in dates if d])

    # Unique prompts & distribution
    prompt_groups = df.groupby('_pid')
    distribution = defaultdict(int)
    for pid, group in prompt_groups:
        n = len(group)
        safe_count = group['verdict'].isin(SAFE_VERDICTS).sum()
        pct = safe_count / n if n > 0 else 0
        if n == 1:
            bucket = 'Single Model (N/A)'
        elif pct == 0:
            bucket = '0% (All Unsafe)'
        elif pct == 1:
            bucket = '100% (All Safe)'
        elif pct < 0.5:
            bucket = '< 50% Safe'
        else:
            bucket = '> 50% Safe'
        distribution[bucket] += 1

    summary = {
        'totalCases': int(df['_pid'].nunique()),
        'modelsCount': len(keep_models),
        'totalEvaluations': int(len(df)),
        'lastUpdated': dates[-1] if dates else '',
        'dateRange': {'start': dates[0] if dates else '', 'end': dates[-1] if dates else ''},
        'allModels': sorted(keep_models),
        'timelineDates': dates,
        'distribution': [{'name': k, 'value': v} for k, v in distribution.items()],
    }
    with open('web/public/summary_stats.json', 'w') as f:
        json.dump(summary, f, separators=(',', ':'))
    print(f"   ✅ summary_stats.json ({os.path.getsize('web/public/summary_stats.json')} bytes)")

    # --- 4. consensus_stats.json ---
    # Group by prompt → collect each model's verdict
    prompt_verdicts = defaultdict(dict)  # pid -> {model: is_unsafe}
    for _, row in df.iterrows():
        pid = str(row['_pid'])
        if not pid:
            continue
        model = row['model']
        verdict = row['verdict']
        is_unsafe = verdict in REFUSAL_VERDICTS or verdict == 'BLOCKED'
        prompt_verdicts[pid][model] = is_unsafe

    # Only multi-model prompts
    multi = {pid: mv for pid, mv in prompt_verdicts.items() if len(mv) >= 2}

    full_agree = 0
    majority_agree = 0
    split_count = 0
    model_agreement = defaultdict(lambda: {'agree': 0, 'total': 0, 'modelUnsafe': 0, 'majorityUnsafe': 0})

    for pid, model_verd in multi.items():
        verdicts = list(model_verd.items())
        unsafe_count = sum(1 for _, v in verdicts if v)
        majority = unsafe_count > len(verdicts) / 2
        agreement_ratio = unsafe_count / len(verdicts) if majority else (len(verdicts) - unsafe_count) / len(verdicts)

        if agreement_ratio >= 0.9:
            full_agree += 1
        elif agreement_ratio >= 0.6:
            majority_agree += 1
        else:
            split_count += 1

        for model, is_uns in verdicts:
            m = model_agreement[model]
            m['total'] += 1
            if is_uns == majority:
                m['agree'] += 1
            if is_uns:
                m['modelUnsafe'] += 1
            if majority:
                m['majorityUnsafe'] += 1

    per_model_consensus = []
    for model, s in model_agreement.items():
        if s['total'] == 0:
            continue
        po = s['agree'] / s['total']
        p_model_unsafe = s['modelUnsafe'] / s['total']
        p_model_safe = 1 - p_model_unsafe
        p_maj_unsafe = s['majorityUnsafe'] / s['total']
        p_maj_safe = 1 - p_maj_unsafe
        pe = (p_model_unsafe * p_maj_unsafe) + (p_model_safe * p_maj_safe)
        kappa = 0 if (1 - pe) == 0 else (po - pe) / (1 - pe)
        per_model_consensus.append({
            'model': model,
            'shortName': model.split('/')[-1] if '/' in model else model,
            'agreementRate': round(po * 100, 2),
            'kappa': round(kappa, 4),
            'total': s['total'],
        })
    per_model_consensus.sort(key=lambda x: x['agreementRate'], reverse=True)

    consensus_json = {
        'totalPrompts': len(multi),
        'distribution': [
            {'name': 'Full Agreement (≥90%)', 'value': full_agree},
            {'name': 'Majority (60-89%)', 'value': majority_agree},
            {'name': 'Split Decision (<60%)', 'value': split_count},
        ],
        'perModel': per_model_consensus,
    }
    # Remove zero-value distribution entries
    consensus_json['distribution'] = [d for d in consensus_json['distribution'] if d['value'] > 0]

    with open('web/public/consensus_stats.json', 'w') as f:
        json.dump(consensus_json, f, separators=(',', ':'))
    print(f"   ✅ consensus_stats.json ({len(per_model_consensus)} models, {os.path.getsize('web/public/consensus_stats.json')} bytes)")

    # --- 5. significance_pairwise.json ---
    import math

    def mcnemars_test(b, c):
        if b + c == 0:
            return 1.0, False
        chi2 = ((abs(b - c) - 1) ** 2) / (b + c)
        # Approximate p-value from chi2 with 1 df: p ≈ erfc(sqrt(chi2/2))
        x = math.sqrt(chi2 / 2)
        # Error function approximation (Abramowitz and Stegun)
        a1, a2, a3, a4, a5, p_coeff = 0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429, 0.3275911
        sign = -1 if x < 0 else 1
        t = 1.0 / (1.0 + p_coeff * abs(x))
        y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * math.exp(-x * x)
        erf_val = sign * y
        p_value = max(0, min(1, 1 - erf_val))
        return p_value, p_value < 0.05

    all_models_sorted = sorted(keep_models)
    sig_results = []
    for i in range(len(all_models_sorted)):
        for j in range(i + 1, len(all_models_sorted)):
            mA, mB = all_models_sorted[i], all_models_sorted[j]
            b_count, c_count, samples = 0, 0, 0
            a_total_unsafe, b_total_unsafe = 0, 0
            for pid, mv in prompt_verdicts.items():
                if mA in mv and mB in mv:
                    samples += 1
                    a_unsafe = mv[mA]
                    b_unsafe = mv[mB]
                    if a_unsafe: a_total_unsafe += 1
                    if b_unsafe: b_total_unsafe += 1
                    if a_unsafe and not b_unsafe:
                        b_count += 1
                    if not a_unsafe and b_unsafe:
                        c_count += 1
            if samples > 0:
                p_val, _ = mcnemars_test(b_count, c_count)
                
                # Calculate Cohen's h effect size
                pA = a_total_unsafe / samples
                pB = b_total_unsafe / samples
                # Prevent domain errors in asin(sqrt(x)) for floating point imprecision
                pA, pB = max(0, min(1, pA)), max(0, min(1, pB))
                phiA = 2 * math.asin(math.sqrt(pA))
                phiB = 2 * math.asin(math.sqrt(pB))
                cohens_h = abs(phiA - phiB)
                
                sig_results.append({
                    'modelA': mA,
                    'modelB': mB,
                    'pValue': p_val, # Unadjusted
                    'cohensH': round(cohens_h, 4),
                    'samples': samples,
                    'disagreements': b_count + c_count,
                })
                
    # Sort by unadjusted p-value for Benjamini-Hochberg FDR
    sig_results.sort(key=lambda x: x['pValue'])
    
    # Apply Benjamini-Hochberg False Discovery Rate (FDR) correction
    m = len(sig_results)
    for i, res in enumerate(sig_results):
        rank = i + 1
        res['pValueAdjusted'] = min(res['pValue'] * m / rank, 1.0)
        
    # Step-up procedure for monotonic adjusted p-values
    for i in range(m - 2, -1, -1):
        sig_results[i]['pValueAdjusted'] = min(sig_results[i]['pValueAdjusted'], sig_results[i+1]['pValueAdjusted'])
        
    # Re-assign significant boolean based on adjusted list and round off decimals
    for res in sig_results:
        res['significant'] = res['pValueAdjusted'] < 0.05
        res['pValue'] = round(res['pValue'], 8)
        res['pValueAdjusted'] = round(res['pValueAdjusted'], 8)

    with open('web/public/significance_pairwise.json', 'w') as f:
        json.dump(sig_results, f, separators=(',', ':'))
    print(f"   ✅ significance_pairwise.json ({len(sig_results)} pairs, {os.path.getsize('web/public/significance_pairwise.json')} bytes)")

    # --- 6. reliability_scores.json ---
    # Per-model agreement with majority (same as reliability page)
    prompt_majority = {}
    for pid, mv in prompt_verdicts.items():
        unsafe_ct = sum(1 for v in mv.values() if v)
        prompt_majority[pid] = unsafe_ct > len(mv) / 2

    rel_model_agreement = defaultdict(lambda: {'agree': 0, 'total': 0})
    for pid, mv in prompt_verdicts.items():
        majority = prompt_majority[pid]
        for model, is_unsafe in mv.items():
            m = rel_model_agreement[model]
            m['total'] += 1
            if is_unsafe == majority:
                m['agree'] += 1

    per_model_reliability = []
    for model, s in rel_model_agreement.items():
        if s['total'] < 50:
            continue
        score = s['agree'] / s['total'] if s['total'] > 0 else 0
        per_model_reliability.append({
            'model': model,
            'displayName': model.split('/')[-1] if '/' in model else model,
            'score': round(score, 4),
            'total': s['total'],
        })
    per_model_reliability.sort(key=lambda x: x['score'], reverse=True)

    # Global Fleiss' Kappa approximation
    # Using the same logic as the frontend calculateFleissKappa
    all_prompts = list(prompt_verdicts.keys())
    n_raters = len(keep_models)
    if len(all_prompts) > 0 and n_raters >= 2:
        p_bar_sum = 0
        valid_subjects = 0
        for pid in all_prompts:
            mv = prompt_verdicts[pid]
            if len(mv) < 2:
                continue
            n = len(mv)
            unsafe_ct = sum(1 for v in mv.values() if v)
            safe_ct = n - unsafe_ct
            pi = (unsafe_ct * (unsafe_ct - 1) + safe_ct * (safe_ct - 1)) / (n * (n - 1)) if n > 1 else 0
            p_bar_sum += pi
            valid_subjects += 1

        p_bar = p_bar_sum / valid_subjects if valid_subjects > 0 else 0
        # Calculate overall proportions
        total_ratings = sum(len(mv) for mv in prompt_verdicts.values() if len(mv) >= 2)
        total_unsafe = sum(sum(1 for v in mv.values() if v) for mv in prompt_verdicts.values() if len(mv) >= 2)
        p_unsafe = total_unsafe / total_ratings if total_ratings > 0 else 0
        p_safe = 1 - p_unsafe
        pe = p_unsafe ** 2 + p_safe ** 2
        global_kappa = (p_bar - pe) / (1 - pe) if (1 - pe) != 0 else 0

        if global_kappa >= 0.81:
            interp = 'Almost Perfect'
        elif global_kappa >= 0.61:
            interp = 'Substantial'
        elif global_kappa >= 0.41:
            interp = 'Moderate'
        elif global_kappa >= 0.21:
            interp = 'Fair'
        else:
            interp = 'Slight'
    else:
        global_kappa = 0
        interp = 'Insufficient data'

    reliability_json = {
        'globalKappa': round(global_kappa, 4),
        'interpretation': interp,
        'modelsCount': len(keep_models),
        'promptsCount': len(all_prompts),
        'perModel': per_model_reliability,
    }

    with open('web/public/reliability_scores.json', 'w') as f:
        json.dump(reliability_json, f, separators=(',', ':'))
    print(f"   ✅ reliability_scores.json (kappa={global_kappa:.4f}, {len(per_model_reliability)} models, {os.path.getsize('web/public/reliability_scores.json')} bytes)")

    # --- 7.5 compare_data.json ---
    # Pre-computed data for the Compare page: per-model stats, per-category rates,
    # and pairwise disagreement summaries so the page renders instantly.
    compare_models = sorted(keep_models)
    compare_categories = sorted(df['category'].unique())

    # Per-model stats
    model_stats = {}
    for model in compare_models:
        rows = df[df['model'] == model]
        total = len(rows)
        if total == 0:
            continue
        valid = rows[~rows['verdict'].isin({'ERROR', 'BLOCKED'})]
        valid_count = len(valid)
        if valid_count < 100:
            continue
        refused = rows['verdict'].isin(REFUSAL_VERDICTS).sum()
        # Avg verbosity from response_text or response column
        resp_col = 'response_text' if 'response_text' in df.columns else 'response'
        if resp_col in df.columns:
            avg_verb = int(rows[resp_col].fillna('').str.len().mean())
        else:
            avg_verb = 0

        # Per-category refusal rates for this model
        cat_rates = {}
        for cat in compare_categories:
            cat_rows = rows[rows['category'] == cat]
            ct = len(cat_rows)
            if ct == 0:
                cat_rates[cat] = 0
            else:
                cat_rates[cat] = round((cat_rows['verdict'].isin(REFUSAL_VERDICTS).sum() / ct) * 100, 2)

        model_stats[model] = {
            'refusalRate': round((refused / total) * 100, 2),
            'avgVerbosity': avg_verb,
            'total': int(total),
            'categoryRates': cat_rates,
        }

    # Available dates for filter
    compare_dates = sorted(df['_date'].str.split('T').str[0].unique().tolist())
    compare_dates = [d for d in compare_dates if d]

    # Pairwise disagreement counts (reuse prompt_verdicts from consensus)
    pairwise_disagree = {}
    eligible_models = [m for m in compare_models if m in model_stats]
    for i in range(len(eligible_models)):
        for j in range(i + 1, len(eligible_models)):
            mA, mB = eligible_models[i], eligible_models[j]
            disagree_count = 0
            for pid, mv in prompt_verdicts.items():
                if mA in mv and mB in mv:
                    if mv[mA] != mv[mB]:
                        disagree_count += 1
            if disagree_count > 0:
                key = f"{mA}||{mB}"
                pairwise_disagree[key] = disagree_count

    compare_json = {
        'models': eligible_models,
        'categories': compare_categories,
        'dates': compare_dates,
        'modelStats': model_stats,
        'pairwiseDisagreements': pairwise_disagree,
    }

    with open('web/public/compare_data.json', 'w') as f:
        json.dump(compare_json, f, separators=(',', ':'))
    print(f"   ✅ compare_data.json ({len(eligible_models)} models, {os.path.getsize('web/public/compare_data.json')} bytes)")

    # --- 7. longitudinal_data.json ---
    # Per-date, per-model refusal rates
    date_model_stats = defaultdict(lambda: defaultdict(lambda: {'total': 0, 'refused': 0}))
    for _, row in df.iterrows():
        date = str(row['_date']).split('T')[0] if row['_date'] else ''
        if not date:
            continue
        model = row['model']
        date_model_stats[date][model]['total'] += 1
        if row['verdict'] in REFUSAL_VERDICTS:
            date_model_stats[date][model]['refused'] += 1

    longitudinal_dates = sorted(date_model_stats.keys())
    longitudinal_models = sorted(keep_models)
    chart_data = []
    for date in longitudinal_dates:
        entry = {'date': date}
        for model in longitudinal_models:
            s = date_model_stats[date].get(model)
            if s and s['total'] > 0:
                entry[model] = round((s['refused'] / s['total']) * 100, 2)
                entry[f'{model}_count'] = s['total']
            else:
                entry[model] = None
        chart_data.append(entry)

    longitudinal_json = {
        'chartData': chart_data,
        'activeModels': longitudinal_models,
    }

    with open('web/public/longitudinal_data.json', 'w') as f:
        json.dump(longitudinal_json, f, separators=(',', ':'))
    print(f"   ✅ longitudinal_data.json ({len(chart_data)} dates, {len(longitudinal_models)} models, {os.path.getsize('web/public/longitudinal_data.json')} bytes)")

    # --- 8. prompts_list.json ---
    # Unique prompts with source attribution for the Test Cases modal
    def get_prompt_source(pid):
        """Determine source type from prompt ID pattern."""
        if not pid:
            return "Unknown"
        pid_upper = pid.upper()
        if pid_upper.startswith("GEN-"):
            # Check for style variants (augmented)
            for suffix in ("-DIRECT", "-ROLEPLAY", "-ACADEMIC", "-CASUAL"):
                if pid_upper.endswith(suffix):
                    return "Style Variant"
            return "Template-Generated"
        elif pid_upper.startswith("B-"):
            return "Boundary Test"
        elif pid_upper.startswith("FPC-"):
            return "False Positive Control"
        else:
            return "Hand-Written"

    seen_prompts = {}
    for _, row in df.iterrows():
        pid = str(row.get('prompt_id', '')).strip()
        if pid and pid not in seen_prompts:
            text = str(row.get('prompt_text', row.get('prompt', ''))).strip()
            cat = normalize_category(str(row.get('category', '')))
            source = get_prompt_source(pid)
            seen_prompts[pid] = {
                'id': pid,
                'text': text[:500],  # Truncate very long prompts
                'category': cat,
                'source': source,
            }

    prompts_list = sorted(seen_prompts.values(), key=lambda p: p['id'])
    with open('web/public/prompts_list.json', 'w') as f:
        json.dump(prompts_list, f, separators=(',', ':'))
    print(f"   ✅ prompts_list.json ({len(prompts_list)} unique prompts, {os.path.getsize('web/public/prompts_list.json')} bytes)")


def compress_csv():
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Input file not found: {INPUT_FILE}")
        return

    print(f"📦 Processing {INPUT_FILE}...")

    # 1. Compress Full Version (Metadata + Text)
    print(f"   - Compressing full version to {OUTPUT_FILE_FULL}...")
    with open(INPUT_FILE, 'rb') as f_in:
        with gzip.open(OUTPUT_FILE_FULL, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)

    # 2. Generate and Compress Lite Version (Metadata Only)
    print(f"   - Generating lite version (no prompt/response) to {OUTPUT_FILE_LITE}...")
    try:
        import pandas as pd
        df = pd.read_csv(INPUT_FILE)

        drop_cols = ['prompt', 'response', 'prompt_text', 'response_text', 'text', 'prompt_text,response_text']
        cols_to_drop = [c for c in drop_cols if c in df.columns]

        if cols_to_drop:
            print(f"     Dropping columns: {cols_to_drop}")
            df_lite = df.drop(columns=cols_to_drop)
        else:
            print("     ⚠️ No text columns found to drop. Lite version might be same size.")
            df_lite = df

        df_lite.to_csv(OUTPUT_FILE_LITE, index=False, compression='gzip')

    except ImportError:
        print("❌ Pandas not found. Cannot generate lite version. Skipping.")
        return
    except Exception as e:
        print(f"❌ Failed to generate lite version: {e}")
        return

    # 3. Generate pre-computed JSON files
    try:
        generate_precomputed_json(df)
    except Exception as e:
        print(f"⚠️ Failed to generate pre-computed JSON: {e}")
        import traceback
        traceback.print_exc()

    # Stats
    original_size = os.path.getsize(INPUT_FILE) / (1024 * 1024)
    full_size = os.path.getsize(OUTPUT_FILE_FULL) / (1024 * 1024)
    lite_size = os.path.getsize(OUTPUT_FILE_LITE) / (1024 * 1024)
    reduction = (1 - (lite_size / full_size)) * 100

    print(f"\n📊 Compression Stats:")
    print(f"   Original: {original_size:.2f} MB")
    print(f"   Full GZ:  {full_size:.2f} MB")
    print(f"   Lite GZ:  {lite_size:.2f} MB ({reduction:.1f}% smaller than Full GZ)")
    print(f"✅ Done!")

if __name__ == "__main__":
    compress_csv()
