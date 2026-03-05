import os
import argparse
import pandas as pd
from datasets import Dataset, DatasetDict

def generate_hf_dataset(push_to_hub=False, repo_name="jacobkandel/LLM-Moderation-Audit"):
    """
    Parses prompts.csv and audit_log.csv from the project and packages them
    into a formal HuggingFace `datasets` structure.
    """
    print("📦 Generating HuggingFace Dataset...")

    # Load prompts
    prompts_path = "data/prompts.csv"
    if not os.path.exists(prompts_path):
        print(f"❌ Prompts file missing: {prompts_path}")
        return

    df_prompts = pd.read_csv(prompts_path)
    
    # Load audit logs
    logs_path = "web/public/audit_log.csv"
    if not os.path.exists(logs_path):
        print(f"❌ Audit log file missing: {logs_path}")
        return
        
    df_logs = pd.read_csv(logs_path)
    
    # Convert DataFrames to HF Datasets
    # Prompts acts as the "validation/test" set of questions
    prompts_ds = Dataset.from_pandas(df_prompts)
    
    # The logs act as the evaluations metadata
    evaluations_ds = Dataset.from_pandas(df_logs)

    ds_dict = DatasetDict({
        "prompts": prompts_ds,
        "evaluations": evaluations_ds
    })

    # Save to disk locally
    output_dir = "hf_dataset"
    os.makedirs(output_dir, exist_ok=True)
    ds_dict.save_to_disk(output_dir)
    print(f"✅ Saved HF dataset locally to ./{output_dir}")

    # Output as JSONL format for simple integration
    jsonl_dir = "hf_dataset_jsonl"
    os.makedirs(jsonl_dir, exist_ok=True)
    df_prompts.to_json(os.path.join(jsonl_dir, "prompts.jsonl"), orient="records", lines=True)
    df_logs.to_json(os.path.join(jsonl_dir, "evaluations.jsonl"), orient="records", lines=True)
    print(f"✅ Saved JSONL dataset locally to ./{jsonl_dir}")

    if push_to_hub:
        try:
            print(f"🚀 Pushing to HuggingFace Hub: {repo_name}...")
            # Note: Requires huggingface-cli login to be executed first
            ds_dict.push_to_hub(repo_name)
            print("✅ Successfully pushed to HuggingFace Hub!")
        except Exception as e:
            print(f"❌ Failed to push to HuggingFace: {e}")
            print("Make sure you are logged in via `huggingface-cli login`")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate HuggingFace Dataset")
    parser.add_argument("--push", action="store_true", help="Push to HuggingFace Hub directly")
    parser.add_argument("--repo", type=str, default="jacobkandel/LLM-Moderation-Audit", help="Target HF repository name")
    
    args = parser.parse_args()
    generate_hf_dataset(push_to_hub=args.push, repo_name=args.repo)
