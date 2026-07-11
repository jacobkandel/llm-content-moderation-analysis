"""Tests for the corrected political-compass construct (src/analysis/political_compass.py).

Covers the v2 fixes: refusals treated as missing (not neutral), per-axis
normalization to [-10, 10], and coverage gating. The network call is monkey-
patched, so no API key or viz stack is needed.
"""
import asyncio

import pytest

from src.analysis import political_compass as pc


class TestScoringHelpers:
    def test_score_answer_known(self):
        for k, v in pc.SCORING.items():
            assert pc._score_answer(k) == (v, True)

    def test_score_answer_refusal_is_missing(self):
        for a in ["Unknown", "Error", "", "Maybe"]:
            assert pc._score_answer(a) == (0.0, False)

    def test_normalize_axis(self):
        assert pc._normalize_axis(0.0, 0) is None          # nothing answered
        assert pc._normalize_axis(4.0, 8) == pytest.approx(5.0)
        assert pc._normalize_axis(-8.0, 8) == pytest.approx(-10.0)


def _run(models):
    return {r["model"]: r for r in asyncio.run(pc.run_compass_analysis(models))}


class TestRunCompass:
    def test_full_agreement_scores_both_axes(self, monkeypatch):
        async def fake(model, statement):
            return "Strongly Agree"
        monkeypatch.setattr(pc, "fetch_compass_response", fake)

        r = _run(["agree/all"])["agree/all"]
        assert r["economic"] is not None and r["social"] is not None
        assert r["coverage"] == {"economic": 1.0, "social": 1.0}
        assert r["abstentionRate"] == 0.0
        # Scores are bounded to the normalized scale.
        assert -10.0 <= r["economic"] <= 10.0
        assert -10.0 <= r["social"] <= 10.0

    def test_full_refusal_is_excluded_not_centered(self, monkeypatch):
        async def fake(model, statement):
            return "Error"
        monkeypatch.setattr(pc, "fetch_compass_response", fake)

        r = _run(["refuse/all"])["refuse/all"]
        # The v1 bug plotted a refusing model at the origin (0,0); v2 emits null.
        assert r["economic"] is None and r["social"] is None
        assert r["coverage"] == {"economic": 0.0, "social": 0.0}
        assert r["abstentionRate"] == 1.0

    def test_coverage_gating_per_axis(self, monkeypatch):
        # Answer economic propositions, refuse social ones -> economic scored,
        # social dropped for insufficient coverage.
        axis_by_text = {p["text"]: p["axis"] for p in pc.PROPOSITIONS}

        async def fake(model, statement):
            return "Agree" if axis_by_text.get(statement) == "economic" else "Error"
        monkeypatch.setattr(pc, "fetch_compass_response", fake)

        r = _run(["econ/only"])["econ/only"]
        assert r["economic"] is not None
        assert r["social"] is None
        assert r["coverage"]["economic"] == 1.0
        assert r["coverage"]["social"] == 0.0

    def test_direction_sign(self, monkeypatch):
        # Agreeing with every proposition should push each axis in the net
        # direction of its weights; verify the economic axis sign is well-defined.
        async def fake(model, statement):
            return "Strongly Agree"
        monkeypatch.setattr(pc, "fetch_compass_response", fake)
        r = _run(["m"])["m"]
        econ_weights = [p["weight"] for p in pc.PROPOSITIONS if p["axis"] == "economic"]
        expected_sign = 1 if sum(econ_weights) > 0 else -1
        assert (r["economic"] > 0) == (expected_sign > 0)
