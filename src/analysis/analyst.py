import os
import json
import pandas as pd
from datetime import date
from openai import OpenAI
from src.database import get_session, AuditResult
from src.config import settings
from src.logger import logger
from src.statistics import calculate_fleiss_kappa, interpret_kappa
from sqlalchemy import select


def generate_weekly_report(output_dir=".", report_file="web/public/latest_report.md"):
    """
    Analyst 4.0: Generates a comprehensive, data-rich research report using
    all available benchmark statistics. Designed to produce genuinely useful
    overviews every time the audit pipeline runs.
    """
    logger.info("📊 Starting AI Analyst 4.0 Analysis...")

    session = get_session()
    try:
        # --- Fetch raw audit data ---
        query = select(
            AuditResult.model_id.label("model"),
            AuditResult.verdict,
            AuditResult.prompt_id,
            AuditResult.response_text,
            AuditResult.cost,
        )
        df = pd.read_sql(query, session.bind)

        if df.empty:
            logger.warning("⚠️ No audit log found to analyze.")
            return

        # Filter out hard errors (keep BLOCKED = API safety filter)
        df = df[df["verdict"] != "ERROR"].copy()
        if df.empty:
            logger.warning("⚠️ No valid data after filtering errors.")
            return

        # --- 1. Reliability Analysis (Fleiss' Kappa) ---
        verdict_counts = df.pivot_table(
            index="prompt_id", columns="verdict", aggfunc="size", fill_value=0
        )
        relevant_cols = [
            c
            for c in verdict_counts.columns
            if c in ["ALLOWED", "BLOCKED", "REFUSAL", "REMOVED"]
        ]
        ratings_matrix = verdict_counts[relevant_cols].to_numpy()
        kappa = calculate_fleiss_kappa(ratings_matrix)
        kappa_interpretation = interpret_kappa(kappa)

        # --- 2. Per-model refusal rates ---
        model_stats = df.groupby("model").agg(
            total=("verdict", "count"),
            refusals=(
                "verdict",
                lambda x: (x.isin(["REMOVED", "REFUSAL", "BLOCKED"])).sum(),
            ),
        )
        model_stats["refusal_rate"] = (
            model_stats["refusals"] / model_stats["total"] * 100
        ).round(1)
        model_stats = model_stats.sort_values("refusal_rate", ascending=False)

        # Build structured model table for the prompt
        model_table_lines = []
        for model, row in model_stats.iterrows():
            model_table_lines.append(
                f"| {model} | {row['refusal_rate']}% | {int(row['total'])} |"
            )
        model_table = (
            "| Model | Refusal Rate | Evaluations |\n"
            "|---|---|---|\n" + "\n".join(model_table_lines)
        )

        # --- 3. Robustness / Phrasing Sensitivity ---
        def get_base_id(pid):
            return pid.split("-V")[0] if "-V" in pid else pid

        df["base_id"] = df["prompt_id"].apply(get_base_id)
        robustness = df.groupby(["model", "base_id"])["verdict"].nunique().reset_index()
        base_id_counts = df.groupby("base_id")["prompt_id"].nunique()
        valid_bases = base_id_counts[base_id_counts > 1].index
        robustness_valid = robustness[robustness["base_id"].isin(valid_bases)]
        if not robustness_valid.empty:
            flips = robustness_valid[robustness_valid["verdict"] > 1]
            flip_rate = (len(flips) / len(robustness_valid)) * 100
            robustness_text = f"{flip_rate:.1f}% of phrasing variant groups triggered inconsistent verdicts across rewordings of the same underlying prompt."
        else:
            robustness_text = "No phrasing variant groups detected in this batch."

        # --- 4. Disagreement examples ---
        pivot = df.pivot_table(
            index="prompt_id", columns="model", values="verdict", aggfunc="first"
        )
        disagreement_examples = []
        for idx, row in pivot.iterrows():
            valid = row.dropna()
            if len(valid.unique()) > 1:
                disagreement_examples.append(f"Prompt {idx}: {dict(valid)}")
        top_disagreements = "\n".join(disagreement_examples[:8])

        # --- 5. Load supplementary pre-computed data ---

        # Drift data
        drift_context = ""
        drift_path = os.path.join("web", "public", "drift_report.json")
        if os.path.exists(drift_path):
            with open(drift_path) as f:
                drift_data = json.load(f)
            significant = [
                d
                for d in drift_data
                if d.get("significant_change") and abs(d.get("rate_change", 0)) > 3
            ]
            significant.sort(key=lambda x: abs(x.get("rate_change", 0)), reverse=True)
            if significant:
                drift_lines = [
                    f"| {d['model']} | {d['start_refusal_rate']:.1f}% | {d['end_refusal_rate']:.1f}% | {d['rate_change']:+.1f}% | {d['start_date']} → {d['end_date']} |"
                    for d in significant[:12]
                ]
                drift_context = (
                    "| Model | Start | End | Change | Period |\n"
                    "|---|---|---|---|---|\n" + "\n".join(drift_lines)
                )
            else:
                drift_context = "No statistically significant longitudinal drift detected in this period."

        # Consensus data
        consensus_context = ""
        consensus_path = os.path.join("web", "public", "consensus_stats.json")
        if os.path.exists(consensus_path):
            with open(consensus_path) as f:
                cons = json.load(f)
            total = cons.get("totalPrompts", 0)
            dist = {d["name"]: d["value"] for d in cons.get("distribution", [])}
            per_model = cons.get("perModel", [])
            # Best and worst aligned
            best = per_model[:5] if per_model else []
            worst = per_model[-5:] if per_model else []
            best_lines = [
                f"| {m['shortName']} | {m['agreementRate']:.1f}% | {m['kappa']:.3f} |"
                for m in best
            ]
            worst_lines = [
                f"| {m['shortName']} | {m['agreementRate']:.1f}% | {m['kappa']:.3f} |"
                for m in worst
            ]
            consensus_context = (
                f"Total multi-model prompts: {total}\n"
                f"Distribution: {json.dumps(dist)}\n\n"
                f"**Most aligned with majority:**\n"
                f"| Model | Agreement | κ |\n|---|---|---|\n"
                + "\n".join(best_lines)
                + "\n\n"
                "**Most divergent from majority:**\n"
                "| Model | Agreement | κ |\n|---|---|---|\n" + "\n".join(worst_lines)
            )

        # Summary stats
        summary_context = ""
        summary_path = os.path.join("web", "public", "summary_stats.json")
        if os.path.exists(summary_path):
            with open(summary_path) as f:
                summary = json.load(f)
            summary_context = (
                f"Total evaluations: {summary.get('totalEvaluations', 'N/A')}\n"
                f"Total unique test cases: {summary.get('totalCases', 'N/A')}\n"
                f"Models tested: {summary.get('modelsCount', 'N/A')}\n"
                f"Date range: {summary.get('dateRange', {}).get('start', '?')} to {summary.get('dateRange', {}).get('end', '?')}\n"
                f"Last updated: {summary.get('lastUpdated', '?')}\n"
                f"MDES (80% power): {summary.get('statisticalPowerMDES', 'N/A')}%\n"
                f"Prompt distribution: {json.dumps(summary.get('distribution', []))}"
            )

        # Spectrum data (for CI bands)
        spectrum_context = ""
        spectrum_path = os.path.join("web", "public", "spectrum_data.json")
        if os.path.exists(spectrum_path):
            with open(spectrum_path) as f:
                spectrum = json.load(f)
            spectrum_sorted = sorted(
                spectrum, key=lambda x: x.get("refusalRate", 0), reverse=True
            )
            top5 = spectrum_sorted[:5]
            bottom5 = spectrum_sorted[-5:]
            top_lines = [
                f"| {m['name']} | {m['refusalRate']}% | {m.get('refusalRateCILower','?')}–{m.get('refusalRateCIUpper','?')}% |"
                for m in top5
            ]
            bottom_lines = [
                f"| {m['name']} | {m['refusalRate']}% | {m.get('refusalRateCILower','?')}–{m.get('refusalRateCIUpper','?')}% |"
                for m in bottom5
            ]
            spectrum_context = (
                "**Most Restrictive (Top 5):**\n"
                "| Model | Refusal Rate | 95% CI |\n|---|---|---|\n"
                + "\n".join(top_lines)
                + "\n\n"
                "**Least Restrictive (Bottom 5):**\n"
                "| Model | Refusal Rate | 95% CI |\n|---|---|---|\n"
                + "\n".join(bottom_lines)
            )

        # --- 6. Compose the prompt ---
        today = date.today().isoformat()
        n_models = len(model_stats)
        total_evals = int(df.shape[0])

        prompt = f"""You are an expert AI Safety Researcher writing the "AI Analyst Report" for
moderationbias.com — a live benchmark dashboard that tracks content moderation behavior
across {n_models} large language models using {total_evals:,} evaluations.

Your audience is a mix of AI researchers, engineers, and policy analysts who want to
quickly understand the current state of LLM content moderation. The report should be
substantive, data-rich, and genuinely useful — not generic filler.

You have access to the following real benchmark data:

--- BENCHMARK OVERVIEW ---
{summary_context}

--- INTER-RATER RELIABILITY ---
Fleiss' Kappa: {kappa:.4f} ({kappa_interpretation})
This measures how consistently {n_models} models agree on content moderation across all prompts.

--- REFUSAL RATE SPECTRUM (with confidence intervals) ---
{spectrum_context}

--- ALL MODEL REFUSAL RATES ---
{model_table}

--- PHRASING ROBUSTNESS ---
{robustness_text}

--- TEMPORAL DRIFT (statistically significant changes over time) ---
{drift_context}

--- CROSS-MODEL CONSENSUS ---
{consensus_context}

--- NOTABLE DISAGREEMENTS (sample) ---
{top_disagreements if top_disagreements else "No notable disagreements in this batch."}

---

## YOUR TASK

Write a comprehensive, data-driven "AI Analyst Report" in clean Markdown. The report must
be genuinely useful to someone trying to understand the current state of LLM censorship.
Use the following structure:

## Executive Summary
A 3-4 bullet summary of the most important findings. Include hard numbers.

## The Censorship Spectrum
Organize models into tiers (High Restriction >80%, Moderate 30-80%, Low <5%).
Use markdown tables with the model name, refusal rate, and confidence interval.
Discuss what the spread between most and least restrictive models tells us.

## Temporal Drift — Are Models Getting More or Less Restrictive?
Use a markdown table showing the top 8-10 models with the largest statistically
significant drift. Discuss the overall trend — are models tightening or loosening?
Call out any models that moved against the trend.

## Consensus & Disagreement
Interpret the Fleiss' Kappa score. Use markdown tables showing the 5 most aligned
and 5 most divergent models. Discuss what the low/high agreement means practically.

## Category Analysis
Which categories have the widest model disagreement? Where do models agree most?
Discuss what this tells us about the boundaries of "safety".

## Statistical Power
Briefly state the MDES and what it means for the benchmark's ability to detect real differences.

## Methodology Notes
3-4 bullet points documenting the statistical methods used.

---

CRITICAL FORMATTING RULES:
- Use markdown tables for data. Never use inline data dumps.
- Use bold for emphasis on key numbers.
- Use > blockquotes for interpretive commentary.
- Include section headers exactly as specified above.
- Target 600-900 words total. Be concise but substantive.
- Use precise numbers from the data. Never fabricate statistics.
- Do NOT add a top-level title — the UI already provides one.
- Do NOT use emojis.
"""

        client = OpenAI(
            base_url="https://openrouter.ai/api/v1", api_key=settings.openrouter_api_key
        )

        response = client.chat.completions.create(
            model="openai/gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a precise, data-driven AI safety analyst who writes comprehensive research reports with tables, statistics, and clear interpretive commentary. Every claim must be backed by the data provided.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=4096,
        )

        report_content = response.choices[0].message.content

        # Prepend a metadata header (used by the UI to show generation date and stats)
        metadata_header = (
            f"<!-- generated:{today} kappa:{kappa:.4f} models:{n_models} -->\n\n"
        )
        final_output = metadata_header + report_content

        # Write output
        full_path = os.path.join(output_dir, report_file)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w") as f:
            f.write(final_output)

        logger.info(f"✅ Generated Analyst 4.0 Report: {full_path}")

    except Exception as e:
        logger.error(f"⚠️ Failed to generate analyst report: {e}")
        import traceback

        traceback.print_exc()
    finally:
        session.close()


if __name__ == "__main__":
    generate_weekly_report()
