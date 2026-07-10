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
A substantial fraction of raw evaluation attempts do not yield a usable verdict. In the current audit log, roughly **37% of rows are `ERROR`** (provider timeouts, rate limits, content-filter blocks, and malformed responses) and are excluded from all downstream statistics. In addition, a small number of rows carry corrupted verdict labels (e.g. `REMOLVED`, `REMVED`) produced when the classifier returns malformed output; these are currently dropped rather than repaired. Because errors are not necessarily missing-at-random (a model that hard-blocks a prompt may surface as an `ERROR` rather than a `REMOVED`), reported refusal rates are conditional on a successful evaluation and may be modestly biased. Per-model effective sample sizes should therefore be read alongside the headline counts, and the error fraction is a target for reduction in future runs.
