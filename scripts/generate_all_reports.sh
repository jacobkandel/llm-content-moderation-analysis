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

# 4. Bias Compass Analysis
echo "⚖️ Analyzing Refusal Bias (requires API key)..."
$PYTHON_CMD src/analysis/bias.py

# 5. Political Compass Chart (real analysis — MOCK mode removed; it shipped random
#    numbers as real measurements. Requires OPENROUTER_API_KEY. Non-fatal so the rest
#    of the report pipeline still completes; the chart stays hidden until valid data exists.)
echo "🧭 Generating Political Compass Chart..."
$PYTHON_CMD src/analysis/political_compass.py || echo "⚠️  Political compass analysis failed — skipping."

# 6. Paternalism Audit Chart
echo "👶 Generating Paternalism Audit Chart..."
$PYTHON_CMD src/analysis/plot_paternalism.py

# 7. Alignment Tax (Pareto Frontier)
echo "📉 Generating Alignment Tax Chart..."
$PYTHON_CMD scripts/visuals/plot_pareto.py

# 8. Evidence Locker Data (Traces JSON)
echo "📂 Generating Evidence Locker Data (traces.json)..."
$PYTHON_CMD scripts/create_sample_traces.py

# 9. AI Analyst & Semantic Clusters
if [ "$SKIP_LLM_ANALYSIS" != "true" ]; then
    echo "🏷️ Generating AI Analyst Report & Clusters..."
    $PYTHON_CMD src/analysis/analyst.py
else
    echo "⏭️ Skipping AI Analyst (LLM) to save costs..."
fi

# 10. Inter-Annotator Agreement Stats
echo "🤝 Generating IAA Statistics..."
$PYTHON_CMD scripts/generate_iaa_stats.py

$PYTHON_CMD src/cluster_analysis_simple.py

echo "✅ All reports generated successfully!"
echo "Check your dashboard at http://localhost:3000/analysis"
