# Moderation Bias

![CI](https://github.com/jacobkandel/llm-content-moderation-analysis/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20262255.svg)](https://doi.org/10.5281/zenodo.20262255)

Open-source benchmark tracking censorship and content moderation bias across 27+ LLMs. We run identical prompts through every major model and measure exactly which ones refuse — and which ones don't.

**Live site**: [moderationbias.com](https://moderationbias.com)

---

## What it does

- **Compare** — Side-by-side refusal rates, radar charts, and per-prompt disagreements between any two models
- **Analysis** — Political compass, paternalism detection, model drift, council consensus, statistical significance (McNemar's test)
- **Database** — Full audit log of 2.3M+ rows, searchable and exportable
- **Auto-updates** — GitHub Actions re-runs audits biweekly (1st & 15th) and commits updated data directly to `main`

## Methodology

2,012 evaluated prompts (2,293 in corpus) across 16 categories (Hate Speech, Health Misinformation, Misinformation, Incitement to Violence, Explicit/Sexual, Violence, Crime, Cybersecurity, Harassment, Self-Harm, Deception, Theft, Dangerous, Medical Misinformation, International Controversy, and False Positive Controls), grounded in Wikipedia's *List of Controversial Issues* and filtered by search volume to minimize selection bias. Every model receives an identical system prompt at `temperature=0` for reproducibility. Verdicts (ALLOWED / REMOVED) are scored by an independent judge model (`gpt-4o-mini`) with position-swapping to mitigate ordering bias. Exact model version strings are logged per run for drift attribution. Minimum n ≥ 30 per model×category cell for statistical validity (models with <50 total evaluations are excluded from analysis). See [METHODOLOGY.md](METHODOLOGY.md) and [LIMITATIONS.md](LIMITATIONS.md) for full details.

---

## Project structure

```
├── src/                    # Python backend
│   ├── audit_runner.py     # Main auditing script
│   ├── analyst.py          # AI analysis agent
│   └── statistics.py       # Statistical analysis (McNemar's, Fleiss' Kappa)
├── web/                    # Next.js frontend
│   ├── app/                # App Router — compare, analysis, audit, about
│   ├── components/         # React components
│   ├── lib/                # Utilities and design system
│   └── public/             # Precomputed JSON data assets
├── data/
│   ├── prompts.csv         # 2,293 test prompts by category
│   └── models.json         # Model registry (31 models)
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
  version   = {2.0.0},
  license   = {MIT}
}
```

See [CITATION.cff](CITATION.cff) for structured citation metadata.

---

## License

MIT — see [LICENSE](LICENSE)
