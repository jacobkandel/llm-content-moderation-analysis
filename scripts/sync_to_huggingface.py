
import os
import sys
import logging
import pandas as pd
from huggingface_hub import login
from datasets import Dataset

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
CSV_PATH = "web/public/audit_log.csv"
# Human-authored dataset card body (markdown, no YAML front-matter). Pushed as the
# dataset repo's README so the HF page is documented and citable.
CARD_PATH = "huggingface/DATASET_CARD.md"
REPO_ID = os.getenv("HF_REPO_ID", "jmk9494/moderation-bias-benchmark")
HF_TOKEN = os.getenv("HF_TOKEN")

# Curated card metadata. Merged into the card's YAML *without* clobbering the
# `dataset_info` / `configs` block that push_to_hub generates (which powers the
# dataset viewer) — see _publish_card.
CARD_METADATA = {
    "license": "mit",
    "language": ["en"],
    "pretty_name": "Moderation Bias: LLM Content Moderation Benchmark",
    "task_categories": ["text-classification"],
    "size_categories": ["100K<n<1M"],
    "annotations_creators": ["machine-generated", "expert-generated"],
    "source_datasets": ["original"],
    "tags": [
        "content-moderation", "ai-safety", "llm", "bias-analysis",
        "red-teaming", "censorship", "over-refusal", "inter-annotator-agreement",
    ],
}


def _publish_card(repo_id: str) -> None:
    """Publish the human-authored dataset card while preserving the auto-generated
    `dataset_info`/`configs` YAML that the HF dataset viewer depends on.

    We load the card that push_to_hub just wrote, keep its existing YAML, merge in
    the curated metadata above, replace the body with CARD_PATH's contents, and
    push. This is best-effort: a failure here must not fail the data sync.
    """
    try:
        from huggingface_hub import DatasetCard
    except Exception as e:  # pragma: no cover - environment without the helper
        logger.warning(f"⚠️  DatasetCard unavailable ({e}); skipping card publish.")
        return

    if not os.path.exists(CARD_PATH):
        logger.warning(f"⚠️  Card body not found at {CARD_PATH}; skipping card publish.")
        return

    try:
        with open(CARD_PATH, "r", encoding="utf-8") as f:
            body = f.read().strip()

        try:
            card = DatasetCard.load(repo_id)  # preserves dataset_info/configs in card.data
        except Exception:
            card = DatasetCard("")

        for key, value in CARD_METADATA.items():
            if key == "tags":
                existing = list(getattr(card.data, "tags", None) or [])
                setattr(card.data, "tags", sorted(set(existing) | set(value)))
            else:
                setattr(card.data, key, value)

        card.text = body
        card.push_to_hub(repo_id)
        logger.info("✅ Dataset card published.")
    except Exception as e:
        logger.warning(f"⚠️  Failed to publish dataset card (non-fatal): {e}")

def sync_to_huggingface():
    """
    Syncs the main audit log to Hugging Face Hub as a consolidated Dataset (Parquet).
    """
    if not HF_TOKEN:
        logger.error("❌ HF_TOKEN environment variable is not set. Skipping sync.")
        sys.exit(1)
        
    if not os.path.exists(CSV_PATH):
        logger.error(f"❌ Audit Log not found at {CSV_PATH}")
        sys.exit(1)

    logger.info("🔐 Logging in to Hugging Face...")
    try:
        login(token=HF_TOKEN, add_to_git_credential=False)
    except Exception as e:
        logger.error(f"❌ Login failed: {e}")
        sys.exit(1)

    logger.info(f"📂 Loading data from {CSV_PATH}...")
    try:
        # Load CSV
        # Use low_memory=False to avoid mixed type warnings on large files
        df = pd.read_csv(CSV_PATH, low_memory=False)
        logger.info(f"Loaded {len(df)} rows.")
        
        # Create HF Dataset
        # This converts to Arrow/Parquet under the hood which compresses efficiently
        dataset = Dataset.from_pandas(df)
        
        logger.info(f"🚀 Pushing dataset to {REPO_ID} (Parquet)...")
        # private=False creates public dataset if not exists
        dataset.push_to_hub(REPO_ID, private=False)

        logger.info("✅ Dataset synced successfully!")

    except Exception as e:
        logger.error(f"❌ Failed to push dataset: {e}")
        sys.exit(1)

    # Publish/refresh the documentation card (best-effort; never fails the sync).
    _publish_card(REPO_ID)

if __name__ == "__main__":
    sync_to_huggingface()
