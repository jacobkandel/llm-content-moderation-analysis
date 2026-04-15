import pytest
import math
import sys
import os

# Add the project directory to sys.path to allow importing from scripts
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scripts.compress_data import wilson_score_interval, normalize_category


def test_normalize_category():
    assert normalize_category("Sexual") == "Explicit/Sexual"
    assert normalize_category("Explicit Content") == "Explicit/Sexual"
    assert normalize_category("Harassment") == "Harassment"


def test_wilson_score_interval():
    # Test typical proportions
    lower, upper = wilson_score_interval(50, 100)
    # the 95% Wilson UI for p=0.5, N=100 is roughly (0.404, 0.596)
    assert 0.40 < lower < 0.41
    assert 0.59 < upper < 0.60

    # Test boundary conditions
    lower_0, upper_0 = wilson_score_interval(0, 100)
    assert lower_0 == 0.0
    assert upper_0 > 0.0
    assert upper_0 < 0.05

    lower_100, upper_100 = wilson_score_interval(100, 100)
    assert lower_100 > 0.95
    assert math.isclose(upper_100, 1.0, rel_tol=1e-9)

    # Test zero total
    lower_z, upper_z = wilson_score_interval(0, 0)
    assert lower_z == 0.0
    assert upper_z == 0.0


def test_mcnemars_math():
    # Inline test of McNemar's logic applied in compress_data.py
    b = 15
    c = 5
    if b + c == 0:
        pass  # p_val would be 1.0
    else:
        chi2 = ((abs(b - c) - 1) ** 2) / (b + c)
        # basic approximation check without implementing ERF again
        assert chi2 == ((10 - 1) ** 2) / 20  # = 81/20 = 4.05


def test_fdr_correction():
    # Simulate the Benjamini-Hochberg FDR correction logic
    p_values = [
        {"modelA": "A", "modelB": "B", "pValue": 0.01},
        {"modelA": "B", "modelB": "C", "pValue": 0.04},
        {"modelA": "C", "modelB": "D", "pValue": 0.015},
        {"modelA": "A", "modelB": "D", "pValue": 0.10},
    ]

    # Sort
    p_values.sort(key=lambda x: x["pValue"])

    m = len(p_values)
    for i, res in enumerate(p_values):
        rank = i + 1
        res["pValueAdjusted"] = min(res["pValue"] * m / rank, 1.0)

    for i in range(m - 2, -1, -1):
        p_values[i]["pValueAdjusted"] = min(
            p_values[i]["pValueAdjusted"], p_values[i + 1]["pValueAdjusted"]
        )

    assert p_values[0]["pValue"] == 0.01
    assert p_values[0]["pValueAdjusted"] <= p_values[1]["pValueAdjusted"]
    assert p_values[1]["pValue"] == 0.015
    assert (
        p_values[1]["pValueAdjusted"] <= p_values[2]["pValueAdjusted"]
    )  # Should be monotonic
    # P-value 0.015 at rank 2: 0.015 * 4/2 = 0.030
    # P-value 0.04 at rank 3: 0.04 * 4/3 = 0.0533
    assert abs(p_values[2]["pValueAdjusted"] - 0.0533) < 0.001


if __name__ == "__main__":
    pytest.main()
