
import pandas as pd
import json
import os
import numpy as np

from src.refusal import REFUSAL_VERDICTS, is_scorable

def calculate_drift_stats(df):
    """
    Analyzes temporal drift in refusal rates for each model.
    Compares the First Observed Date vs Last Observed Date.
    """
    results = []
    
    # Ensure date format
    df['test_date'] = pd.to_datetime(df['test_date'], errors='coerce')
    df = df.dropna(subset=['test_date'])
    
    # Group by Model
    models = df['model'].unique()
    
    # SIMULATION REMOVED


    # REAL ANALYSIS (Only runs if we have actual history)
    
    for model in models:
        m_df = df[df['model'] == model].sort_values('test_date')
        
        dates = m_df['test_date'].dt.date.unique()
        if len(dates) < 2:
            continue # Need at least 2 dates to measure drift
            
        start_date = dates[0]
        end_date = dates[-1]
        
        # Get counts for Start Date (canonical refusal set; exclude non-scorable rows).
        start_data = m_df[(m_df['test_date'].dt.date == start_date) & m_df['verdict'].apply(is_scorable)]
        start_total = len(start_data)
        start_refusals = len(start_data[start_data['verdict'].isin(REFUSAL_VERDICTS)])
        start_rate = (start_refusals / start_total) * 100 if start_total > 0 else 0

        # Get counts for End Date
        end_data = m_df[(m_df['test_date'].dt.date == end_date) & m_df['verdict'].apply(is_scorable)]
        end_total = len(end_data)
        end_refusals = len(end_data[end_data['verdict'].isin(REFUSAL_VERDICTS)])
        end_rate = (end_refusals / end_total) * 100 if end_total > 0 else 0
        
        from src.statistics import two_proportion_z_test
        
        test_result = two_proportion_z_test(start_refusals, start_total, end_refusals, end_total)
        is_significant = test_result["significant"]
        p_val = test_result["p_value"]

        results.append({
            "model": model,
            "start_date": str(start_date),
            "end_date": str(end_date),
            "start_refusal_rate": round(start_rate, 2),
            "end_refusal_rate": round(end_rate, 2),
            "rate_change": round(end_rate - start_rate, 2),
            "p_value": float(f"{p_val:.4f}"),
            "significant_change": bool(is_significant)
        })
        
    return results

def run_drift_analysis():
    csv_path = 'web/public/audit_log.csv.gz'
    if not os.path.exists(csv_path):
        csv_path = 'audit_log.csv'
        if not os.path.exists(csv_path):
            # Try uncompressed
            csv_path = 'web/public/audit_log.csv'
            if not os.path.exists(csv_path):
                print("❌ No audit_log.csv found.")
                return

    print("📈 Analyzing Longitudinal Drift...")
    try:
        # Modern pandas (>1.3): use on_bad_lines='skip'
        df = pd.read_csv(csv_path, on_bad_lines='skip', engine='python')
    except TypeError:
        # Older pandas: use error_bad_lines=False
        try:
            df = pd.read_csv(csv_path, error_bad_lines=False)
        except Exception as e:
            print(f"❌ Failed to read CSV: {e}")
            return
    except Exception as e:
        print(f"⚠️ CSV Read Warning: {e}. Trying with python engine...")
        try:
            df = pd.read_csv(csv_path, engine='python', on_bad_lines='skip')
        except:
            print("❌ Could not parse CSV even with fallback.")
            return
    
    analysis_results = calculate_drift_stats(df)
    print(f"✅ Drift Analysis Complete. Found {len(analysis_results)} models with history.")
    
    # SIMULATION REMOVED - Using only real data

            
    # Save as JSON for frontend
    out_path = 'web/public/drift_report.json'
    with open(out_path, 'w') as f:
        json.dump(analysis_results, f, indent=2)
        
    # Also save as CSV for easy reading
    pd.DataFrame(analysis_results).to_csv('web/public/drift_report.csv', index=False)
    
    for r in analysis_results:
        sig = "⚠️ SIGNIFICANT" if r['significant_change'] else "Stable"
        print(f"  - {r['model']}: {r['start_refusal_rate']}% -> {r['end_refusal_rate']}% ({sig})")

if __name__ == "__main__":
    run_drift_analysis()
