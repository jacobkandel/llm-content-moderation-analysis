import os
import json
import pandas as pd
import numpy as np
from datetime import date
from openai import OpenAI
from src.config import settings
from src.logger import logger
from src.statistics import calculate_fleiss_kappa, interpret_kappa
from src.refusal import REFUSAL_VERDICTS

CSV_PATHS = [
    "web/public/audit_log.csv",
    "web/public/audit_log.csv.gz",
    "audit_log.csv",
]

def _load_data():
    """Load audit data from CSV (preferred) or SQLite fallback."""
    # Try CSV first (works in CI and locally)
    for csv_path in CSV_PATHS:
        if os.path.exists(csv_path):
            logger.info(f"📂 Loading data from {csv_path}...")
            df = pd.read_csv(csv_path, on_bad_lines='skip', engine='python')
            # Normalize column names to match expected schema
            col_map = {'model_id': 'model', 'run_cost': 'cost'}
            df.rename(columns={k: v for k, v in col_map.items() if k in df.columns}, inplace=True)
            logger.info(f"Loaded {len(df)} rows from CSV.")
            return df

    # Fallback to SQLite
    logger.info("No CSV found, trying SQLite...")
    try:
        from src.database import get_session, AuditResult
        from sqlalchemy import select
        session = get_session()
        query = select(AuditResult.model_id.label("model"),
                       AuditResult.verdict,
                       AuditResult.prompt_id,
                       AuditResult.response_text,
                       AuditResult.cost)
        df = pd.read_sql(query, session.bind)
        session.close()
        return df
    except Exception as e:
        logger.error(f"SQLite fallback also failed: {e}")
        return pd.DataFrame()

def generate_weekly_report(output_dir=".", report_file="web/public/latest_report.md"):
    """
    Analyst 3.0: Generates a rich, longitudinal research report using all available statistics.
    """
    logger.info("📊 Starting AI Analyst 3.0 Analysis...")

    try:
        df = _load_data()

        if df.empty: 
            logger.warning("⚠️ No audit log found to analyze.")
            return

        # Filter out hard errors (keep BLOCKED = API safety filter)
        df = df[df['verdict'] != 'ERROR'].copy()
        if df.empty:
            logger.warning("⚠️ No valid data after filtering errors.")
            return

        # --- 1. Reliability Analysis (Fleiss' Kappa) ---
        # Use the SAME precomputed reliability the dashboard shows (reliability_scores.json)
        # rather than recomputing here. An independent recompute on ragged/unbalanced data
        # produced a degenerate 0.0 that contradicted the UI's reported value.
        kappa = None
        kappa_interpretation = "N/A"
        try:
            with open("web/public/reliability_scores.json") as f:
                rel = json.load(f)
            if rel.get("globalKappa") is not None:
                kappa = float(rel["globalKappa"])
                kappa_interpretation = rel.get("interpretation") or interpret_kappa(kappa)
        except Exception as e:
            logger.warning(f"Could not load reliability_scores.json ({e}); omitting kappa.")
        kappa_str = f"{kappa:.4f}" if (kappa is not None and kappa == kappa) else "n/a"

        # Restrict per-model stats to the canonical audited model set so stray/corrupted
        # audit_log IDs (e.g. '269') never leak into the report or its model count.
        try:
            with open("data/models.json") as f:
                canonical_models = {m.get("id") for m in json.load(f) if m.get("id")}
            if canonical_models:
                df = df[df['model'].isin(canonical_models)].copy()
        except Exception as e:
            logger.warning(f"Could not load data/models.json ({e}); using all models.")

        # --- 2. Per-model refusal rates ---
        model_stats = df.groupby('model').agg(
            total=('verdict', 'count'),
            refusals=('verdict', lambda x: (x.isin(REFUSAL_VERDICTS)).sum())
        )
        model_stats['refusal_rate'] = (model_stats['refusals'] / model_stats['total'] * 100).round(1)
        model_stats = model_stats.sort_values('refusal_rate', ascending=False)
        model_refusal_text = "\n".join(
            f"  - {model}: {row['refusal_rate']}% refusal rate ({row['total']} evals)"
            for model, row in model_stats.iterrows()
        )

        # --- 3. Robustness / Phrasing Sensitivity ---
        def get_base_id(pid):
            return pid.split("-V")[0] if "-V" in pid else pid
        df['base_id'] = df['prompt_id'].apply(get_base_id)
        robustness = df.groupby(['model', 'base_id'])['verdict'].nunique().reset_index()
        base_id_counts = df.groupby('base_id')['prompt_id'].nunique()
        valid_bases = base_id_counts[base_id_counts > 1].index
        robustness_valid = robustness[robustness['base_id'].isin(valid_bases)]
        if not robustness_valid.empty:
            flips = robustness_valid[robustness_valid['verdict'] > 1]
            flip_rate = (len(flips) / len(robustness_valid)) * 100
            robustness_text = f"{flip_rate:.1f}% of phrasing variant groups triggered inconsistent verdicts across rewordings of the same underlying prompt."
        else:
            robustness_text = "No phrasing variant groups detected in this batch."

        # --- 4. Disagreement examples ---
        pivot = df.pivot_table(index='prompt_id', columns='model', values='verdict', aggfunc='first')
        disagreement_examples = []
        for idx, row in pivot.iterrows():
            valid = row.dropna()
            if len(valid.unique()) > 1:
                disagreement_examples.append(f"Prompt {idx}: {dict(valid)}")
        top_disagreements = "\n".join(disagreement_examples[:8])

        # --- 5. Load supplementary pre-computed data (drift + consensus) ---
        drift_context = ""
        drift_path = os.path.join("web", "public", "drift_report.json")
        if os.path.exists(drift_path):
            with open(drift_path) as f:
                drift_data = json.load(f)
            # Highlight the most dramatic shifts
            significant = [d for d in drift_data if d.get("significant_change") and abs(d.get("rate_change", 0)) > 5]
            significant.sort(key=lambda x: abs(x.get("rate_change", 0)), reverse=True)
            if significant:
                drift_lines = []
                for d in significant[:8]:
                    direction = "increased" if d['rate_change'] > 0 else "decreased"
                    drift_lines.append(
                        f"  - {d['model']}: refusal rate {direction} by {abs(d['rate_change']):.1f}pp "
                        f"({d['start_refusal_rate']:.1f}% → {d['end_refusal_rate']:.1f}%), "
                        f"{d['start_date']} to {d['end_date']}"
                    )
                drift_context = "Statistically significant longitudinal changes (p<0.05):\n" + "\n".join(drift_lines)
            else:
                drift_context = "No statistically significant longitudinal drift detected in this period."

        consensus_context = ""
        consensus_path = os.path.join("web", "public", "consensus_stats.json")
        if os.path.exists(consensus_path):
            with open(consensus_path) as f:
                cons = json.load(f)
            total = cons.get("totalPrompts", 0)
            dist = {d["name"]: d["value"] for d in cons.get("distribution", [])}
            full_agree = dist.get("Full Agreement (≥90%)", 0)
            split = dist.get("Split Decision (<60%)", 0)
            per_model = cons.get("perModel", [])
            # Identify outliers (lowest kappa)
            outliers = sorted(per_model, key=lambda x: x.get("kappa", 1))[:4]
            outlier_lines = [f"  - {m['shortName']}: κ={m['kappa']:.3f}, {m['agreementRate']:.1f}% agreement" for m in outliers]
        else:
            total = 0
        if total > 0:
            consensus_context = (
                f"Cross-model consensus across {total} prompts: "
                f"{full_agree} ({(full_agree/total*100):.1f}%) show full agreement (≥90%), "
                f"{split} ({(split/total*100):.1f}%) are genuine split decisions (<60%).\n"
                f"Lowest-consensus models (worst inter-rater alignment):\n" + "\n".join(outlier_lines)
            )

        # --- 6. Compose the prompt ---
        today = date.today().isoformat()
        prompt = f"""You are an expert AI Safety Researcher writing a concise but substantive "AI Analyst Weekly Report" for a live content moderation benchmark dashboard. Your audience is technical — researchers, engineers, and policy analysts who follow AI safety.

You have access to the following real benchmark statistics:

--- GLOBAL RELIABILITY ---
Inter-Rater Reliability (Fleiss' Kappa): {kappa_str} ({kappa_interpretation})
This measures how consistently the {len(model_stats)} models in the benchmark agree with each other across all prompts.

--- PHRASING ROBUSTNESS ---
{robustness_text}

--- PER-MODEL REFUSAL RATES (this audit cycle) ---
{model_refusal_text}

--- LONGITUDINAL DRIFT (week-over-week changes) ---
{drift_context}

--- CROSS-MODEL CONSENSUS DISTRIBUTION ---
{consensus_context}

--- NOTABLE DISAGREEMENTS (sample) ---
{top_disagreements if top_disagreements else "No notable disagreements in this batch."}

---

## YOUR TASK

Write a professional, insightful "AI Analyst Weekly Report" in the following EXACT structure. Use ONLY paragraph form — absolutely NO bullet points, NO numbered lists, NO dashes, NO markdown lists of any kind. Every section must be written as flowing prose.

### Section 1: Longitudinal Trends
One cohesive paragraph (80–120 words) describing which models have drifted the most since the previous period, in which direction, and what this might signal about their underlying policy changes. Reference specific model names and rate changes from the drift data.

### Section 2: Consensus & Reliability
One paragraph (60–90 words) interpreting the Fleiss' Kappa score and the consensus distribution. Which models are the outliers in terms of inter-rater agreement? Are any models systematically misaligned with the benchmark consensus?

### Section 3: Safety Anomalies
One paragraph (60–90 words) discussing the most notable prompt-level disagreements. Which categories of content appear most contested? Are there models that are systematically more permissive or restrictive on edge cases?

### Section 4: Vibe Check
One single sentence — a direct, candid "Vibe Check" for the research team summarizing the overall health and trajectory of the benchmark ecosystem this week.

---

CRITICAL FORMATTING RULES:
- Absolutely no bullet points, no dashes as list items, no numbered lists. Violating this will make the report unusable.
- Write in analytical third-person prose, like a research memo.
- Use precise numbers from the data (percentages, kappa values, model names).
- Do NOT use emojis.
- Total length: 250–400 words.
- Do not add a title heading — the UI already adds one.

CRITICAL ACCURACY RULES (these override everything else):
- Cite ONLY numbers, model names, and rates that appear verbatim in the statistics provided above. Never invent, extrapolate, or round to a figure not shown.
- If a data block above is empty, missing, or says data is unavailable, explicitly state that it was unavailable this period. Do not fabricate a value to fill the section.
- Describe drift and rate changes as *observed* correlations only. Do NOT assert causes (e.g. "because the provider changed its policy"). When a change is large, note it may partly reflect small per-period sample sizes rather than a genuine shift.
"""

        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key
        )

        response = client.chat.completions.create(
            model="openai/gpt-4o",
            messages=[
                {"role": "system", "content": "You are a precise, data-driven AI safety analyst who writes in dense, informative prose. You never use bullet points."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.4,
        )
        
        report_content = response.choices[0].message.content

        # Prepend a metadata header (used by the UI to show generation date and stats)
        metadata_header = (
            f"<!-- generated:{today} kappa:{kappa_str} models:{len(model_stats)} -->\n\n"
        )
        final_output = metadata_header + report_content
        
        # Write output
        full_path = os.path.join(output_dir, report_file)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w") as f:
            f.write(final_output)
            
        logger.info(f"✅ Generated Analyst 3.0 Report: {full_path}")
        
    except Exception as e:
        logger.error(f"⚠️ Failed to generate analyst report: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    generate_weekly_report()
