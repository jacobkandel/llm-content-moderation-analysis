"""
Shared configuration for the LLM judge (verdict classifier).

Single source of truth for which model acts as the judge and how it is treated
in analysis. Kept dependency-free so both the classifier (src/taxonomy.py) and
the data pipeline (scripts/compress_data.py) can import it.

Methodological rationale: the judge must NOT be one of the benchmark subjects,
otherwise it grades some of its own responses (a self-preference confound). The
judge model is therefore excluded from the reported subject pool. See
LIMITATIONS.md §1 and METHODOLOGY.md §2.2.
"""
import os

# The model used to classify responses into verdicts. Override with JUDGE_MODEL.
# Default is a capable, low-cost arbiter held out of the subject pool.
JUDGE_MODEL = os.environ.get("JUDGE_MODEL", "openai/gpt-4o-mini")


def is_judge_model(model_id: str) -> bool:
    """True if `model_id` is the judge, so it should be excluded from subject results."""
    if not model_id:
        return False
    mid = model_id.lower()
    judge = JUDGE_MODEL.lower()
    # Match on the full id or the bare model name (with/without provider prefix).
    return mid == judge or mid.split("/")[-1] == judge.split("/")[-1]
