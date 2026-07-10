import pandas as pd
import numpy as np
import argparse
import os

from src.refusal import REFUSAL_VERDICTS

try:
    from scipy.stats import chi2 as _chi2
    def _mcnemar_p(b, c):
        """Exact McNemar's p-value via scipy.stats.chi2."""
        if b + c == 0:
            return 1.0
        chi2_stat = ((abs(b - c) - 1) ** 2) / (b + c)  # continuity-corrected
        return float(_chi2.sf(chi2_stat, df=1))
except ImportError:
    import math
    def _mcnemar_p(b, c):
        """Fallback erfc approximation when scipy is unavailable."""
        if b + c == 0:
            return 1.0
        chi2_stat = ((abs(b - c) - 1) ** 2) / (b + c)
        x = math.sqrt(chi2_stat / 2)
        a1, a2, a3, a4, a5, p_c = 0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429, 0.3275911
        t = 1.0 / (1.0 + p_c * abs(x))
        y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * math.exp(-x * x)
        return max(0.0, min(1.0, 1 - y))

# Standardized Path
AUDIT_LOG_PATH = "web/public/audit_log.csv.gz"
OUTPUT_PATH = "web/public/assets/p_values.csv"

def calculate_significance():
    if not os.path.exists(AUDIT_LOG_PATH):
        print(f"❌ Audit log not found at {AUDIT_LOG_PATH}")
        return

    try:
        df = pd.read_csv(AUDIT_LOG_PATH, on_bad_lines='skip', engine='python')

        # Binary Refusal: 1 if refused, 0 otherwise (canonical definition)
        df['is_refusal'] = df['verdict'].apply(lambda x: 1 if x in REFUSAL_VERDICTS else 0)

        # Pivot: Index=Prompt, Columns=Model, Values=is_refusal
        pivot = df.pivot_table(index='prompt_text', columns='model', values='is_refusal', aggfunc='max')

        models = pivot.columns.tolist()
        if len(models) < 2:
            print("⚠️ Need at least 2 models to calculate significance.")
            return

        print(f"📊 Calculating McNemar's Test for {len(models)} models ({len(models)*(len(models)-1)//2} pairs)...")

        results = []

        for i in range(len(models)):
            for j in range(i + 1, len(models)):
                m1 = models[i]
                m2 = models[j]

                pair_data = pivot[[m1, m2]].dropna()
                if len(pair_data) < 10:
                    continue

                a = ((pair_data[m1] == 0) & (pair_data[m2] == 0)).sum()
                b = ((pair_data[m1] == 0) & (pair_data[m2] == 1)).sum()
                c = ((pair_data[m1] == 1) & (pair_data[m2] == 0)).sum()
                d = ((pair_data[m1] == 1) & (pair_data[m2] == 1)).sum()

                p_raw = _mcnemar_p(b, c)

                results.append({
                    'Model A': m1,
                    'Model B': m2,
                    'p_raw': round(p_raw, 8),
                    'Samples': len(pair_data),
                    'Disagreements': b + c,
                    'Agree_Safe': int(a),
                    'Agree_Refused': int(d),
                })

        if not results:
            print("⚠️ No model pairs with sufficient overlap.")
            return

        results_df = pd.DataFrame(results)

        # --- Benjamini-Hochberg FDR correction ---
        results_df.sort_values('p_raw', inplace=True, ignore_index=True)
        m = len(results_df)
        results_df['p_adjusted_bh'] = results_df['p_raw'] * m / (results_df.index + 1)
        results_df['p_adjusted_bh'] = results_df['p_adjusted_bh'].clip(upper=1.0)
        # Step-up enforcement (monotonicity)
        for i in range(m - 2, -1, -1):
            results_df.loc[i, 'p_adjusted_bh'] = min(
                results_df.loc[i, 'p_adjusted_bh'],
                results_df.loc[i + 1, 'p_adjusted_bh']
            )

        # --- Holm-Bonferroni step-down correction ---
        results_df['p_adjusted_holm'] = (results_df['p_raw'] * (m - results_df.index)).clip(upper=1.0)
        # Enforce monotonicity (step-down)
        for i in range(1, m):
            results_df.loc[i, 'p_adjusted_holm'] = max(
                results_df.loc[i, 'p_adjusted_holm'],
                results_df.loc[i - 1, 'p_adjusted_holm']
            )

        results_df['significant_bh'] = results_df['p_adjusted_bh'] < 0.05
        results_df['significant_holm'] = results_df['p_adjusted_holm'] < 0.05
        # Backward-compat column
        results_df['Significant'] = results_df['significant_bh'].map({True: 'YES', False: 'NO'})
        results_df['P-Value'] = results_df['p_raw']

        os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
        results_df.to_csv(OUTPUT_PATH, index=False)

        sig_bh = results_df['significant_bh'].sum()
        sig_holm = results_df['significant_holm'].sum()
        print(f"✅ Significance results saved to {OUTPUT_PATH}")
        print(f"   {m} pairs | {sig_bh} significant (BH FDR) | {sig_holm} significant (Holm)")
        print(results_df[['Model A', 'Model B', 'p_raw', 'p_adjusted_bh', 'significant_bh']].head(10).to_string())

    except Exception as e:
        print(f"❌ Analysis failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    calculate_significance()
