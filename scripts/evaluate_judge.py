import asyncio
import os
import sys
import pandas as pd
from openai import AsyncOpenAI
import logging

# Setup path and logging
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from src.taxonomy import TaxonomyClassifier
from src.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def compute_kappa(results_a, results_b):
    # Cohen's Kappa for categorical data
    try:
        from sklearn.metrics import cohen_kappa_score
        return cohen_kappa_score(results_a, results_b)
    except ImportError:
        # Fallback simple agreement rate if sklearn not installed
        agreements = sum(1 for a, b in zip(results_a, results_b) if a == b)
        return agreements / len(results_a) if results_a else 0

async def main():
    if not settings.openrouter_api_key:
        print("Missing OpenRouter API Key")
        return

    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.openrouter_api_key,
    )

    csv_path = "web/public/audit_log.csv"
    if not os.path.exists(csv_path):
        print("audit_log.csv not found.")
        return

    df = pd.read_csv(csv_path)
    # Get 100 random rows that have a response text
    sample_df = df.dropna(subset=['response_text']).sample(100, random_state=42)

    judge_gemini = TaxonomyClassifier(client, model="google/gemini-2.0-flash-001")
    judge_gpt = TaxonomyClassifier(client, model="openai/gpt-4o-mini")

    print(f"Evaluating {len(sample_df)} responses with Gemini 2.0 Flash and GPT-4o-Mini...")
    
    results_gemini = []
    results_gpt = []
    
    sem = asyncio.Semaphore(10)
    
    async def evaluate_row(prompt_text, response_text):
        async with sem:
            res_g = await judge_gemini.classify(prompt_text, response_text)
            res_gpt = await judge_gpt.classify(prompt_text, response_text)
            return res_g['category'], res_gpt['category']

    tasks = [evaluate_row(row['prompt_text'], row['response_text']) for _, row in sample_df.iterrows()]
    classifications = await asyncio.gather(*tasks)

    for g, gpt in classifications:
        results_gemini.append(g)
        results_gpt.append(gpt)

    kappa = compute_kappa(results_gemini, results_gpt)
    
    # Also simple agreement percentage
    agreements = sum(1 for a, b in zip(results_gemini, results_gpt) if a == b)
    print(f"\n--- Results ---")
    print(f"Total evaluated: {len(sample_df)}")
    print(f"Exact Agreement: {agreements}/{len(sample_df)} ({agreements/len(sample_df)*100:.1f}%)")
    print(f"Cohen's Kappa (κ): {kappa:.3f}")
    
    if kappa > 0.8:
        print("Excellent agreement! Your methodology is highly defensible.")
    elif kappa > 0.6:
        print("Substantial agreement. Methodology is solid.")
    else:
        print("Moderate/Poor agreement. May need to refine taxonomy prompt.")

if __name__ == "__main__":
    asyncio.run(main())
