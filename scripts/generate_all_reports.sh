#!/bin/bash

# Configuration
AUDIT_LOG="web/public/audit_log.csv.gz"
export PYTHONPATH="."
# Check for virtual environment, otherwise use system python (for CI)
if [ -f "./.venv/bin/python" ]; then
    PYTHON_CMD="./.venv/bin/python"
else
    PYTHON_CMD="python3"
fi

echo "🚀 Starting Full Analysis Pipeline..."

# Ensure output directories exist
mkdir -p web/public/assets

# 1. Statistical Significance
echo "📊 Calculating Statistical Significance (McNemar's Test)..."
$PYTHON_CMD src/analysis/significance.py

# 2. Longitudinal Drift
echo "📈 Analyzing Model Drift over time..."
$PYTHON_CMD src/analysis/drift.py

# 4. Bias Compass Analysis (optional — script may not be present in all checkouts)
if [ -f src/analysis/bias.py ]; then
    echo "⚖️ Analyzing Refusal Bias (requires API key)..."
    $PYTHON_CMD src/analysis/bias.py || echo "⚠️  bias.py failed — skipping."
fi

# 5. Political Compass Chart — DISABLED by default.
#    The chart is hidden on the site (COMPASS_ENABLED=false, pending a construct
#    rework), and the real analysis makes ~500 live API calls, so we skip it to
#    avoid wasted cost/time. Re-enable with RUN_POLITICAL_COMPASS=1 once the
#    measure is validated and the frontend flag is turned back on.
if [ "$RUN_POLITICAL_COMPASS" = "1" ]; then
    echo "🧭 Generating Political Compass Chart..."
    $PYTHON_CMD src/analysis/political_compass.py || echo "⚠️  Political compass analysis failed — skipping."
else
    echo "🧭 Political Compass generation skipped (RUN_POLITICAL_COMPASS!=1; chart is hidden)."
fi

# 6. Paternalism Audit Chart
echo "👶 Generating Paternalism Audit Chart..."
$PYTHON_CMD src/analysis/plot_paternalism.py

# 7. Alignment Tax (Pareto Frontier)
echo "📉 Generating Alignment Tax Chart..."
$PYTHON_CMD scripts/visuals/plot_pareto.py

# 8. Evidence Locker Data (Traces JSON) — optional
if [ -f scripts/create_sample_traces.py ]; then
    echo "📂 Generating Evidence Locker Data (traces.json)..."
    $PYTHON_CMD scripts/create_sample_traces.py || echo "⚠️  create_sample_traces.py failed — skipping."
fi

# 9. AI Analyst & Semantic Clusters
if [ "$SKIP_LLM_ANALYSIS" != "true" ]; then
    echo "🏷️ Generating AI Analyst Report & Clusters..."
    $PYTHON_CMD src/analysis/analyst.py
else
    echo "⏭️ Skipping AI Analyst (LLM) to save costs..."
fi

$PYTHON_CMD src/cluster_analysis_simple.py

echo "✅ All reports generated successfully!"
echo "Check your dashboard at http://localhost:3000/analysis"
