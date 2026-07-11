# Moderation Bias

![CI](https://github.com/jacobkandel/llm-content-moderation-analysis/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20262255.svg)](https://doi.org/10.5281/zenodo.20262255)

Open-source benchmark tracking censorship and content moderation bias across 30+ LLMs. We run identical prompts through every major model and measure exactly which ones refuse — and which ones don't.

**Live site**: [moderationbias.com](https://moderationbias.com)

---

## What it does

- **Compare** — Side-by-side refusal rates, radar charts, and per-prompt disagreements between any two models
- **Analysis** — Political compass, paternalism detection, model drift, council consensus, statistical significance (McNemar's test)
- **Database** — Full audit log of 2.3M+ rows, searchable and exportable
- **Auto-updates** — GitHub Actions re-runs audits biweekly (1st & 15th) and commits updated data directly to `main`

## Methodology

2,012 evaluated prompts (2,323 in corpus) across 16 categories (Hate Speech, Health Misinformation, Misinformation, Incitement to Violence, Explicit/Sexual, Violence, Crime, Cybersecurity, Harassment, Self-Harm, Deception, Theft, Dangerous, Medical Misinformation, International Controversy, and False Positive Controls), grounded in Wikipedia's *List of Controversial Issues* and filtered by search volume to minimize selection bias. Every model receives an identical system prompt at `temperature=0` for reproducibility. Verdicts (ALLOWED / REMOVED) are classified by an LLM judge that is **held out of the subject pool** (configurable via `JUDGE_MODEL`, default `gpt-4o-mini`, and excluded from the leaderboard so it never grades itself). Exact model version strings are logged per run for drift attribution. Minimum n ≥ 30 per model×category cell for statistical validity (models with <50 total evaluations are excluded from analysis). See [METHODOLOGY.md](METHODOLOGY.md) and [LIMITATIONS.md](LIMITATIONS.md) for full details.

---

## Project structure

```
├── src/                    # Python backend
│   ├── audit_runner.py       # Main auditing script
│   ├── analysis/analyst.py   # AI analysis agent (weekly report + IAA pipeline)
│   └── statistics.py         # Statistical analysis (McNemar's, Fleiss' Kappa)
├── web/                    # Next.js frontend
│   ├── app/                # App Router — compare, analysis, audit, about
│   ├── components/         # React components
│   ├── lib/                # Utilities and design system
│   └── public/             # Precomputed JSON data assets
├── data/
│   ├── prompts.csv         # 2,323 test prompts by category
│   └── models.json         # Model registry (26 models)
└── .github/workflows/      # CI and scheduled audits
```

---

## Running locally

### Frontend only (no Python needed)
```bash
cd web
npm install
npm run dev
# → http://localhost:3000
```

### Full stack (Python backend + frontend)
```bash
# 1. Set API keys
echo "OPENROUTER_API_KEY=sk-or-v1-..." > .env

# 2. Install Python deps
pip install -r requirements.txt

# 3. Run an audit
python src/audit_runner.py --model openai/gpt-4o-mini

# 4. Start frontend
cd web && npm run dev
```

### Docker
```bash
echo "OPENROUTER_API_KEY=sk-or-v1-..." > .env
docker-compose up --build
```

---

## Running audits

```bash
# Specific model
python src/audit_runner.py --model openai/gpt-4o-mini

# Presets
python src/audit_runner.py --preset low    # Fast / cheap
python src/audit_runner.py --preset mid    # Balanced
python src/audit_runner.py --preset high   # Frontier models

# Key flags
# --force              Ignore 7-day cache, re-run all prompts
# --limit N            Run only N prompts (useful for testing)
# --temperature T      Set model temperature (default: 0.0 for reproducibility)
# --consistency N      Run each prompt N times to measure stochasticity
# --context            Generate Academic + Journalistic variants of each prompt
# --perturb            Generate Direct/Roleplay/Academic style variants
# --paternalism        Test Authority vs Layperson personas
# --policy v1.0        Tag run for A/B testing
```

### Scheduled audits
| Tier | Schedule | Description |
|---|---|---|
| Efficiency | Every other week (1st & 15th of month, 4am UTC) | Fast, cheap models for drift tracking |
| Mid / High | Manual trigger | Frontier models on demand |

---

## Testing

```bash
# Frontend unit tests (Vitest)
cd web && npm test

# End-to-end smoke tests (Playwright)
cd web && npm run test:e2e

# Python backend tests
python -m pytest tests/
```

---

## Deployment

- **Frontend**: Vercel — auto-deploys on push to `main`
- **Audits**: GitHub Actions — runs on schedule, commits updated data directly to `main`, triggers redeploy

---

## Cite this work

```bibtex
@software{kandel2026moderationbias,
  title     = {Moderation Bias: LLM Content Moderation Analysis Platform},
  author    = {Kandel, J.},
  year      = {2026},
  url       = {https://moderationbias.com},
  version   = {2.1.0},
  license   = {MIT}
}
```

See [CITATION.cff](CITATION.cff) for structured citation metadata.

---

## Documentation

| Document | What it covers |
| --- | --- |
| [METHODOLOGY.md](METHODOLOGY.md) | How the data is produced: corpus, judge pipeline, statistical methods. |
| [docs/ANALYSIS_PLAN.md](docs/ANALYSIS_PLAN.md) | Pre-specified hypotheses, outcomes, tests, and inclusion/exclusion rules. |
| [LIMITATIONS.md](LIMITATIONS.md) | What the results cannot support; known confounds. |
| [docs/ETHICS.md](docs/ETHICS.md) | Consent model, privacy, sensitive content, dual-use, responsible use. |
| [DATASHEET.md](DATASHEET.md) | Dataset motivation, composition, collection, distribution, maintenance. |
| [docs/DATA_DICTIONARY.md](docs/DATA_DICTIONARY.md) | Field-by-field schema of the audit log. |
| [huggingface/DATASET_CARD.md](huggingface/DATASET_CARD.md) | The Hugging Face dataset card. |

---

## License

MIT — see [LICENSE](LICENSE)
