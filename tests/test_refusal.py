"""Tests for the canonical verdict taxonomy (src/refusal.py) and judge config."""
import re
import pathlib

from src.refusal import (
    REFUSAL_VERDICTS,
    SAFE_VERDICTS,
    NON_VERDICTS,
    is_refusal,
    is_scorable,
    normalize_verdict,
)
from src.judge_config import is_judge_model, JUDGE_MODEL


class TestRefusalPredicates:
    def test_policy_and_meta_refusal_count_as_refusals(self):
        # Regression: these were excluded from some legacy definitions.
        for v in ["REMOVED", "REFUSAL", "POLICY_REFUSAL", "META_REFUSAL", "BLOCKED", "Hard Refusal"]:
            assert is_refusal(v), f"{v} should be a refusal"

    def test_allowed_is_not_a_refusal(self):
        for v in ["ALLOWED", "safe", "safe_response"]:
            assert not is_refusal(v)

    def test_error_is_not_scorable(self):
        for v in ["ERROR", "", "UNKNOWN"]:
            assert not is_scorable(v)

    def test_real_verdicts_are_scorable(self):
        for v in list(REFUSAL_VERDICTS) + list(SAFE_VERDICTS):
            assert is_scorable(v)

    def test_refusal_and_safe_sets_are_disjoint(self):
        assert REFUSAL_VERDICTS.isdisjoint(SAFE_VERDICTS)
        assert REFUSAL_VERDICTS.isdisjoint(NON_VERDICTS)


class TestNormalizeVerdict:
    def test_synonyms(self):
        assert normalize_verdict("remove") == "REMOVED"
        assert normalize_verdict("allow") == "ALLOWED"
        assert normalize_verdict("SAFE") == "ALLOWED"

    def test_typos_map_to_removed(self):
        for typo in ["REMOLVED", "REMVED", "REMOVEN", "REMOVIDE"]:
            assert normalize_verdict(typo) == "REMOVED"

    def test_unicode_lookalikes(self):
        # 'REMОVED' with a Cyrillic О should normalize to REMOVED.
        assert normalize_verdict("REMОVED") == "REMOVED"

    def test_empty_is_unknown(self):
        assert normalize_verdict("") == "UNKNOWN"
        assert not is_scorable(normalize_verdict(""))

    def test_canonical_passthrough(self):
        assert normalize_verdict("POLICY_REFUSAL") == "POLICY_REFUSAL"


class TestJudgeConfig:
    def test_judge_is_detected(self):
        assert is_judge_model(JUDGE_MODEL)

    def test_bare_name_matches(self):
        # Matches with or without the provider prefix.
        bare = JUDGE_MODEL.split("/")[-1]
        assert is_judge_model(bare)

    def test_non_judge_not_flagged(self):
        assert not is_judge_model("anthropic/claude-3.5-sonnet")

    def test_empty_is_safe(self):
        assert not is_judge_model("")


class TestPythonTsParity:
    """The refusal set is duplicated in Python and TS; assert they stay in sync."""

    def test_refusal_sets_match(self):
        ts = pathlib.Path("web/lib/verdicts.ts").read_text()
        # Extract the quoted strings inside the REFUSAL_VERDICTS Set([...]) block.
        block = re.search(r"REFUSAL_VERDICTS\s*=\s*new Set\(\[(.*?)\]", ts, re.S)
        assert block, "Could not find REFUSAL_VERDICTS in verdicts.ts"
        ts_set = set(re.findall(r"'([^']+)'", block.group(1)))
        assert ts_set == set(REFUSAL_VERDICTS), (
            f"Python/TS refusal sets diverged: py-only={set(REFUSAL_VERDICTS)-ts_set}, "
            f"ts-only={ts_set-set(REFUSAL_VERDICTS)}"
        )
