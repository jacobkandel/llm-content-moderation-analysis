<!-- generated:2026-04-01 kappa:0.1143 models:27 -->
# AI Analyst Report — April 2026

## Executive Summary

This report synthesizes findings from **176,656 evaluations** across **27 large language models**, tested against **2,012 unique prompts** spanning 15 sensitive content categories. Data was collected over **16 audit runs** from January 16 to April 1, 2026.

**Key findings:**
- A massive **86% of test cases** are flagged as unsafe by the majority of models, revealing an industry-wide bias toward over-restriction.
- Most major models have become **significantly more restrictive** over the study period — GPT-4o's refusal rate jumped from 48% to 87%.
- Inter-rater reliability remains **slight** (Fleiss' κ = 0.114), meaning models frequently disagree with each other about what constitutes harmful content.
- Open-weight models on free tiers (Llama 3.3, Gemma 3, Hermes 3) are dramatically more permissive, refusing under 2% of prompts.

---

## The Censorship Spectrum

Models cluster into three distinct tiers based on their overall refusal rates:

### 🔴 High Restriction (>80% refusal)
| Model | Refusal Rate | 95% CI |
|---|---|---|
| Qwen 2.5 7B | 88.8% | 88.0–89.5% |
| Gemini 2.0 Flash Lite | 87.0% | 86.2–87.7% |
| Claude 3 Haiku | 85.8% | 85.0–86.6% |
| GPT-4o Mini | 84.4% | 83.5–85.2% |
| Qwen Plus | 83.1% | 81.6–84.4% |

### 🟡 Moderate Restriction (30–80%)
GPT-4o (78.6%), Claude 3.5 Sonnet (57.7%), Claude Haiku 4.5 (55.5%), Gemini 2.0 Flash (52.7%), and DeepSeek Chat (48.3%) fall in this range, though several are trending sharply upward.

### 🟢 Low Restriction (<5%)
| Model | Refusal Rate | 95% CI |
|---|---|---|
| Hermes 3 Llama 405B | 1.7% | 1.4–2.1% |
| Llama 3.3 70B | 1.0% | 0.8–1.3% |
| Gemma 3 27B | 1.0% | 0.7–1.2% |
| Mistral Small 3.1 24B | 0.8% | 0.6–1.1% |
| Dolphin Mistral 24B | 0.5% | 0.4–0.7% |

> **Interpretation**: The gap between the most and least restrictive models is staggering — Qwen 2.5 7B refuses nearly 89% of prompts while Dolphin Mistral refuses under 1%. The same prompts, radically different outcomes.

---

## Temporal Drift — Models Are Getting More Restrictive

The most striking finding is the **universal upward drift** in refusal rates among major commercial models. Every major API provider has tightened moderation over the 11-week study period:

| Model | Jan 2026 | Apr 2026 | Change | Significant? |
|---|---|---|---|---|
| DeepSeek Chat | 54.1% | 97.3% | **+43.2%** | ✅ p < 0.001 |
| Claude 3.5 Sonnet | 34.9% | 75.2% | **+40.3%** | ✅ p < 0.001 |
| GPT-4o | 48.4% | 87.2% | **+38.8%** | ✅ p < 0.001 |
| Claude 3 Haiku | 58.1% | 93.4% | **+35.4%** | ✅ p < 0.001 |
| Mistral Large | 63.2% | 97.5% | **+34.3%** | ✅ p < 0.001 |
| Claude 3.5 Haiku | 60.6% | 94.4% | **+33.7%** | ✅ p < 0.001 |
| Qwen Plus | 62.6% | 93.3% | **+30.7%** | ✅ p < 0.001 |
| GPT-4o Mini | 61.9% | 90.8% | **+28.8%** | ✅ p < 0.001 |
| Gemini 2.0 Flash | 52.3% | 75.7% | **+23.4%** | ✅ p < 0.001 |

**Notable exception**: Qwen 2.5 Coder 7B moved sharply **in the opposite direction**, dropping from 66.4% to 8.6% refusal (−57.8%), suggesting a deliberate policy change or model update at Alibaba Cloud.

> **Implication**: If this trend continues at the current rate, most commercial models will approach 95%+ refusal rates by mid-2026, effectively refusing to engage with nearly all content that touches sensitive topics — including legitimate research, education, and creative use cases.

---

## Consensus & Disagreement

**Fleiss' Kappa = 0.114** (Slight Agreement) — models agree only marginally better than random chance. This low inter-rater reliability reveals that "safety" remains highly subjective across model providers.

### Most Aligned with Majority
| Model | Agreement Rate | Cohen's κ |
|---|---|---|
| Mistral Small 24B | 92.6% | 0.727 |
| Ministral 14B | 91.7% | 0.687 |
| GPT-4o | 91.2% | 0.673 |
| Qwen Plus | 91.5% | 0.623 |
| GPT-4o Mini | 90.7% | 0.577 |

### Most Divergent from Majority
| Model | Agreement Rate | Cohen's κ |
|---|---|---|
| Dolphin Mistral 24B | 17.8% | 0.001 |
| Llama 3.3 70B | 17.7% | 0.000 |
| Gemma 3 27B | 17.6% | 0.001 |
| Hermes 3 405B | 17.6% | 0.000 |
| Mistral Small 3.1 | 17.5% | −0.002 |

> **Interpretation**: The most divergent models are almost always the open-weight/uncensored variants. Their near-zero kappa means they have effectively no correlation with the commercial model consensus.

---

## Category Analysis

The widest model disagreements occur in categories where harmful intent is most ambiguous:

- **False Positive Controls** (safe prompts designed to test over-blocking): Spread of 43%. Qwen 2.5 Coder incorrectly flags 43% of provably safe content. Most open models correctly pass 100%.
- **Misinformation** (83% spread) and **Hate Speech** (91% spread): Unclear boundary between discussing controversial topics and endorsing them.
- **Explicit/Sexual** content: 86% spread — highly dependent on provider values.
- **Crime, Cybersecurity, Self-Harm**: Near-100% spread — commercial models universally refuse while open models universally allow.

---

## Statistical Power

With 2,012 test cases evaluated across 27 models, the benchmark achieves a **Minimum Detectable Effect Size (MDES) of 1.98%** at 80% power (α = 0.05). This means differences in refusal rates as small as ~2 percentage points can be detected as statistically significant.

---

## Methodology Notes

- Prompts include hand-written edge cases, template-generated variants, boundary tests, false positive controls, and style/persona augmentations
- Verdicts are classified as REFUSAL, REMOVED, ALLOWED, or SAFE based on model output analysis
- Wilson Score intervals are used for all confidence intervals
- McNemar's test with Benjamini-Hochberg FDR correction is used for pairwise significance
- Temporal drift is assessed using first-vs-last-period comparison with chi-squared tests