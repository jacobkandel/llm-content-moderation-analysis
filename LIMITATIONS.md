# Limitations & Ethical Considerations

## 1. Judge Bias and Recursive Evaluation
Verdict classification is performed by an LLM classifier (the "judge"). The judge must not be one of the benchmark subjects, or it evaluates a share of its own responses — a **self-preference confound** where the instrument sits partly in the dock. The pipeline now enforces this: the judge is set via the `JUDGE_MODEL` env var (default `openai/gpt-4o-mini`) and is **excluded from the reported subject pool** (`src/judge_config.py`), so it never grades itself. Because the classifier judges a single (prompt, response) pair, there is no A/B ordering to swap, so position-swapping does not apply here (it is used only in the separate pairwise *preference* judge for strategy experiments).

**Provenance caveat for the currently-published data:** those results were classified by `google/gemini-2.0-flash-001`, which was itself a subject at the time, so `gemini-2.0-flash` results specifically carry the self-preference confound. The held-out-judge configuration takes effect on the next full audit re-run, which will re-classify responses with an out-of-pool judge; a human-adjudicated validation subset (via the public annotation interface) remains the longer-term cross-check.

## 2. Stochasticity
LLM outputs are inherently non-deterministic. Although we conducted audits with `N=5` variants per prompt and set `temperature=0.0` for deterministic reproducibility, edge cases of transient refusals may persist due to non-determinism in model serving infrastructure.

## 3. Scope of Modality
This instrument evaluates **text-only** inputs and outputs. Multimodal safety filters (e.g., image generation refusal) are outside the scope of this work.

## 4. Benchmark Validity
The "Sensitive Topics" dataset is curated based on Western/US-centric political and cultural norms. Results may not generalize to other cultural contexts or value systems.

## 5. Data Completeness and Label Noise
Roughly **37% of raw evaluation rows are `ERROR`** (provider timeouts, rate limits, content-filter blocks, malformed responses) and are excluded from all downstream statistics — but this figure is **highly concentrated, not systematic**. About 86% of all errors come from just eight non-functioning model integrations that fail ~99% of the time: three are already blocklisted (`mistral-medium`, `yi-34b`, `gpt-audio`), and the rest are heavily rate-limited OpenRouter `:free`-tier endpoints (`llama-3.3-70b:free`, `gemma-3-27b:free`, etc.) that rarely return a response. The frontier models that carry the headline findings (Claude, GPT, Gemini, Qwen) error at a far more reasonable **~5–12%**. Those eight endpoints produce essentially no usable data and are candidates for removal from the model registry; doing so would drop the overall error rate to single digits.

In addition, a small number of rows carry corrupted verdict labels (e.g. `REMOLVED`, `REMVED`) produced when the classifier returns malformed output. These are now normalized where recognizable (synonyms, unicode look-alikes, and near-miss typos are mapped to the canonical verdict; see `src/refusal.py::normalize_verdict`) and otherwise dropped. Because errors are not strictly missing-at-random, reported refusal rates are conditional on a successful evaluation; per-model effective sample sizes should be read alongside the headline counts.

## 6. Statistical Refinements In Progress
Three refinements are known and disclosed rather than silently glossed:

- **Clustered confidence intervals.** Each seed prompt is evaluated as several correlated repetitions/style variants. The Wilson intervals on refusal rates currently treat those repetitions as independent trials, which understates the true interval width (the effective sample size is closer to the number of distinct *seed* prompts than the number of *rows*). Reported CIs should be read as lower bounds on uncertainty until a design-effect / cluster-robust correction is applied. Pairwise McNemar tests already mitigate this by collapsing repetitions to one majority verdict per (prompt, model) before testing.
- **Longitudinal drift comparability.** The drift test compares a model's earliest vs. latest audit date; if the prompt mix differs between those dates, part of a measured "drift" could reflect composition rather than genuine policy change. Per-model drift p-values are now Benjamini-Hochberg FDR-corrected across the family of models, but a prompt-matched start/end comparison is the intended stronger design.
- **Category effect size granularity.** Category-vs-Verdict Cramér's V is computed on a binary refuse/not-refuse table (consistent with the Model-vs-Verdict figure) rather than the full multi-class verdict table; the finer-grained version is a planned addition.
