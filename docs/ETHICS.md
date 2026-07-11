# Ethics, Consent & Responsible Use

**Version:** 1.0 · **Last revised:** 2026-07-10
**Contact:** Jacob Kandel ([ORCID 0009-0008-8858-6072](https://orcid.org/0009-0008-8858-6072))

This note states how the Moderation Bias benchmark handles human participants,
sensitive content, privacy, and the dual-use nature of moderation research. It
accompanies [`METHODOLOGY.md`](../METHODOLOGY.md), [`LIMITATIONS.md`](../LIMITATIONS.md),
and [`DATASHEET.md`](../DATASHEET.md).

---

## 1. Research Purpose

The project audits **how AI systems moderate content** to improve transparency and
inform safety research. It measures model behavior on a fixed prompt instrument; it does
not study, profile, or collect data *about* the humans who volunteer to annotate.

## 2. Human Annotation — Consent Model

Annotation at [moderationbias.com/annotate](https://moderationbias.com/annotate) is:

- **Voluntary and unpaid.** Anyone may contribute; no account, login, or personal
  details are required, and a participant may stop at any time by leaving the page.
- **Anonymous by construction.** Each annotator is assigned a **random identifier stored
  only in their own browser's `localStorage`**. It is not derived from any personal
  attribute, is not linked to an email/IP/identity, and cannot re-identify a person.
- **Transparent about use.** The interface discloses that annotations are stored
  anonymously and aggregated into inter-annotator-agreement statistics
  (Krippendorff's α) and human ↔ model alignment. Contributing constitutes informed,
  implied consent to this stated research use.
- **Minimal in what it records.** A submission carries only: the item id, the
  ALLOW/REMOVE verdict, the content category, a coarse time-on-task, and the anonymous
  annotator id. No free text about the annotator, no device fingerprint, no tracking.

### Human-subjects status

Because the activity collects **judgements about AI outputs**, not identifiable private
information about the annotators, it is low-risk and does not gather data that would
identify participants. This is a good-faith self-assessment, **not** a formal IRB/ethics-
board determination. Researchers reusing this data under an institution that requires
board review should seek their own determination; the anonymized, non-identifiable design
is intended to support an exempt/low-risk classification but does not substitute for it.

## 3. Sensitive Content Warning

Prompts span 16 harm categories, and annotators view AI responses that may reference
violence, self-harm, hate, sexual content, or other distressing topics. This is disclosed
so participation is a genuine, informed choice; annotators should not proceed if such
material may affect them. The corpus is designed to probe *moderation of topics* — it does
**not** contain actual illegal material (e.g. CSAM), real targeted harassment of private
individuals, or operational instructions that would themselves cause harm.

## 4. Privacy & Data Handling

- **No PII is collected** from annotators or embedded in the prompt corpus (prompts are
  synthetic or drawn from public benchmarks and are not about real individuals).
- Annotation records are stored in Vercel Blob keyed by the anonymous id; the identifier
  is sanitized before use in any storage path.
- Aggregated statistics and the raw audit log are published openly (site, Hugging Face,
  Zenodo) under the MIT license. Because no personal data is present, publication does not
  expose participant information.

## 5. Fair Treatment of Evaluated Models

- Results describe **observed behavior**, not provider intent; the project does not claim
  to know *why* a policy exists, only its measurable effect (see the Analysis Plan §1).
- Models are evaluated through their public APIs under their terms of service; no private
  or leaked systems are probed.
- The held-out-judge design and human-alignment checks exist specifically to avoid
  unfairly advantaging or penalizing any single model family via judge self-preference.

## 6. Dual-Use & Responsible Use

A moderation benchmark inevitably reveals *where* models refuse or allow content. This
information is published to enable **auditing, accountability, and research** — the same
transparency that lets a provider identify over-refusal lets the public scrutinize policy.

Intended uses: research, model evaluation, policy analysis, education.
Out-of-scope uses: engineering prompts to defeat safety systems, generating harmful
content, or targeting individuals. The dataset deliberately excludes operational harmful
instructions so that it functions as a *policy* probe rather than an attack toolkit.

## 7. Reporting Concerns

To report an ethical concern, a privacy issue, or a request regarding contributed
annotations, open an issue on the
[GitHub repository](https://github.com/jacobkandel/llm-content-moderation-analysis) or
contact the maintainer via the ORCID profile above.
