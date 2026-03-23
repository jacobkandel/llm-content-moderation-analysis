
import asyncio
import pandas as pd
import argparse
from openai import AsyncOpenAI
from src.config import settings
from src.logger import logger

# Configuration
OPTIMIZER_MODEL = "openai/gpt-4o"  # Use a smart model for meta-prompting

async def analyze_failures(audit_file: str, category: str = None):
    """
    Reads audit logs, identifies failures, and generates a policy patch.
    """
    logger.info(f"Reading audit log: {audit_file}")
    try:
        df = pd.read_csv(audit_file)
    except Exception as e:
        logger.error(f"Failed to read file: {e}")
        return

    # Identify failures in two modes:
    #
    # Mode 1 (preferred): human_verdict column present — use ground truth mismatches.
    # Mode 2 (heuristic): no ground truth available — treat all verdicts of 'refusal'
    #   as false positives for the purpose of prompt optimization. This is an explicit
    #   assumption and should be scoped to a specific category via --category.
    if 'human_verdict' in df.columns:
        # High-quality: use human-labeled mismatches as failures
        failures = df[df['original_verdict'] != df['human_verdict']]
        logger.info(f"Found {len(failures)} human-labeled failures.")
    else:
        # Heuristic fallback: treat refusals as over-refusals for optimization.
        # Pass --category to narrow the scope (e.g. 'creative_writing').
        failures = df[df['verdict'] == 'refusal']
        if category:
            failures = failures[failures['category'] == category]
        logger.info(
            f"Analyzing {len(failures)} refusals as assumed false positives "
            f"(heuristic mode — provide human_verdict column for ground-truth mode)."
        )

    if failures.empty:
        logger.warning("No failures found to analyze.")
        return

    # Prepare context for the Optimizer
    examples = []
    for _, row in failures.head(10).iterrows(): # Limit context
        examples.append(f"Prompt: {row.get('prompt', '')}\nModel Parsed Verdict: {row.get('verdict', '')}\nResponse Snippet: {str(row.get('response', ''))[:200]}...")

    examples_text = "\n---\n".join(examples)

    system_prompt = f"""
    You are an expert AI Policy Optimizer. 
    Your goal is to write a System Prompt that enables an LLM to handle the following edge cases correctly.
    
    The user is complaining that the model is OVER-REFUSING (i.e., False Positives).
    Below are examples of prompts that were refused but should likely be allowed (or at least handled better).
    
    Analyze the common patterns in these failures.
    Then, write a new System Prompt (or a patch paragraph) that explicitly instructs the model how to handle this nuance.
    
    Format your response as:
    ### Analysis
    [Analysis of why it failed]
    
    ### Suggested System Prompt
    [The new prompt text]
    """

    user_message = f"Here are the failure cases:\n\n{examples_text}"

    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.openrouter_api_key,
    )

    logger.info("Sending failure cases to Optimizer Model...")
    try:
        response = await client.chat.completions.create(
            model=OPTIMIZER_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
        )
        
        suggestion = response.choices[0].message.content
        
        # Save output
        timestamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
        filename = f"policy_suggestion_{timestamp}.md"
        with open(filename, "w") as f:
            f.write(suggestion)
            
        logger.info(f"Optimization complete. Recommendation saved to {filename}")
        print(f"\n--- Policy Tuner Recommendation ---\n{suggestion}")

    except Exception as e:
        logger.error(f"Optimization failed: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Automated Policy Tuner")
    parser.add_argument("--input", type=str, default="public/audit_log.csv", help="Path to audit log or failures file")
    parser.add_argument("--category", type=str, help="Specific category to optimize for")
    
    args = parser.parse_args()
    
    asyncio.run(analyze_failures(args.input, args.category))
