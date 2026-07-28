# Ethics & Responsible Use

**Version:** 2.0 · **Last revised:** 2026-07-27
**Contact:** Jacob Kandel ([ORCID 0009-0008-8858-6072](https://orcid.org/0009-0008-8858-6072))

This note states how the Moderation Bias benchmark handles sensitive content, privacy,
and the dual-use nature of moderation research. It accompanies
[`METHODOLOGY.md`](../METHODOLOGY.md), [`LIMITATIONS.md`](../LIMITATIONS.md), and
[`DATASHEET.md`](../DATASHEET.md).

> **Change note (v2.0, 2026-07-27):** an earlier version of the project ran a
> crowdsourced human-annotation campaign; that component has been discontinued
> (see the Analysis Plan §8 deviations log). The project now involves **no human
> participants** of any kind.

---

## 1. Research Purpose

The project audits **how AI systems moderate content** to improve transparency and
inform safety research. It measures model behavior on a fixed prompt instrument via
fully automated pipelines.

## 2. No Human Subjects

The entire pipeline is automated: prompts are sent to commercial AI systems through
their public APIs, and responses are classified by LLM judges. No human participants
are recruited, no data is collected *about* any person, and site visitors are not
tracked beyond standard, aggregate, privacy-preserving analytics. There is therefore
no human-subjects component requiring consent or ethics-board review.

## 3. Sensitive Content

Prompts span 16 harm categories by design — the corpus probes *moderation of topics*,
so prompt and response text may reference violence, self-harm, hate, sexual content,
or other distressing themes. The corpus does **not** contain actual illegal material
(e.g. CSAM), real targeted harassment of private individuals, or operational
instructions that would themselves cause harm.

## 4. Privacy & Data Handling

- **No PII** is embedded in the prompt corpus: prompts are synthetic or drawn from
  public benchmarks and are not about real individuals.
- The raw audit log and aggregated statistics are published openly (site, Hugging
  Face, Zenodo) under the MIT license. Because no personal data is present,
  publication exposes no one.

## 5. Fair Treatment of Evaluated Models

- Results describe **observed behavior**, not provider intent; the project does not
  claim to know *why* a policy exists, only its measurable effect (Analysis Plan §1).
- Models are evaluated through their public APIs under their terms of service; no
  private or leaked systems are probed.
- The held-out-judge design and the multi-judge robustness harness exist specifically
  to avoid unfairly advantaging or penalizing any single model family via judge
  self-preference, and the benchmark scopes its claims to *LLM-judge consensus*
  rather than human ground truth (see LIMITATIONS §1).

## 6. Dual-Use & Responsible Use

A moderation benchmark inevitably reveals *where* models refuse or allow content.
This information is published to enable **auditing, accountability, and research** —
the same transparency that lets a provider identify over-refusal lets the public
scrutinize policy.

Intended uses: research, model evaluation, policy analysis, education.
Out-of-scope uses: engineering prompts to defeat safety systems, generating harmful
content, or targeting individuals. The dataset deliberately excludes operational
harmful instructions so that it functions as a *policy* probe rather than an attack
toolkit.

## 7. Reporting Concerns

To report an ethical concern or a privacy issue, open an issue on the
[GitHub repository](https://github.com/jacobkandel/llm-content-moderation-analysis)
or contact the maintainer via the ORCID profile above.
