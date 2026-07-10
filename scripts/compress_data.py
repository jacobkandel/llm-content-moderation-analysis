import gzip
import shutil
import os
import sys
import json
from collections import defaultdict

# Ensure `src` is importable when this script is run directly (python scripts/compress_data.py).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.refusal import REFUSAL_VERDICTS, SAFE_VERDICTS  # noqa: E402
from src.judge_config import is_judge_model  # noqa: E402

INPUT_FILE = "web/public/audit_log.csv"
OUTPUT_FILE_FULL = "web/public/audit_log.csv.gz"
OUTPUT_FILE_LITE = "web/public/audit_log_lite.csv.gz"

# Must match frontend filters exactly
BLOCKLIST = ['yi-34b', 'mistral-medium', 'gpt-audio']
SKIP_CATEGORIES = {'EdgeCase', 'Jailbreak', 'Multilingual', 'Roleplay'}
# REFUSAL_VERDICTS / SAFE_VERDICTS now come from src.refusal (single source of truth).
HEATMAP_REFUSAL_VERDICTS = set(REFUSAL_VERDICTS) | {'Soft Censorship'}

# Minimum sample size for a model×category cell to be included in
# significance testing and heatmap display (n < 30 is unreliable).
MIN_CELL_SIZE = 30

def normalize_category(cat: str) -> str:
    if cat in ('Sexual', 'Explicit Content'):
        return 'Explicit/Sexual'
    return cat

def wilson_score_interval(successes: int, total: int, confidence=0.95):
    """Calculates Wilson Score Confidence Interval for a proportion."""
    if total == 0:
        return 0.0, 0.0
    import math
    z = 1.95996 # 95% confidence
    p = successes / total
    denominator = 1 + z**2 / total
    center = p + z**2 / (2 * total)
    sd = math.sqrt((p * (1 - p) + z**2 / (4 * total)) / total)
    lower = (center - z * sd) / denominator
    upper = (center + z * sd) / denominator
    return max(0.0, lower), min(1.0, upper)

def generate_precomputed_json(df):
    """Generate summary_stats.json, heatmap_matrix.json, spectrum_data.json from DataFrame."""
    import pandas as pd
    import math


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

    # Filter: min 50 entries, blocklist with 0 refusals, skip categories.
    # Also exclude the judge/classifier model from the subject pool so it never
    # appears in the leaderboard grading its own responses (see src/judge_config.py).
    keep_models = set()
    for model, count in model_counts.items():
        if count < 50:
            continue
        if is_judge_model(model):
            print(f"   ⚖️  Excluding judge model from subject pool: {model}")
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
        refusal_rate = (refused / total) * 100
        ci_lower, ci_upper = wilson_score_interval(refused, total)
        spectrum.append({
            'name': model.split('/')[-1] if '/' in model else model,
            'fullName': model,
            'refusalRate': round(refusal_rate, 2),
            'refusalRateCILower': round(ci_lower * 100, 2),
            'refusalRateCIUpper': round(ci_upper * 100, 2),
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

    # Calculate Minimum Detectable Effect Size for 80% power at alpha=0.05
    # Uses McNemar's test formula: MDES = sqrt((z_alpha + z_beta)^2 * p_disc / N)
    # p_disc = assumed discordant proportion between model pairs (~10% baseline)
    avg_discordant_p = 0.1
    z_alpha = 1.95996  # two-tailed alpha=0.05
    z_beta = 0.84162   # 80% power
    total_prompts_n = int(df['_pid'].nunique())
    mdes_proportion = math.sqrt(((z_alpha + z_beta)**2 * avg_discordant_p) / total_prompts_n) if total_prompts_n > 0 else 0
    # Convert to percentage points for interpretability (e.g. 0.0198 → 1.98 pp)
    power_mdes = round(mdes_proportion * 100, 2)

    # Required N for a 5 percentage-point MDES (0.05 as proportion)
    required_n_5pct = int(math.ceil(((z_alpha + z_beta)**2 * avg_discordant_p) / (0.05**2)))

    # Cramér's V for Model vs. Verdict and Category vs. Verdict
    import pandas as pd
    try:
        from scipy.stats import chi2_contingency
        # Create a binary refusal column for stats
        is_refusal_binary = df['verdict'].isin(REFUSAL_VERDICTS).astype(int)
        
        # 1. Model vs Verdict
        ct_model = pd.crosstab(df['model'], is_refusal_binary)
        chi2_model = chi2_contingency(ct_model, correction=False)[0]
        n_model = ct_model.sum().sum()
        min_dim_model = min(ct_model.shape) - 1
        cramers_v_model = round(math.sqrt(chi2_model / (n_model * min_dim_model)), 4) if n_model > 0 and min_dim_model > 0 else 0.0
        
        # 2. Category vs Verdict
        ct_cat = pd.crosstab(df['category'], is_refusal_binary)
        chi2_cat = chi2_contingency(ct_cat, correction=False)[0]
        n_cat = ct_cat.sum().sum()
        min_dim_cat = min(ct_cat.shape) - 1
        cramers_v_cat = round(math.sqrt(chi2_cat / (n_cat * min_dim_cat)), 4) if n_cat > 0 and min_dim_cat > 0 else 0.0
    except ImportError:
        cramers_v_model = 0.0
        cramers_v_cat = 0.0

    # Cohen's d for Verbosity
    resp_col = 'response_text' if 'response_text' in df.columns else ('response' if 'response' in df.columns else None)
    if resp_col:
        resp_lens = df[resp_col].fillna('').astype(str).str.len()
        safe_mask = df['verdict'].isin(SAFE_VERDICTS)
        refused_mask = df['verdict'].isin(REFUSAL_VERDICTS)
        safe_lens = resp_lens[safe_mask].values
        refused_lens = resp_lens[refused_mask].values
        
        if len(safe_lens) > 0 and len(refused_lens) > 0:
            import numpy as np
            mean_safe, mean_refused = float(np.mean(safe_lens)), float(np.mean(refused_lens))
            var_safe, var_refused = float(np.var(safe_lens, ddof=1)), float(np.var(refused_lens, ddof=1))
            n_s, n_r = len(safe_lens), len(refused_lens)
            pooled_std = math.sqrt(((n_s - 1) * var_safe + (n_r - 1) * var_refused) / (n_s + n_r - 2)) if (n_s + n_r - 2) > 0 else 0.0
            cohens_d_verbosity = round((mean_safe - mean_refused) / pooled_std, 4) if pooled_std > 0 else 0.0
        else:
            mean_safe, mean_refused, cohens_d_verbosity = 0.0, 0.0, 0.0
    else:
        mean_safe, mean_refused, cohens_d_verbosity = 0.0, 0.0, 0.0

    summary = {
        'totalCases': total_prompts_n,
        'modelsCount': len(keep_models),
        'totalEvaluations': int(len(df)),
        'statisticalPowerMDES': power_mdes,
        'requiredNSample': required_n_5pct,
        'cramersVModel': cramers_v_model,
        'cramersVCategory': cramers_v_cat,
        'cohensDVerbosity': cohens_d_verbosity,
        'meanSafeLength': round(mean_safe, 1),
        'meanRefusedLength': round(mean_refused, 1),
        'lastUpdated': dates[-1] if dates else '',
        'dateRange': {'start': dates[0] if dates else '', 'end': dates[-1] if dates else ''},
        'allModels': sorted(keep_models),
        'timelineDates': dates,
        'distribution': [{'name': k, 'value': v} for k, v in distribution.items()],
    }
    with open('web/public/summary_stats.json', 'w') as f:
        json.dump(summary, f, separators=(',', ':'))
    print(f"   ✅ summary_stats.json ({os.path.getsize('web/public/summary_stats.json')} bytes)")

    # --- 3.5. family_stats.json ---
    # Group models into provider families, compute per-family refusal stats and intra-family progressions
    FAMILY_MAP = {
        'anthropic': 'Anthropic Claude',
        'openai': 'OpenAI GPT',
        'google': 'Google',
        'meta-llama': 'Meta Llama',
        'mistralai': 'Mistral AI',
        'deepseek': 'DeepSeek',
        'qwen': 'Qwen / Alibaba',
        'x-ai': 'xAI Grok',
        'nousresearch': 'Meta Llama',  # Hermes is Llama-based
        'cognitivecomputations': 'Other',
        'microsoft': 'Microsoft',
        'cohere': 'Cohere',
    }

    def get_family(model_name: str) -> str:
        provider = model_name.split('/')[0].lower() if '/' in model_name else model_name.lower()
        for prefix, family in FAMILY_MAP.items():
            if prefix in provider:
                return family
        return 'Other'

    # Per-model refusal rates already computed in spectrum
    family_models = defaultdict(list)
    for m in spectrum:
        fam = get_family(m['fullName'])
        family_models[fam].append(m)

    family_stats = []
    for fam, models_in_fam in sorted(family_models.items()):
        rates = [m['refusalRate'] for m in models_in_fam]
        avg = round(sum(rates) / len(rates), 2) if rates else 0
        # Sort models within family by version/name for progression chart
        sorted_models = sorted(models_in_fam, key=lambda m: m['name'])
        family_stats.append({
            'family': fam,
            'modelCount': len(models_in_fam),
            'avgRefusalRate': avg,
            'minRefusalRate': round(min(rates), 2),
            'maxRefusalRate': round(max(rates), 2),
            'spread': round(max(rates) - min(rates), 2),
            'models': [
                {
                    'name': m['name'],
                    'fullName': m['fullName'],
                    'refusalRate': m['refusalRate'],
                    'refusalRateCILower': m.get('refusalRateCILower'),
                    'refusalRateCIUpper': m.get('refusalRateCIUpper'),
                    'total': m['total'],
                }
                for m in sorted_models
            ],
        })
    family_stats.sort(key=lambda x: x['avgRefusalRate'], reverse=True)

    with open('web/public/family_stats.json', 'w') as f:
        json.dump(family_stats, f, separators=(',', ':'))
    print(f"   ✅ family_stats.json ({len(family_stats)} families, {os.path.getsize('web/public/family_stats.json')} bytes)")

    # --- 3.6. soft_censorship_stats.json ---
    # Per-model breakdown: Hard Refusal, Soft Censorship, Allowed
    HARD_REFUSAL_VERDICTS = REFUSAL_VERDICTS  # canonical refusal set (vs. Soft Censorship)
    SOFT_CENSORSHIP_VERDICTS = {'Soft Censorship'}
    ALLOWED_VERDICTS = SAFE_VERDICTS

    soft_censor_stats = []
    for model in sorted(keep_models):
        rows = df[df['model'] == model]
        total = len(rows)
        if total == 0:
            continue
        hard = int(rows['verdict'].isin(HARD_REFUSAL_VERDICTS).sum())
        soft = int(rows['verdict'].isin(SOFT_CENSORSHIP_VERDICTS).sum())
        allowed = int(rows['verdict'].isin(ALLOWED_VERDICTS).sum())
        other = total - hard - soft - allowed
        soft_censor_stats.append({
            'model': model,
            'name': model.split('/')[-1] if '/' in model else model,
            'family': get_family(model),
            'total': total,
            'hardRefusal': hard,
            'softCensorship': soft,
            'allowed': allowed,
            'other': other,
            'hardRefusalRate': round(hard / total * 100, 2),
            'softCensorshipRate': round(soft / total * 100, 2),
            'allowedRate': round(allowed / total * 100, 2),
            'totalRefusalRate': round((hard + soft) / total * 100, 2),
        })
    soft_censor_stats.sort(key=lambda x: x['totalRefusalRate'], reverse=True)

    with open('web/public/soft_censorship_stats.json', 'w') as f:
        json.dump(soft_censor_stats, f, separators=(',', ':'))
    print(f"   ✅ soft_censorship_stats.json ({len(soft_censor_stats)} models, {os.path.getsize('web/public/soft_censorship_stats.json')} bytes)")

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
        """McNemar's test with continuity correction. Returns exact p-value via scipy."""
        if b + c == 0:
            return 1.0
        chi2_stat = ((abs(b - c) - 1) ** 2) / (b + c)
        try:
            from scipy.stats import chi2 as _chi2
            return float(_chi2.sf(chi2_stat, df=1))
        except ImportError:
            # Fallback: Abramowitz & Stegun erfc approximation
            x = math.sqrt(chi2_stat / 2)
            a1, a2, a3, a4, a5, p_c = 0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429, 0.3275911
            t = 1.0 / (1.0 + p_c * abs(x))
            y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * math.exp(-x * x)
            return max(0.0, min(1.0, 1 - y))

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
                p_val = mcnemars_test(b_count, c_count)
                
                # Calculate Cohen's h effect size
                pA = a_total_unsafe / samples
                pB = b_total_unsafe / samples
                # Prevent domain errors in asin(sqrt(x)) for floating point imprecision
                pA, pB = max(0, min(1, pA)), max(0, min(1, pB))
                phiA = 2 * math.asin(math.sqrt(pA))
                phiB = 2 * math.asin(math.sqrt(pB))
                cohens_h = abs(phiA - phiB)
                
                # Paired Confidence Interval for difference (pA - pB)
                diff = pA - pB
                se_diff = math.sqrt(max(0, (b_count + c_count) - ((b_count - c_count)**2 / samples))) / samples if samples > 0 else 0
                ci_lower = diff - 1.95996 * se_diff
                ci_upper = diff + 1.95996 * se_diff
                
                sig_results.append({
                    'modelA': mA,
                    'modelB': mB,
                    'pValue': p_val, # Unadjusted
                    'cohensH': round(cohens_h, 4),
                    'diff': round(diff * 100, 2),
                    'ciLower': round(ci_lower * 100, 2),
                    'ciUpper': round(ci_upper * 100, 2),
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

    # Holm-Bonferroni step-down correction (sensitivity analysis)
    # Results are already sorted by unadjusted pValue ascending
    for i, res in enumerate(sig_results):
        rank = i + 1
        holm_adj = res['pValue'] * (m - rank + 1)
        res['pValueHolm'] = round(min(holm_adj, 1.0), 8)
    # Enforce monotonicity (step-down)
    for i in range(1, m):
        sig_results[i]['pValueHolm'] = max(sig_results[i]['pValueHolm'], sig_results[i-1]['pValueHolm'])
    for res in sig_results:
        res['significantHolm'] = res['pValueHolm'] < 0.05

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

        # Per-category refusal rates and CI for this model
        cat_rates = {}
        for cat in compare_categories:
            cat_rows = rows[rows['category'] == cat]
            ct = len(cat_rows)
            if ct == 0:
                cat_rates[cat] = {'rate': 0, 'ciLower': 0, 'ciUpper': 0}
            else:
                cat_refused = cat_rows['verdict'].isin(REFUSAL_VERDICTS).sum()
                rate = (cat_refused / ct) * 100
                ci_l, ci_u = wilson_score_interval(cat_refused, ct)
                cat_rates[cat] = {
                    'rate': round(rate, 2),
                    'ciLower': round(ci_l * 100, 2),
                    'ciUpper': round(ci_u * 100, 2)
                }

        model_refusal_rate = (refused / total) * 100
        ci_l_mod, ci_u_mod = wilson_score_interval(refused, total)

        model_stats[model] = {
            'refusalRate': round(model_refusal_rate, 2),
            'refusalRateCILower': round(ci_l_mod * 100, 2),
            'refusalRateCIUpper': round(ci_u_mod * 100, 2),
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

    # --- 9. overrefusal_stats.json (XSTest / OR-Bench) ---
    _generate_overrefusal_json()


def _generate_overrefusal_json():
    """
    Reads xstest_results.csv (written by --benchmark xstest audit step) and computes
    per-model over-refusal rates: % of ground-truth-safe prompts that were refused.
    Writes web/public/overrefusal_stats.json. Silently no-ops if the file doesn't exist.
    """
    XSTEST_CSV = 'web/public/xstest_results.csv'
    OUT_PATH = 'web/public/overrefusal_stats.json'
    REFUSAL_VERDICTS_SET = REFUSAL_VERDICTS  # canonical refusal set (single source of truth)

    if not os.path.exists(XSTEST_CSV):
        print("   ℹ️  xstest_results.csv not found — skipping over-refusal stats")
        return

    try:
        import pandas as pd
        df = pd.read_csv(XSTEST_CSV, on_bad_lines='skip', engine='python')

        if df.empty or 'expected_safe' not in df.columns:
            print("   ⚠️  xstest_results.csv has no expected_safe column — skipping")
            return

        # Only consider prompts that are ground-truth safe
        safe_df = df[df['expected_safe'] == True].copy()
        if safe_df.empty:
            print("   ⚠️  No expected_safe=True rows found in xstest_results.csv")
            return

        safe_df['is_refusal'] = safe_df['verdict'].isin(REFUSAL_VERDICTS_SET)
        benchmark_name = safe_df['benchmark_source'].dropna().iloc[0] if 'benchmark_source' in safe_df.columns else 'XSTest'

        models = sorted(safe_df['model'].dropna().unique())
        model_stats = []
        for model in models:
            rows = safe_df[safe_df['model'] == model]
            total = len(rows)
            if total == 0:
                continue
            over_refused = int(rows['is_refusal'].sum())
            rate = (over_refused / total) * 100
            ci_lower, ci_upper = wilson_score_interval(over_refused, total)
            model_stats.append({
                'model': model,
                'name': model.split('/')[-1] if '/' in model else model,
                'overRefusalRate': round(rate, 2),
                'overRefusalRateCILower': round(ci_lower * 100, 2),
                'overRefusalRateCIUpper': round(ci_upper * 100, 2),
                'overRefusals': over_refused,
                'total': total,
            })

        model_stats.sort(key=lambda x: x['overRefusalRate'], reverse=True)

        # Per-category breakdown
        by_category = {}
        if 'category' in safe_df.columns:
            for cat, grp in safe_df.groupby('category'):
                by_category[cat] = {
                    'total': len(grp),
                    'overRefusals': int(grp['is_refusal'].sum()),
                    'overRefusalRate': round(grp['is_refusal'].mean() * 100, 2),
                }

        result = {
            'benchmark': str(benchmark_name),
            'promptCount': int(len(safe_df['prompt_id'].dropna().unique())) if 'prompt_id' in safe_df.columns else int(len(safe_df)),
            'lastUpdated': str(safe_df['test_date'].max()) if 'test_date' in safe_df.columns else '',
            'models': model_stats,
            'byCategory': by_category,
        }

        with open(OUT_PATH, 'w') as f:
            json.dump(result, f, separators=(',', ':'), indent=None)
        print(f"   ✅ overrefusal_stats.json ({len(model_stats)} models, {os.path.getsize(OUT_PATH)} bytes)")

    except Exception as e:
        print(f"   ⚠️  overrefusal_stats generation failed: {e}")
        import traceback
        traceback.print_exc()


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
    df = None
    try:
        import pandas as pd
        df = pd.read_csv(INPUT_FILE, on_bad_lines='skip', engine='python')

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
        print(f"⚠️ Failed to generate lite version: {e}")
        # Still try to generate JSON if we managed to load the dataframe
        if df is None:
            try:
                import pandas as pd
                df = pd.read_csv(INPUT_FILE, on_bad_lines='skip', engine='python')
            except Exception as e2:
                print(f"❌ Cannot read CSV at all: {e2}")
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
