# Moderation Bias: LLM Content Moderation Benchmark

> One row per **model evaluation of one prompt**. This dataset is the raw audit log
> behind [moderationbias.com](https://moderationbias.com) — an open, reproducible
> benchmark that measures how differently Large Language Models moderate the same
> content, and how those policies drift over time.

- **Homepage:** https://moderationbias.com
- **Repository:** https://github.com/jacobkandel/llm-content-moderation-analysis
- **Leaderboard:** https://moderationbias.com/leaderboard
- **Paper / Methodology:** https://moderationbias.com/methodology · [`METHODOLOGY.md`](https://github.com/jacobkandel/llm-content-moderation-analysis/blob/main/METHODOLOGY.md)
- **Datasheet:** [`DATASHEET.md`](https://github.com/jacobkandel/llm-content-moderation-analysis/blob/main/DATASHEET.md)
- **Point of contact:** Jacob Kandel ([ORCID 0009-0008-8858-6072](https://orcid.org/0009-0008-8858-6072))
- **DOI:** [10.5281/zenodo.20262255](https://doi.org/10.5281/zenodo.20262255)
- **License:** MIT

## Dataset Summary

Moderation Bias audits content-moderation behavior across **30 Large Language Models**,
**16 harm categories**, and **2,012 evaluated prompts** (2,323 in the corpus), with
biweekly automated re-runs that track policy drift. Each prompt is sent to every subject
model and its response is classified by a held-out LLM judge into a canonical verdict
(`ALLOWED` vs. a family of refusal labels). The result is a large, longitudinal panel of
moderation decisions suitable for measuring inter-model disagreement, over-refusal,
category-level bias, and drift.

**Headline finding:** model identity (Cramér's V = 0.66) is a substantially stronger
predictor of refusal than prompt topic (V = 0.20) — evidence of provider *policy
idiosyncrasy* rather than rational, content-based moderation.

## Supported Tasks

- **`text-classification`** — predict the moderation verdict (`ALLOWED` / refusal) for a
  prompt–response pair, or the finer `classification` label
  (`Authorized` / `Hard_Refusal` / `Soft_Censorship` / `False_Refusal`).
- **Model auditing / evaluation** — compare refusal rates and disagreement across models
  and categories; measure over-refusal against safe-prompt benchmarks (XSTest, OR-Bench).
- **Drift analysis** — track how a given model's verdicts change across audit dates.

## Languages

Primarily English (`en`). A dedicated `INTL` category and translated variants probe
cross-lingual moderation; those rows carry non-English prompt text.

## Dataset Structure

### Data Fields

One row per (model, prompt, run). Text columns are present in the full export and empty
in the `lite` export.

| Column | Type | Description |
| --- | --- | --- |
| `test_date` | date (YYYY-MM-DD) | Date the evaluation ran (longitudinal drift key). |
| `model` | string | Subject model id (e.g. `anthropic/claude-3.5-sonnet`). |
| `model_version` | string | Exact API version string (e.g. `gpt-4o-2024-11-20`). |
| `prompt_id` | string | Prompt identifier. Style variants share a base id (`<base>-V<n>`). |
| `category` | string | One of 16 harm categories (see METHODOLOGY §1.2). |
| `style` | string | Phrasing style of the variant. |
| `persona` | string | User-persona framing (`Default`; Authority/Layperson in the paternalism experiment). |
| `system_prompt` | string | Moderator system prompt used for the run. |
| `verdict` | string | Canonical verdict. Refusals: `REMOVED`, `REFUSAL`, `POLICY_REFUSAL`, `META_REFUSAL`, `BLOCKED`, `Hard Refusal`, `unsafe`. Allow: `ALLOWED`. Non-verdict: `ERROR` (excluded from all rates). See `src/refusal.py`. |
| `classification` | string | Finer taxonomy: `Authorized` / `Hard_Refusal` / `Soft_Censorship` / `False_Refusal`. |
| `prompt_text` | string | Full prompt sent to the model (empty in lite). |
| `response_text` | string | Model's raw response (empty in lite). |
| `prompt_tokens` | int | Prompt token count. |
| `completion_tokens` | int | Completion token count. |
| `total_tokens` | int | `prompt_tokens + completion_tokens`. |
| `run_cost` | float (USD) | Estimated call cost from per-token pricing. |
| `confidence` | float [0,1] | Judge confidence in the verdict. |
| `reasoning` | string | One-sentence judge rationale. |
| `expected_safe` | bool | Ground-truth "should be allowed" for safe-prompt benchmarks (e.g. XSTest). |
| `benchmark_source` | string | Prompt origin (`internal`, `xstest`, `orbench`, …). |

A **refusal rate** is `# refusals / # scorable rows`; `ERROR` rows are **excluded** from
the denominator. Repetitions/variants of a seed prompt are correlated — pairwise tests
collapse them to one majority verdict per (prompt, model).

### Splits

The dataset is published as a single consolidated table (no train/test split); it is an
audit log, not a supervised training set. Users constructing a classification task should
create their own splits and be mindful that variants of the same seed prompt are
correlated (split by base `prompt_id`, not by row).

## Dataset Creation

### Curation Rationale

Public moderation benchmarks tend to measure whether a model refuses *unsafe* content.
This benchmark instead measures **disagreement and over-refusal**: where models diverge on
identical prompts, and where safe prompts are wrongly refused. Prompts are stratified
across 16 harm categories and paired with safe-prompt controls to separate genuine safety
behavior from paternalistic over-restriction.

### Source Data

Prompts combine an internally authored corpus with items drawn from established
safe-prompt / over-refusal benchmarks (e.g. **XSTest**, **OR-Bench**); `benchmark_source`
records each prompt's origin. Responses are generated live via the OpenRouter API across
the subject-model registry.

### Annotations (verdicts)

Verdicts are produced by an **LLM-as-judge** that is **held out** of the subject pool to
avoid self-preference bias (see METHODOLOGY §2.2). Judge dependence is bounded with a
**multi-judge robustness harness** that re-classifies a stratified sample with several
alternative judge models and reports cross-judge agreement and the verdict flip rate.
Verdicts reflect LLM-judge consensus, not human ground truth — a stated scope
limitation of this benchmark.

### Personal and Sensitive Information

Prompts are synthetic or drawn from public benchmarks and are **not** about real
individuals. Prompt/response text may
contain descriptions of sensitive or harmful *topics* by design (this is a harm-category
benchmark); it contains no real user PII.

## Considerations for Using the Data

### Social Impact & Intended Use

Intended for **research and auditing** of moderation policy — transparency into how
commercial models restrict content. It is **not** a training target for making models more
or less restrictive, and refusal ≠ "correct" moderation.

### Known Limitations & Biases

- **Judge dependence.** Verdicts reflect a single LLM judge's labeling; the human-alignment
  and multi-judge robustness checks quantify but do not eliminate this. See
  [`LIMITATIONS.md`](https://github.com/jacobkandel/llm-content-moderation-analysis/blob/main/LIMITATIONS.md).
- **Corpus scope.** English-dominant; the harm taxonomy and prompt selection encode the
  authors' framing of "moderation-relevant" content.
- **Correlated rows.** Variants/repetitions of a seed prompt are not independent.
- **Provider/version drift.** `model`/`model_version` behavior changes over time; always
  condition on `test_date` for longitudinal claims.

## Additional Information

### Licensing

Released under the **MIT License**.

### Citation

```bibtex
@software{kandel_moderation_bias,
  author  = {Kandel, Jacob},
  title   = {Moderation Bias: LLM Content Moderation Benchmark},
  url     = {https://moderationbias.com},
  doi     = {10.5281/zenodo.20262255},
  version = {2.1.0},
  year    = {2026}
}
```

### Contributions

Issues and contributions welcome at the
[GitHub repository](https://github.com/jacobkandel/llm-content-moderation-analysis).
This card is generated from the repo's datasheet and data dictionary; the dataset itself
is refreshed by the biweekly audit pipeline.
