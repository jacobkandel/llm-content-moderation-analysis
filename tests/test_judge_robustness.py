"""Tests for the pure aggregation math in scripts/judge_robustness.py.

The live-judging path (network) is not exercised here; these cover the
kappa/flip-rate/sampling logic that turns judge labels into the robustness
report, so CI can validate the statistics without an API key.
"""
import importlib.util
import pathlib

import pytest

_SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "judge_robustness.py"


def _load():
    spec = importlib.util.spec_from_file_location("judge_robustness", _SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


jr = _load()


class TestKappaMath:
    def test_perfect_agreement(self):
        a = [1, 1, 0, 0, 1]
        assert jr.cohens_kappa_binary(a, a) == pytest.approx(1.0)
        assert jr.percent_agreement(a, a) == pytest.approx(100.0)

    def test_perfect_disagreement(self):
        a = [1, 1, 1, 0, 0, 0]
        b = [0, 0, 0, 1, 1, 1]
        assert jr.cohens_kappa_binary(a, b) == pytest.approx(-1.0)
        assert jr.percent_agreement(a, b) == pytest.approx(0.0)

    def test_empty_is_zero(self):
        assert jr.cohens_kappa_binary([], []) == 0.0

    def test_fleiss_unanimous_is_one(self):
        matrix = [[1, 1, 1], [0, 0, 0], [1, 1, 1]]
        assert jr.fleiss_kappa_binary(matrix) == pytest.approx(1.0)

    def test_fleiss_single_rater_is_nan(self):
        assert jr.fleiss_kappa_binary([[1], [0]]) != jr.fleiss_kappa_binary([[1], [0]])  # nan != nan


class TestVerdictMapping:
    def test_category_to_refusal(self):
        assert jr.category_to_refusal("Authorized") == 0
        for cat in ["Hard_Refusal", "Soft_Censorship", "False_Refusal", "Unknown"]:
            assert jr.category_to_refusal(cat) == 1

    def test_recorded_verdict_to_refusal(self):
        assert jr.recorded_verdict_to_refusal("ALLOWED") == 0
        for v in ["REMOVED", "POLICY_REFUSAL", "META_REFUSAL", "BLOCKED", "unsafe"]:
            assert jr.recorded_verdict_to_refusal(v) == 1


class TestBuildReport:
    def _sample(self):
        cats = ["HS", "HS", "HS", "MI", "MI", "MI"]
        verdicts = ["REMOVED", "REMOVED", "REMOVED", "ALLOWED", "ALLOWED", "ALLOWED"]
        return [{"verdict": v, "category": c} for v, c in zip(verdicts, cats)]

    def test_agree_and_disagree_judges(self):
        sample = self._sample()  # primary refusal = [1,1,1,0,0,0]
        judge_labels = {
            "good/judge": [1, 1, 1, 0, 0, 0],   # perfect agreement
            "bad/judge": [0, 0, 0, 1, 1, 1],    # perfect disagreement
        }
        report = jr.build_report(sample, judge_labels, ["good/judge", "bad/judge"], "primary/judge", 6)

        assert report["sampleEvaluated"] == 6
        assert report["primaryRefusalRate"] == pytest.approx(50.0)
        # Sorted best-aligned first.
        assert report["perJudge"][0]["judge"] == "good/judge"
        assert report["perJudge"][0]["kappaVsPrimary"] == pytest.approx(1.0)
        assert report["perJudge"][0]["percentAgreement"] == pytest.approx(100.0)
        assert report["perJudge"][1]["kappaVsPrimary"] == pytest.approx(-1.0)
        # Every item has a dissenting rater -> 100% flip rate.
        assert report["verdictFlipRate"] == pytest.approx(100.0)
        # Alt-judge majority ties (1 agree, 1 disagree) -> rounds to refusal;
        # disagrees with primary on the 3 ALLOW items -> 50%.
        assert report["primaryVsJudgeMajorityDisagreement"] == pytest.approx(50.0)
        assert report["fleissKappaAllJudges"] < 0  # Poor across the 3 raters


class TestSampling:
    def test_dedup_and_determinism(self):
        rows = [
            {"prompt_id": "P1", "model": "m", "category": "A"},
            {"prompt_id": "P1", "model": "m", "category": "A"},  # dup
            {"prompt_id": "P2", "model": "m", "category": "A"},
            {"prompt_id": "P1", "model": "n", "category": "B"},
        ]
        s1 = jr.stratified_sample(rows, 10, seed=7)
        s2 = jr.stratified_sample(rows, 10, seed=7)
        # 3 unique (prompt_id, model) pairs; n exceeds that -> all 3 returned.
        assert len(s1) == 3
        keys1 = sorted((r["prompt_id"], r["model"]) for r in s1)
        keys2 = sorted((r["prompt_id"], r["model"]) for r in s2)
        assert keys1 == keys2  # deterministic under a fixed seed
