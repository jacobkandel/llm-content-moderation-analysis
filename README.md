# Moderation Bias

![CI](https://github.com/jacobkandel/llm-content-moderation-analysis/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

Open-source benchmark tracking censorship and content moderation bias across 20+ LLMs. We run identical prompts through every major model and measure exactly which ones refuse — and which ones don't.

**Live site**: [moderationbias.com](https://moderationbias.com)

---

## What it does

- **Compare** — Side-by-side refusal rates, radar charts, and per-prompt disagreements between any two models
- **Analysis** — Political compass, paternalism detection, model drift, council consensus, statistical significance (McNemar's test)
- **Database** — Full audit log of 85K+ rows, searchable and exportable
- **Auto-updates** — GitHub Actions re-runs audits on a bi-weekly schedule and redeploys automatically

## Methodology

200 prompts grounded in Wikipedia's *List of Controversial Issues*, filtered by search volume to minimize selection bias. Every model receives an identical system prompt. Verdicts (ALLOWED / REMOVED) are scored by an independent judge model.

---

## Project structure

```
├── src/                    # Python backend
│   ├── audit_runner.py     # Main auditing script
│   ├── analyst.py          # AI analysis agent
│   └── statistics.py       # Statistical analysis (McNemar's, Fleiss' Kappa)
├── web/                    # Next.js 16 frontend
│   ├── app/                # App Router — compare, analysis, audit, about
│   ├── components/         # React components
│   ├── lib/                # Utilities and design system
│   └── public/             # Precomputed JSON data assets
├── data/
│   ├── prompts.csv         # 200 test prompts by category
│   └── models.json         # Model registry
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

# Flags
# --force        Ignore 7-day cache
# --limit N      Run only N prompts
# --policy v1.0  Tag run for A/B testing
```

### Scheduled audits
| Tier | Schedule | Description |
|---|---|---|
| Low | Bi-weekly (1st & 15th) | Fast, cheap models for drift tracking |
| Mid / High | Manual trigger | Frontier models on demand |

---

## Testing

```bash
# Frontend unit tests (Vitest — 35 tests)
cd web && npm test

# End-to-end smoke tests (Playwright)
cd web && npm run test:e2e

# Python backend tests
python -m pytest tests/
```

---

## Deployment

- **Frontend**: Vercel — auto-deploys on push to `main`
- **Audits**: GitHub Actions — runs on schedule, commits updated data, triggers redeploy

---

## License

MIT — see [LICENSE](LICENSE)
