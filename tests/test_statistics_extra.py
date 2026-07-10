"""Additional tests for previously-untested statistics helpers."""
import numpy as np

from src.statistics import two_proportion_z_test, calculate_cramers_v, calculate_fleiss_kappa


class TestTwoProportionZTest:
    def test_identical_proportions_not_significant(self):
        r = two_proportion_z_test(50, 100, 50, 100)
        assert r["significant"] is False
        assert r["p_value"] > 0.05
        assert r["z_score"] == 0.0

    def test_large_difference_is_significant(self):
        # 10% vs 90% over 100 trials each is a huge, obviously-significant gap.
        r = two_proportion_z_test(10, 100, 90, 100)
        assert r["significant"] is True
        assert r["p_value"] < 0.001
        assert r["p1"] == 0.1 and r["p2"] == 0.9

    def test_zero_total_returns_insufficient(self):
        r = two_proportion_z_test(0, 0, 5, 10)
        assert r["significant"] is False
        assert r["label"] == "Insufficient data"

    def test_direction_label(self):
        r = two_proportion_z_test(10, 100, 90, 100)  # became more restrictive
        assert "more restrictive" in r["label"]
        r2 = two_proportion_z_test(90, 100, 10, 100)  # became more permissive
        assert "more permissive" in r2["label"]

    def test_pvalue_bounded(self):
        r = two_proportion_z_test(1, 1000, 2, 1000)
        assert 0.0 <= r["p_value"] <= 1.0


class TestCramersV:
    def test_perfect_association(self):
        # Diagonal table => perfect association => V ~ 1.
        table = np.array([[100, 0], [0, 100]])
        assert calculate_cramers_v(table) > 0.95

    def test_no_association(self):
        # Uniform table => no association => V ~ 0.
        table = np.array([[50, 50], [50, 50]])
        assert calculate_cramers_v(table) < 0.05

    def test_bounded_zero_one(self):
        table = np.array([[30, 10], [10, 30]])
        v = calculate_cramers_v(table)
        assert 0.0 <= v <= 1.0

    def test_empty_returns_zero(self):
        assert calculate_cramers_v(np.array([[0, 0], [0, 0]])) == 0.0


class TestFleissRaggedGuard:
    def test_ragged_matrix_uses_modal_raters(self):
        # Rows with differing rater counts: 3 rows of n=4 (perfect agree) and one
        # ragged row of n=2 — the modal-n (4) rows dominate and yield high kappa.
        matrix = np.array([[4, 0], [4, 0], [4, 0], [1, 1]])
        k = calculate_fleiss_kappa(matrix)
        assert k == 1.0  # only the complete (n=4) unanimous rows are scored
