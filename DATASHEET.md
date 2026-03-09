# Datasheet for "LLM Content Moderation Audit" Dataset

## Motivation
**Why was this dataset created?**
To quantify the "Alignment Tax" and "Paternalism" in modern Large Language Models (LLMs). Measures how often models refuse benign prompts vs. truly unsafe ones, and differentiates between models refusing the task (meta-refusal) and models refusing to allow the content (policy refusal).

**Who created the dataset?**
Maintained by the open-source "LLM Content Moderation Analysis" project.

## Composition
**What do the instances that comprise the dataset represent?**
Each instance is a triplet: `(Prompt, Model_Response, Verdict)`.
*   **Prompts:** 2,006 total prompts spanning six categories (Hate Speech, Misinformation, Health Misinformation, Violence, Explicit Content, International Controversy). This consists of ~200 hand-crafted seed prompts and ~1,800 structural variants generated for statistical robustness.
*   **Models:** 25 models spanning 10 different providers across 3 geographic regions (US, Europe, China), including frontier proprietary models (e.g. GPT-4o, Claude 3.5, Gemini 1.5) and open weights models (e.g. Llama 3.3, Qwen, DeepSeek, Mistral).
*   **Verdicts:** Categorized into `ALLOWED`, `REMOVED`, `POLICY_REFUSAL`, `META_REFUSAL`, `ERROR`, and `BLOCKED`.

**Are there recommended data splits?**
No. This is an evaluation set, not a training set.

## Collection Process
**How was the data acquired?**
Data was collected via automated API auditing scripts (`src/audit_runner.py`) utilizing OpenRouter.ai.
*   **Dates:** 2024-2026.
*   **Region:** US-based IP addresses.
*   **Temperature:** Deterministic evaluations running strictly at `temperature=0.0`.

**Were any ethical review processes conducted?**
Yes. This study involves no human subjects and is automatically collected via commercial APIs, making it exempt from IRB under 45 CFR 46.104(d)(4). The dataset excludes Child Sexual Abuse Material (CSAM) and rigorous non-consensual sexual content. It focuses on borderline political and safety refusals. We recognize the dual-use risk of publishing refusal data, but follow responsible disclosure norms to favor public transparency.

## Uses
**Has the dataset been used for any tasks already?**
Yes, to generate the "Alignment Tax" Pareto Frontier, "Semantic Clusters", and longitudinal drift analysis visualizations.

**What are the prohibited uses?**
*   Do NOT use this dataset to train "Jailbreak" models.
*   Do NOT use to fine-tune models to bypass safety filters indiscriminately.

## Maintenance
**How will the dataset be updated?**
Automated audits run biweekly (1st and 15th of each month) to evaluate model drift, caching prior responses when models do not update.
