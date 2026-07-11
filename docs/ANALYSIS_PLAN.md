# Analysis Plan — Moderation Bias Benchmark

**Status:** living pre-specification. **Version:** 1.0 · **Last revised:** 2026-07-10
**Maintainer:** Jacob Kandel ([ORCID 0009-0008-8858-6072](https://orcid.org/0009-0008-8858-6072))

This document specifies, *ahead of interpretation*, the hypotheses, outcomes,
estimators, corrections, and exclusion rules for the benchmark. It exists so that
reported findings are confirmatory tests of pre-stated questions rather than
post-hoc pattern-fitting. Deviations are logged in §8. It complements
[`METHODOLOGY.md`](../METHODOLOGY.md) (how the data is produced) and
[`LIMITATIONS.md`](../LIMITATIONS.md) (what the results cannot support).

---

## 1. Objective

Quantify **how differently LLMs moderate identical content**, how much of that
variation is attributable to the *model* versus the *topic*, whether models
over-refuse demonstrably safe prompts, and how these behaviors **drift** over time.
The benchmark is descriptive/auditing, not causal: we do not claim to identify *why*
a provider set a policy, only to measure the resulting behavior.

## 2. Units, Population, and Sampling

- **Observation unit:** one (model, prompt, run) triple → one canonical verdict.
- **Prompt corpus:** 2,323 prompts across 16 harm categories; 2,012 evaluated per
  standard cycle. Prompts combine an internally authored set with items from public
  safe-prompt/over-refusal benchmarks (XSTest, OR-Bench); origin is recorded in
  `benchmark_source`.
- **Model pool:** the subject-model registry (~30 models). One model is **held out**
  as the LLM judge and **excluded from the subject pool** (§5).
- **Sampling frame:** the corpus is a fixed, curated instrument, not a random sample
  of "all possible prompts." Inferences generalize to *this instrument*; external
  validity to arbitrary content is a stated limitation, not a claim.

## 3. Primary Hypotheses (confirmatory)

- **H1 — Model identity dominates topic.** The association between *model* and
  *verdict* (Cramér's V) exceeds the association between *category* and *verdict*.
  *Estimator:* Cramér's V on the model×verdict and category×verdict contingency
  tables. *Decision:* report both with bootstrap CIs; H1 supported if the V
  intervals are separated with model > category.
- **H2 — Models disagree beyond chance on identical prompts.** Inter-model agreement
  (Fleiss' κ) is below the "substantial" threshold (κ < 0.6), i.e. moderation is not
  a solved, convergent function. *Estimator:* Fleiss' κ across models on shared
  prompts.
- **H3 — Pairwise policy differences are real.** For model pairs, refusal-rate
  differences on the paired prompt set are statistically significant after multiple-
  comparison correction. *Estimator:* McNemar's test (continuity-corrected) per pair;
  see §6.

## 4. Secondary / Exploratory Outcomes

- **Over-refusal:** refusal rate on `expected_safe = true` prompts, per model
  (false-refusal rate). Lower is better; reported with Wilson CIs.
- **Soft censorship:** rate of `Soft_Censorship` classifications (hedging/partial
  refusal) vs. hard refusal.
- **Drift:** change in a model's category refusal rates across `test_date`, conditioned
  on `model_version`.
- **Criterion validity (human alignment):** Cohen's κ between the human-annotation
  consensus and each model's verdict, and human-vs-judge agreement (see
  METHODOLOGY §2.3, §3.8). Exploratory and **preliminary** until the annotated
  sample reaches n ≥ 30 consensus items (target n ≥ 200 for publication-grade IAA).
- **Paternalism experiment:** effect of user-persona framing (Authority vs.
  Layperson) on refusal, holding prompt constant.

These are explicitly labeled exploratory; they generate hypotheses for future
confirmatory cycles rather than testing pre-registered ones.

## 5. Judge Independence

Verdicts are assigned by an LLM-as-judge (`src/judge_config.py`, `JUDGE_MODEL`). To
avoid self-preference bias, the judge model is **removed from the subject pool** and
never scores its own outputs. Judge dependence is the benchmark's largest construct-
validity risk; it is quantified (not eliminated) by the human-alignment check (§4) and
the multi-judge robustness harness, and is disclosed in LIMITATIONS.

## 6. Statistical Tests and Corrections (pre-specified)

| Question | Test | Correction |
| --- | --- | --- |
| Pairwise refusal difference (paired) | McNemar's χ² with continuity correction | Benjamini–Hochberg FDR across all *k(k−1)/2* pairs; **Holm–Bonferroni** reported as a sensitivity analysis |
| Single-proportion refusal rate | Wilson score 95% CI | — |
| Two-model rate difference (unpaired) | Two-proportion z-test | BH-FDR |
| Inter-model agreement | Fleiss' κ | — |
| Human inter-annotator agreement | Krippendorff's α (nominal) | — |
| Human ↔ model / judge agreement | Cohen's κ | — |
| Effect size (rate gap) | Cohen's h | — |
| Categorical association | Cramér's V (+ bootstrap CI) | — |

- **Significance threshold:** BH-adjusted *p* < 0.05.
- **Effect-size reporting:** every significant test is accompanied by an effect size;
  significance without a reported effect size is not treated as a finding.
- **Power / MDES:** minimum detectable effect size at α = 0.05, 80% power is reported;
  the evaluated set (≈2,012) exceeds the N ≈ 314 needed for a 5% MDES by >6×.

## 7. Inclusion / Exclusion Rules (pre-specified)

1. **`ERROR` verdicts are excluded** from all rate numerators and denominators
   (unscorable; canonical set in `src/refusal.py`). Error rates are disclosed
   separately.
2. **Non-functional models are excluded** from the leaderboard and pairwise tests:
   `error_rate > 0.8` **or** `scorable < 50` rows.
3. **The judge model is excluded** from the subject pool (§5).
4. **Minimum cell size:** a model×category refusal rate is reported only for cells
   with **n ≥ 30** scorable rows.
5. **Correlated variants:** repetitions/style variants of a seed prompt are collapsed
   to **one majority verdict per (prompt, model)** before paired tests, so correlated
   rows are not counted as independent evidence.
6. **Consensus ties dropped:** a human-annotated prompt split evenly ALLOW/REMOVE has
   no consensus and is excluded from criterion-validity computations.

## 8. Deviations Log

Material changes to this plan after data are observed are recorded here with date and
rationale, so readers can distinguish pre-specified from adapted analyses.

- *2026-07-10* — Initial version formalizing the analysis already implemented in
  `src/analysis/*` and `scripts/*`. The **political-compass** construct is withdrawn
  from confirmatory analysis pending revalidation and is disabled on the site (see
  METHODOLOGY §3.6); any future re-enablement will be logged here.

## 9. Reproducibility

All estimators are implemented in-repo (`src/analysis/`, `scripts/`, and the frontend
`web/app/analysis/stats.ts`), and `reproduce_results.py` recomputes published refusal
rates from the raw log for verification. Each audit cycle re-runs the full pipeline and
republishes the dataset (Zenodo DOI + Hugging Face). See METHODOLOGY §4.
