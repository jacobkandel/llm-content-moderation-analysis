# Contributing to Moderation Bias

Thanks for your interest in contributing! This project tracks censorship and content moderation bias across 20+ LLMs, and we welcome contributions of all kinds.

## Quick Start

### Frontend only
```bash
cd web
npm install
npm run dev
# → http://localhost:3000
```

### Full stack
```bash
# 1. Set API keys
echo "OPENROUTER_API_KEY=sk-or-v1-..." > .env

# 2. Install Python deps
pip install -r requirements.txt

# 3. Run a test audit
python src/audit_runner.py --model openai/gpt-4o-mini --limit 10

# 4. Start frontend
cd web && npm run dev
```

## How to Contribute

### Reporting Bugs
Use the [Bug Report](https://github.com/jacobkandel/llm-content-moderation-analysis/issues/new?template=bug_report.yml) issue template.

### Suggesting Features
Use the [Feature Request](https://github.com/jacobkandel/llm-content-moderation-analysis/issues/new?template=feature_request.yml) issue template.

### Requesting New Models
Use the [New Model Request](https://github.com/jacobkandel/llm-content-moderation-analysis/issues/new?template=new_model_request.yml) issue template.

### Submitting Code

1. **Fork** the repository
2. **Create a branch** from `main`: `git checkout -b feature/your-feature`
3. **Make your changes** — follow the conventions below
4. **Run tests**:
   ```bash
   # Frontend
   cd web && npm test

   # Backend
   python -m pytest tests/
   ```
5. **Push** and open a **Pull Request**

## Code Conventions

- **Python**: Follow PEP 8. Use type hints where possible.
- **TypeScript/React**: Use functional components with hooks. Follow existing patterns in `web/components/`.
- **Commits**: Use clear, descriptive messages. Prefix with `fix:`, `feat:`, `docs:`, `refactor:`, etc.
- **Tests**: Add tests for new features. Don't break existing tests.

## Project Structure

```
src/           → Python backend (audit runner, analysis, statistics)
web/           → Next.js frontend (App Router)
data/          → Prompts, model registry
scripts/       → Analysis & visualization scripts
.github/       → CI workflows and templates
```

## Areas Where Help is Welcome

- 🌐 **Internationalization** — Multi-language prompt sets
- 📊 **New analyses** — Novel statistical methods for measuring bias
- 🤖 **New models** — Adding support for emerging LLMs
- 🎨 **UI/UX** — Dashboard improvements, accessibility
- 📝 **Documentation** — Tutorials, methodology deep-dives
- 🧪 **Testing** — Expanding test coverage

## Questions?

Open a [Discussion](https://github.com/jacobkandel/llm-content-moderation-analysis/discussions) or file an issue. We're happy to help!
