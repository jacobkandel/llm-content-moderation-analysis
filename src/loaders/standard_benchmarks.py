
import os
import requests
import pandas as pd
import logging

logger = logging.getLogger(__name__)

# --- XSTest ---
XSTEST_URL = "https://raw.githubusercontent.com/AI-secure/XSTest/main/xstest_v2_prompts.csv"
CACHE_DIR = "data/external"
XSTEST_CACHE = os.path.join(CACHE_DIR, "xstest_v2.csv")

# --- OR-Bench ---
ORBENCH_HARD_URL = "https://huggingface.co/datasets/bench-llm/or-bench/resolve/main/or-bench-hard-1k.csv"
ORBENCH_TOXIC_URL = "https://huggingface.co/datasets/bench-llm/or-bench/resolve/main/or-bench-toxic.csv"
ORBENCH_HARD_CACHE = os.path.join(CACHE_DIR, "orbench_hard_1k.csv")
ORBENCH_TOXIC_CACHE = os.path.join(CACHE_DIR, "orbench_toxic.csv")


def _download(url: str, cache_path: str, force: bool = False) -> str:
    """Download a file if not cached."""
    os.makedirs(os.path.dirname(cache_path), exist_ok=True)
    if os.path.exists(cache_path) and not force:
        logger.info(f"Using cached {cache_path}")
        return cache_path
    logger.info(f"Downloading {url}...")
    try:
        resp = requests.get(url, timeout=60)
        resp.raise_for_status()
        with open(cache_path, 'wb') as f:
            f.write(resp.content)
        logger.info(f"Saved to {cache_path}")
        return cache_path
    except Exception as e:
        logger.error(f"Download failed: {e}")
        raise


# ──────────────────────────────────────────────
# XSTest v2 (Röttger et al., 2024)
# ──────────────────────────────────────────────
def download_xstest(force=False):
    """Downloads XSTest dataset if not present or if force=True."""
    return _download(XSTEST_URL, XSTEST_CACHE, force)


def load_xstest():
    """
    Loads XSTest v2 as a list of prompt dictionaries.
    Format: [{'case_id': ..., 'category': ..., 'prompt': ..., 'source': 'xstest',
              'expected_safe': True/False}]
    """
    file_path = download_xstest()
    try:
        df = pd.read_csv(file_path)
        prompts = []
        for idx, row in df.iterrows():
            # XSTest 'type' column: 'safe' = benign prompts models should NOT refuse
            #                       others = actually unsafe prompts
            is_safe = str(row.get('type', '')).lower().strip() == 'safe'
            prompts.append({
                'case_id': f"xstest_{idx}",
                'category': row.get('focus', 'unknown'),
                'sub_category': row.get('type', 'unknown'),
                'prompt': row.get('prompt', ''),
                'source': 'xstest',
                'expected_safe': is_safe,
            })
        logger.info(f"Loaded {len(prompts)} XSTest prompts "
                     f"({sum(1 for p in prompts if p['expected_safe'])} safe, "
                     f"{sum(1 for p in prompts if not p['expected_safe'])} unsafe)")
        return prompts
    except Exception as e:
        logger.error(f"Failed to parse XSTest CSV: {e}")
        return []


# ──────────────────────────────────────────────
# OR-Bench (Cui et al., 2024)
# ──────────────────────────────────────────────
def download_orbench(force=False):
    """Downloads OR-Bench Hard-1K and Toxic subsets."""
    hard_path = _download(ORBENCH_HARD_URL, ORBENCH_HARD_CACHE, force)
    toxic_path = _download(ORBENCH_TOXIC_URL, ORBENCH_TOXIC_CACHE, force)
    return hard_path, toxic_path


def load_orbench_hard(limit=None):
    """
    Loads OR-Bench Hard-1K subset (1,000 seemingly-toxic but actually SAFE prompts).
    These are designed to trigger over-refusal in aligned models.
    All prompts have expected_safe=True — a refusal here is an over-refusal.

    Format: [{'case_id': ..., 'category': 'orbench_hard', 'prompt': ...,
              'source': 'orbench', 'expected_safe': True}]
    """
    hard_path, _ = download_orbench()
    try:
        df = pd.read_csv(hard_path)
        # OR-Bench CSV has a 'prompt' column
        prompt_col = 'prompt' if 'prompt' in df.columns else df.columns[0]
        # Category column if present
        cat_col = next((c for c in df.columns if c.lower() in ('category', 'reject_category', 'type')), None)

        prompts = []
        for idx, row in df.iterrows():
            cat = str(row[cat_col]).strip() if cat_col else 'orbench_hard'
            prompts.append({
                'case_id': f"orbench_hard_{idx}",
                'category': cat,
                'prompt': str(row[prompt_col]).strip(),
                'source': 'orbench',
                'expected_safe': True,  # All OR-Bench Hard prompts are safe
            })
        if limit:
            prompts = prompts[:limit]
        logger.info(f"Loaded {len(prompts)} OR-Bench Hard prompts (all expected safe)")
        return prompts
    except Exception as e:
        logger.error(f"Failed to parse OR-Bench Hard CSV: {e}")
        return []


def load_orbench_toxic(limit=None):
    """
    Loads OR-Bench Toxic subset (600 actually toxic prompts).
    A refusal here is CORRECT behavior.

    Format: [{'case_id': ..., 'category': 'orbench_toxic', 'prompt': ...,
              'source': 'orbench', 'expected_safe': False}]
    """
    _, toxic_path = download_orbench()
    try:
        df = pd.read_csv(toxic_path)
        prompt_col = 'prompt' if 'prompt' in df.columns else df.columns[0]

        prompts = []
        for idx, row in df.iterrows():
            prompts.append({
                'case_id': f"orbench_toxic_{idx}",
                'category': 'orbench_toxic',
                'prompt': str(row[prompt_col]).strip(),
                'source': 'orbench',
                'expected_safe': False,  # All toxic prompts should be refused
            })
        if limit:
            prompts = prompts[:limit]
        logger.info(f"Loaded {len(prompts)} OR-Bench Toxic prompts (all expected unsafe)")
        return prompts
    except Exception as e:
        logger.error(f"Failed to parse OR-Bench Toxic CSV: {e}")
        return []
