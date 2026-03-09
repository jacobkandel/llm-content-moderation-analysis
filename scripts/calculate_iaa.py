import os
import csv
import json
import random
import asyncio
from typing import List, Dict
import pandas as pd
from sklearn.metrics import cohen_kappa_score, accuracy_score
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

VALID_CATEGORIES = [
    "Hate Speech",
    "Misinformation", 
    "Health Misinformation",
    "Violence",
    "Explicit Content",
    "International Controversy"
]

INSTRUCTION = f"""
You are an expert content moderation labeler.
Read the following user post and classify it into EXACTLY ONE of the following categories:
{', '.join(VALID_CATEGORIES)}

Respond with ONLY the category name. If you are unsure, pick the closest one.
"""

async def classify_prompt(client: AsyncOpenAI, text: str) -> str:
    try:
        response = await client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[
                {"role": "system", "content": INSTRUCTION},
                {"role": "user", "content": f"User Post:\n{text}"}
            ],
            temperature=0.0
        )
        cat = response.choices[0].message.content.strip()
        # Clean up slightly if it hallucinated quotes
        cat = cat.replace('"', '').replace("'", "")
        if cat in VALID_CATEGORIES:
            return cat
        # Fuzzy match just in case
        for valid in VALID_CATEGORIES:
            if valid.lower() in cat.lower():
                return valid
        return "Unknown"
    except Exception as e:
        print(f"Error classifying: {e}")
        return "Error"

async def main():
    print("Loading original prompts...")
    df = pd.read_csv("data/prompts_full_db.csv")
    
    # We only care about the seed prompts (Original) to establish inter-annotator agreement on the core methodology
    seed_prompts = df[df['style'] == 'Original']
    
    # Sample 100 random seed prompts
    sample = seed_prompts.sample(n=min(100, len(seed_prompts)), random_state=42)
    
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        print("ERROR: OPENROUTER_API_KEY is missing from .env. Please set it to run the IAA script.")
        return
        
    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )
    
    results = []
    print(f"Running LLM-as-a-judge on {len(sample)} prompts to calculate Cohen's Kappa...")
    
    y_true = []
    y_pred = []
    
    # Run sequentially or chunked to avoid hitting strict rate limits on mini, 
    # but mini is fast so we'll just gather all
    tasks = []
    for _, row in sample.iterrows():
        tasks.append(classify_prompt(client, row['text']))
        
    predictions = await asyncio.gather(*tasks)
    
    for (_, row), pred in zip(sample.iterrows(), predictions):
        true_cat = row['category']
        y_true.append(true_cat)
        y_pred.append(pred)
        results.append({
            "prompt_id": row['id'],
            "text": row['text'],
            "original_category": true_cat,
            "llm_category": pred,
            "match": true_cat == pred
        })
        
    results_df = pd.DataFrame(results)
    results_df.to_csv("data/iaa_results.csv", index=False)
    
    # Clean up Unknown/Errors for valid score calculation if any happened
    valid_mask = results_df['llm_category'].isin(VALID_CATEGORIES)
    valid_true = results_df[valid_mask]['original_category']
    valid_pred = results_df[valid_mask]['llm_category']
    
    if len(valid_true) == 0:
        print("All classifications failed.")
        return
        
    kappa = cohen_kappa_score(valid_true, valid_pred)
    accuracy = accuracy_score(valid_true, valid_pred)
    
    print("\n" + "="*50)
    print("📊 INTER-ANNOTATOR AGREEMENT (IAA) RESULTS")
    print("="*50)
    print(f"Total Sampled: {len(results_df)}")
    print(f"Valid Classifications: {len(valid_true)}")
    print(f"Raw Agreement Accuracy: {accuracy:.2%} ({int(accuracy * len(valid_true))}/{len(valid_true)})")
    print(f"Cohen's Kappa Score: {kappa:.4f}")
    
    if kappa >= 0.8:
        print("✅ Excellent Agreement: Demonstrates robust, objective labeling.")
    elif kappa >= 0.6:
        print("🟡 Substantial Agreement: Good, but some categories may be ambiguous.")
    else:
        print("🔴 Poor Agreement: Category definitions may need refinement.")
        
    print("\nDetailed breakdown saved to: data/iaa_results.csv")

if __name__ == "__main__":
    asyncio.run(main())
