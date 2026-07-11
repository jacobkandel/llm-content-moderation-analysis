"""Tests for human ↔ model alignment (scripts/generate_iaa_stats.py).

Validates that `compute_human_alignment` builds a correct human-consensus
verdict per prompt, matches it against per-model audit verdicts using the
canonical refusal taxonomy, and reports sane Cohen's-kappa / percent-agreement
figures. The audit CSV path is redirected to a temp file so the test is
hermetic (no dependency on the committed audit log).
"""
import csv
import importlib.util
import pathlib

import pytest

_SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "generate_iaa_stats.py"


def _load_module():
    spec = importlib.util.spec_from_file_location("generate_iaa_stats", _SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _write_audit_csv(path, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["prompt_id", "model", "verdict"])
        w.writeheader()
        for r in rows:
            w.writerow(r)


# Six prompts with a clean, unanimous human consensus: P1-P3 REMOVED, P4-P6 ALLOWED.
_HUMAN_RECORDS = []
for _i, _pid in enumerate(["P1", "P2", "P3", "P4", "P5", "P6"]):
    _v = "REMOVED" if _i < 3 else "ALLOWED"
    _HUMAN_RECORDS.append({"itemId": _pid, "annotatorId": "a1", "verdict": _v})
    _HUMAN_RECORDS.append({"itemId": _pid, "annotatorId": "a2", "verdict": _v})


@pytest.fixture()
def mod_with_csv(tmp_path, monkeypatch):
    mod = _load_module()

    def _make(rows):
        csv_path = tmp_path / "audit.csv"
        _write_audit_csv(csv_path, rows)
        monkeypatch.setattr(mod, "_AUDIT_CSV_PATHS", [str(csv_path)])
        return mod

    return _make


def _consensus_matching_rows(model):
    """Audit rows where `model` perfectly matches the human consensus."""
    return [{"prompt_id": p, "model": model, "verdict": "REMOVED"} for p in ("P1", "P2", "P3")] + \
           [{"prompt_id": p, "model": model, "verdict": "ALLOWED"} for p in ("P4", "P5", "P6")]


def _consensus_inverting_rows(model):
    """Audit rows where `model` perfectly disagrees with the human consensus."""
    return [{"prompt_id": p, "model": model, "verdict": "ALLOWED"} for p in ("P1", "P2", "P3")] + \
           [{"prompt_id": p, "model": model, "verdict": "REMOVED"} for p in ("P4", "P5", "P6")]


class TestHumanAlignment:
    def test_perfect_agreement_yields_kappa_one(self, mod_with_csv):
        mod = mod_with_csv(_consensus_matching_rows("good/model"))
        out = mod.compute_human_alignment(_HUMAN_RECORDS)
        assert out["humanConsensusItems"] == 6
        good = next(m for m in out["perModel"] if m["model"] == "good/model")
        assert good["kappa"] == pytest.approx(1.0)
        assert good["percentAgreement"] == pytest.approx(100.0)
        assert good["n"] == 6

    def test_perfect_disagreement_is_poor(self, mod_with_csv):
        mod = mod_with_csv(_consensus_inverting_rows("bad/model"))
        out = mod.compute_human_alignment(_HUMAN_RECORDS)
        bad = next(m for m in out["perModel"] if m["model"] == "bad/model")
        assert bad["kappa"] < 0
        assert bad["percentAgreement"] == pytest.approx(0.0)
        assert bad["kappaInterpretation"] == "Poor"

    def test_ranked_and_overall_present(self, mod_with_csv):
        rows = _consensus_matching_rows("good/model") + _consensus_inverting_rows("bad/model")
        mod = mod_with_csv(rows)
        out = mod.compute_human_alignment(_HUMAN_RECORDS)
        assert out["modelsCompared"] == 2
        # perModel is sorted best-aligned first.
        assert out["perModel"][0]["model"] == "good/model"
        assert out["overall"]["n"] == 6

    def test_refusal_synonyms_are_binarized(self, mod_with_csv):
        # A non-"REMOVED" refusal synonym must still count as a refusal.
        rows = [{"prompt_id": p, "model": "syn/model", "verdict": "POLICY_REFUSAL"} for p in ("P1", "P2", "P3")] + \
               [{"prompt_id": p, "model": "syn/model", "verdict": "ALLOWED"} for p in ("P4", "P5", "P6")]
        mod = mod_with_csv(rows)
        out = mod.compute_human_alignment(_HUMAN_RECORDS)
        syn = next(m for m in out["perModel"] if m["model"] == "syn/model")
        assert syn["kappa"] == pytest.approx(1.0)

    def test_error_verdicts_excluded(self, mod_with_csv):
        # ERROR rows are unscorable and must not enter the denominator: a model
        # with only ERROR rows on some prompts falls below MIN_OVERLAP and drops.
        rows = [{"prompt_id": p, "model": "err/model", "verdict": "ERROR"} for p in ("P1", "P2", "P3", "P4")]
        mod = mod_with_csv(rows)
        out = mod.compute_human_alignment(_HUMAN_RECORDS)
        assert all(m["model"] != "err/model" for m in out["perModel"])

    def test_tie_consensus_dropped(self, mod_with_csv):
        # A prompt split 1-1 has no human consensus and must be excluded.
        records = list(_HUMAN_RECORDS) + [
            {"itemId": "P7", "annotatorId": "a1", "verdict": "ALLOWED"},
            {"itemId": "P7", "annotatorId": "a2", "verdict": "REMOVED"},
        ]
        mod = mod_with_csv(_consensus_matching_rows("good/model"))
        out = mod.compute_human_alignment(records)
        assert out["humanConsensusItems"] == 6  # P7 dropped

    def test_no_annotations_returns_empty(self, mod_with_csv):
        mod = mod_with_csv(_consensus_matching_rows("good/model"))
        assert mod.compute_human_alignment([]) == {}

    def test_single_annotator_consensus_flagged(self, mod_with_csv):
        # 2 items backed by 2 annotators, 1 item by a single annotator.
        records = [
            {"itemId": "P1", "annotatorId": "a1", "verdict": "REMOVED"},
            {"itemId": "P1", "annotatorId": "a2", "verdict": "REMOVED"},
            {"itemId": "P2", "annotatorId": "a1", "verdict": "ALLOWED"},
            {"itemId": "P2", "annotatorId": "a2", "verdict": "ALLOWED"},
            {"itemId": "P3", "annotatorId": "a1", "verdict": "REMOVED"},  # single
        ]
        mod = mod_with_csv(_consensus_matching_rows("good/model"))
        out = mod.compute_human_alignment(records)
        assert out["humanConsensusItems"] == 3
        assert out["multiAnnotatorConsensusItems"] == 2
        # Note is driven by multi-annotator backing, and reports both counts.
        assert "2 of 3" in out["note"]

    def test_variant_suffix_matches_base_prompt(self, mod_with_csv):
        # Audit rows carrying a -V<n> repetition suffix should map to the base id.
        rows = [{"prompt_id": p + "-V1", "model": "var/model", "verdict": "REMOVED"} for p in ("P1", "P2", "P3")] + \
               [{"prompt_id": p + "-V2", "model": "var/model", "verdict": "ALLOWED"} for p in ("P4", "P5", "P6")]
        mod = mod_with_csv(rows)
        out = mod.compute_human_alignment(_HUMAN_RECORDS)
        var = next(m for m in out["perModel"] if m["model"] == "var/model")
        assert var["n"] == 6
        assert var["kappa"] == pytest.approx(1.0)
