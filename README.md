# Moderation Bias

![CI](https://github.com/jacobkandel/llm-content-moderation-analysis/actions/workflows/ci.yml/badge.svg)
![Audit Pipeline](https://github.com/jacobkandel/llm-content-moderation-analysis/actions/workflows/audit.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Code of Conduct](https://img.shields.io/badge/code%20of%20conduct-contributor%20covenant-blue.svg)](CODE_OF_CONDUCT.md)

Open-source benchmark tracking censorship and content moderation bias across 20+ LLMs. We run identical prompts through every major model and measure exactly which ones refuse — and which ones don't.

**Live site**: [moderationbias.com](https://moderationbias.com)

> ⭐ If you find this project useful, please consider giving it a star — it helps others discover it!

---

## What it does

- **Compare** — Side-by-side refusal rates, radar charts, and per-prompt disagreements between any two models
- **Analysis** — Political compass, paternalism detection, model drift, council consensus, statistical significance (McNemar's test)
- **Database** — Full audit log of 100K+ rows, searchable and exportable
- **Auto-updates** — GitHub Actions re-runs audits on the 1st and 15th of each month, commits updated data directly to `main` (with `git pull --rebase` to handle any concurrent pushes), and triggers a Vercel redeploy

## Methodology

2,000+ prompts across 6 categories (Hate Speech, Health Misinformation, Incitement to Violence, Explicit/Sexual, Paternalism, Political), grounded in Wikipedia's *List of Controversial Issues* and filtered by search volume to minimize selection bias. Every model receives an identical system prompt at `temperature=0` for reproducibility. Verdicts (ALLOWED / REMOVED) are scored by an independent judge model. Exact model version strings are logged per run for drift attribution.

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
│   ├── prompts.csv         # 2,000+ test prompts by category
│   └── models.json         # Model registry (24 models)
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
- **Audits**: GitHub Actions — runs on the 1st and 15th of each month at 4am UTC, commits updated data directly to `main` (using `git pull --rebase` to safely merge any concurrent changes), and triggers a Vercel redeploy

---

## License

MIT — see [LICENSE](LICENSE)
