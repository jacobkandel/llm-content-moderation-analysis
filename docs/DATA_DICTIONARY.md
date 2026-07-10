# Data Dictionary — `audit_log.csv`

One row per model evaluation of one prompt. The raw (full) log is published as
`audit_log.csv.gz`; a smaller `audit_log_lite.csv.gz` drops the text columns.

| Column | Type | Description |
| --- | --- | --- |
| `test_date` | date (YYYY-MM-DD) | Date the evaluation ran. Used for longitudinal drift. |
| `model` | string | Subject model id (e.g. `anthropic/claude-3.5-sonnet`). |
| `model_version` | string | Exact version string returned by the API (e.g. `gpt-4o-2024-11-20`) for drift attribution. |
| `prompt_id` | string | Prompt identifier. Style variants share a base id (`<base>-V<n>`). |
| `category` | string | One of the 16 harm categories (see METHODOLOGY §1.2). |
| `style` | string | Phrasing style of the variant (`Original`/`Direct` or a rewrite style). |
| `persona` | string | User persona framing (`Default`; Authority/Layperson for the paternalism experiment). |
| `system_prompt` | string | The moderator system prompt used for this run. |
| `verdict` | string | Canonical verdict. Refusals: `REMOVED`, `REFUSAL`, `POLICY_REFUSAL`, `META_REFUSAL`, `BLOCKED`, `Hard Refusal`, `unsafe`. Allow: `ALLOWED`. Non-verdict: `ERROR` (excluded from all rates; carries a structured `ERROR[cause]` in `response_text`). See `src/refusal.py`. |
| `classification` | string | Finer taxonomy label from the classifier (`Authorized`/`Hard_Refusal`/`Soft_Censorship`/`False_Refusal`). |
| `prompt_text` | string | The full prompt sent to the model (empty in the lite file). |
| `response_text` | string | The model's raw response (empty in the lite file). |
| `prompt_tokens` | int | Prompt token count. |
| `completion_tokens` | int | Completion token count. |
| `total_tokens` | int | `prompt_tokens + completion_tokens`. |
| `run_cost` | float (USD) | Estimated cost of the call from the model's per-token pricing. |
| `confidence` | float [0,1] | Classifier confidence in the verdict (when produced by the LLM judge). |
| `reasoning` | string | One-sentence classifier rationale. |
| `expected_safe` | bool | For benchmark prompts (e.g. XSTest): ground-truth "this should be allowed". |
| `benchmark_source` | string | Origin of the prompt (`internal`, `xstest`, `orbench`, …). |

## Notes
- A "refusal rate" is `# refusals / # scorable rows` (ERROR rows are **excluded** from
  the denominator).
- Repetitions/variants of the same seed prompt are correlated; pairwise tests collapse
  them to one majority verdict per (prompt, model). See LIMITATIONS §6.
