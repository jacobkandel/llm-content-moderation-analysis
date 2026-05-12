"""
Statistical Analysis Module for LLM Content Moderation Analysis

Provides:
- Inter-rater reliability (Fleiss' Kappa)
- Power analysis for sample size requirements
- Effect size metrics (Cohen's d, odds ratio)
- Monte Carlo bootstrap confidence intervals
"""

import numpy as np
from typing import List, Dict, Tuple, Optional
from sklearn.metrics import cohen_kappa_score
import warnings


def calculate_fleiss_kappa(ratings_matrix: np.ndarray) -> float:
    """
    Calculate Fleiss' Kappa for inter-rater reliability among multiple raters.
    
    Args:
        ratings_matrix: N x k matrix where N is number of subjects,
                       k is number of categories, and values are counts
                       of raters who assigned that category.
    
    Returns:
        Fleiss' Kappa score (-1 to 1, where 1 is perfect agreement)
    
    Example:
        # 10 prompts, 3 categories (ALLOWED, REMOVED, REFUSAL), 5 raters (models)
        matrix = np.array([
            [3, 2, 0],  # Prompt 1: 3 models said ALLOWED, 2 said REMOVED
            [5, 0, 0],  # Prompt 2: All 5 models agreed ALLOWED
            ...
        ])
        kappa = calculate_fleiss_kappa(matrix)
    """
    N, k = ratings_matrix.shape
    
    if N == 0 or k == 0:
        return 0.0
        
    n = ratings_matrix.sum(axis=1)[0]  # Number of raters per subject
    
    if n == 0:
        return 0.0
    
    # Calculate proportion of all assignments to each category
    p_j = ratings_matrix.sum(axis=0) / (N * n)
    
    # Calculate P_i for each subject (extent of agreement)
    P_i = (ratings_matrix ** 2).sum(axis=1) - n
    P_i = P_i / (n * (n - 1))
    
    # Mean of P_i
    P_bar = P_i.mean()
    
    # Expected agreement by chance
    P_e = (p_j ** 2).sum()
    
    # Fleiss' Kappa
    if P_e == 1:
        return 1.0  # Perfect agreement
    
    kappa = (P_bar - P_e) / (1 - P_e)
    return float(kappa)


def calculate_pairwise_kappa(model1_verdicts: List[str], model2_verdicts: List[str]) -> float:
    """
    Calculate Cohen's Kappa between two models' verdicts.
    
    Args:
        model1_verdicts: List of verdicts from model 1
        model2_verdicts: List of verdicts from model 2
    
    Returns:
        Cohen's Kappa score
    """
    if len(model1_verdicts) != len(model2_verdicts):
        raise ValueError("Both verdict lists must have same length")
    
    if len(model1_verdicts) == 0:
        return 0.0
    
    return cohen_kappa_score(model1_verdicts, model2_verdicts)


def calculate_power_analysis(
    effect_size: float,
    alpha: float = 0.05,
    power: float = 0.80,
    n_groups: int = 2
) -> int:
    """
    Calculate required sample size for given effect size and power.
    
    Args:
        effect_size: Expected Cohen's h or w effect size (0.2=small, 0.5=medium, 0.8=large)
        alpha: Significance level (default 0.05)
        power: Desired statistical power (default 0.80)
        n_groups: Number of groups being compared
    
    Returns:
        Required sample size per group
    """
    try:
        from statsmodels.stats.power import GofChisquarePower
        analysis = GofChisquarePower()
        n = analysis.solve_power(effect_size=effect_size, alpha=alpha, power=power, n_bins=n_groups)
        return int(np.ceil(n))
    except ImportError:
        # Fallback approximation using chi-square rule of thumb
        # n ≈ (z_alpha + z_beta)^2 / effect_size^2
        z_alpha = 1.96 if alpha == 0.05 else 2.576
        z_beta = 0.84 if power == 0.80 else 1.28
        n = ((z_alpha + z_beta) ** 2) / (effect_size ** 2)
        return int(np.ceil(n))


def check_sample_adequacy(
    n_samples: int,
    n_categories: int,
    min_per_cell: int = 5
) -> Dict[str, any]:
    """
    Check if sample size is adequate for statistical analysis.
    
    Args:
        n_samples: Number of observations
        n_categories: Number of categories
        min_per_cell: Minimum expected frequency per cell (usually 5)
    
    Returns:
        Dictionary with adequacy assessment
    """
    expected_per_category = n_samples / n_categories
    is_adequate = expected_per_category >= min_per_cell
    
    min_recommended = min_per_cell * n_categories
    
    return {
        "is_adequate": is_adequate,
        "current_samples": n_samples,
        "expected_per_category": expected_per_category,
        "minimum_recommended": min_recommended,
        "deficit": max(0, min_recommended - n_samples),
        "warning": None if is_adequate else f"Need at least {min_recommended} samples for {n_categories} categories"
    }


def calculate_cohens_d(group1: List[float], group2: List[float]) -> float:
    """
    Calculate Cohen's d effect size for continuous variables.
    
    Args:
        group1: Values from first group
        group2: Values from second group
    
    Returns:
        Cohen's d effect size (0.2=small, 0.5=medium, 0.8=large)
    """
    n1, n2 = len(group1), len(group2)
    if n1 == 0 or n2 == 0:
        return 0.0
    
    mean1, mean2 = np.mean(group1), np.mean(group2)
    var1, var2 = np.var(group1, ddof=1), np.var(group2, ddof=1)
    
    # Pooled standard deviation
    pooled_std = np.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2))
    
    if pooled_std == 0:
        return 0.0
    
    return (mean1 - mean2) / pooled_std


def calculate_cohens_h(p1: float, p2: float) -> float:
    """
    Calculate Cohen's h effect size for proportions.
    
    Args:
        p1: Proportion in group 1 (0 to 1)
        p2: Proportion in group 2 (0 to 1)
    
    Returns:
        Cohen's h effect size (0.2=small, 0.5=medium, 0.8=large)
    """
    phi1 = 2 * np.arcsin(np.sqrt(p1))
    phi2 = 2 * np.arcsin(np.sqrt(p2))
    return abs(phi1 - phi2)


def calculate_odds_ratio(
    group1_success: int, group1_total: int,
    group2_success: int, group2_total: int
) -> Dict[str, float]:
    """
    Calculate odds ratio between two groups.
    
    Args:
        group1_success: Number of successes in group 1
        group1_total: Total in group 1
        group2_success: Number of successes in group 2
        group2_total: Total in group 2
    
    Returns:
        Dictionary with odds ratio and 95% CI
    """
    # Avoid division by zero
    a = group1_success + 0.5
    b = (group1_total - group1_success) + 0.5
    c = group2_success + 0.5
    d = (group2_total - group2_success) + 0.5
    
    odds_ratio = (a * d) / (b * c)
    
    # Log odds ratio SE
    se_log_or = np.sqrt(1/a + 1/b + 1/c + 1/d)
    
    # 95% CI
    log_or = np.log(odds_ratio)
    ci_lower = np.exp(log_or - 1.96 * se_log_or)
    ci_upper = np.exp(log_or + 1.96 * se_log_or)
    
    return {
        "odds_ratio": odds_ratio,
        "ci_lower": ci_lower,
        "ci_upper": ci_upper,
        "significant": ci_lower > 1 or ci_upper < 1  # CI doesn't include 1
    }


def bootstrap_confidence_interval(
    data: List[float],
    statistic_func: callable = np.mean,
    n_iterations: int = 10000,
    confidence_level: float = 0.95,
    seed: Optional[int] = None
) -> Tuple[float, float, float]:
    """
    Calculate Monte Carlo bootstrap confidence interval.
    
    Args:
        data: Original data points
        statistic_func: Function to compute statistic (default: mean)
        n_iterations: Number of bootstrap samples
        confidence_level: Confidence level (default 0.95)
        seed: Random seed for reproducibility
    
    Returns:
        Tuple of (lower_bound, statistic, upper_bound)
    """
    if seed is not None:
        np.random.seed(seed)
    
    data = np.array(data)
    n = len(data)
    
    if n == 0:
        return (0.0, 0.0, 0.0)
    
    # Generate bootstrap samples
    bootstrap_stats = []
    for _ in range(n_iterations):
        sample = np.random.choice(data, size=n, replace=True)
        bootstrap_stats.append(statistic_func(sample))
    
    # Calculate percentiles
    alpha = 1 - confidence_level
    lower = np.percentile(bootstrap_stats, (alpha / 2) * 100)
    upper = np.percentile(bootstrap_stats, (1 - alpha / 2) * 100)
    point_estimate = statistic_func(data)
    
    return (float(lower), float(point_estimate), float(upper))


def bootstrap_proportion_ci(
    successes: int,
    total: int,
    n_iterations: int = 10000,
    confidence_level: float = 0.95,
    seed: Optional[int] = None
) -> Tuple[float, float, float]:
    """
    Bootstrap confidence interval for a proportion.
    
    Args:
        successes: Number of successes
        total: Total trials
        n_iterations: Number of bootstrap iterations
        confidence_level: Confidence level
        seed: Random seed
    
    Returns:
        Tuple of (lower_bound, proportion, upper_bound) as percentages
    """
    if seed is not None:
        np.random.seed(seed)
    
    if total == 0:
        return (0.0, 0.0, 0.0)
    
    # Create binary data
    data = np.array([1] * successes + [0] * (total - successes))
    
    proportions = []
    for _ in range(n_iterations):
        sample = np.random.choice(data, size=total, replace=True)
        proportions.append(sample.mean())
    
    alpha = 1 - confidence_level
    lower = np.percentile(proportions, (alpha / 2) * 100) * 100
    upper = np.percentile(proportions, (1 - alpha / 2) * 100) * 100
    point = (successes / total) * 100
    
    return (float(lower), float(point), float(upper))


def interpret_kappa(kappa: float) -> str:
    """Interpret Fleiss' Kappa value."""
    if kappa < 0:
        return "Poor (worse than chance)"
    elif kappa < 0.20:
        return "Slight agreement"
    elif kappa < 0.40:
        return "Fair agreement"
    elif kappa < 0.60:
        return "Moderate agreement"
    elif kappa < 0.80:
        return "Substantial agreement"
    else:
        return "Almost perfect agreement"


def interpret_effect_size(h: float) -> str:
    """Interpret Cohen's h effect size."""
    if h < 0.2:
        return "negligible"
    elif h < 0.5:
        return "small"
    elif h < 0.8:
        return "medium"
    else:
        return "large"


def two_proportion_z_test(
    successes_1: int, total_1: int,
    successes_2: int, total_2: int,
    alpha: float = 0.05,
) -> Dict[str, float | bool | str]:
    """
    Two-proportion z-test for drift significance.

    Tests whether the change from refusal rate p1 (start of window) to p2 (end of window)
    is statistically significant, i.e., not explainable by sampling noise alone.

    Args:
        successes_1: Number of refusals in period 1 (start window)
        total_1:     Total prompts in period 1
        successes_2: Number of refusals in period 2 (end window)
        total_2:     Total prompts in period 2
        alpha:       Significance threshold (default 0.05)

    Returns:
        Dict with keys:
            p1          : Proportion 1
            p2          : Proportion 2
            z_score     : z-statistic
            p_value     : two-tailed p-value
            significant : True if p_value < alpha
            label       : Human-readable verdict
    """
    if total_1 == 0 or total_2 == 0:
        return {
            "p1": 0.0, "p2": 0.0,
            "z_score": 0.0, "p_value": 1.0,
            "significant": False, "label": "Insufficient data",
        }

    p1 = successes_1 / total_1
    p2 = successes_2 / total_2

    # Pooled proportion
    p_pooled = (successes_1 + successes_2) / (total_1 + total_2)
    se = np.sqrt(p_pooled * (1 - p_pooled) * (1 / total_1 + 1 / total_2))

    if se == 0:
        z = 0.0
    else:
        z = (p1 - p2) / se

    # Two-tailed p-value via normal CDF approximation (Abramowitz & Stegun)
    abs_z = abs(z)
    t = 1 / (1 + 0.2316419 * abs_z)
    poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
    p_one_tail = (1 / np.sqrt(2 * np.pi)) * np.exp(-0.5 * abs_z ** 2) * poly
    p_value = float(min(2 * p_one_tail, 1.0))

    significant = p_value < alpha
    direction = "more restrictive" if p2 > p1 else "more permissive"
    label = (
        f"Significant drift — model became {direction} (p={p_value:.3f})"
        if significant
        else f"No significant drift (p={p_value:.3f})"
    )

    return {
        "p1": round(p1, 4),
        "p2": round(p2, 4),
        "z_score": round(float(z), 4),
        "p_value": round(p_value, 4),
        "significant": significant,
        "label": label,
    }


def calculate_cramers_v(confusion_matrix: np.ndarray) -> float:
    """
    Calculate Cramér's V effect size for association between two categorical variables.
    
    Args:
        confusion_matrix: A 2D numpy array containing frequency counts.
        
    Returns:
        Cramér's V effect size (0 to 1, where 1 indicates perfect association).
    """
    from scipy.stats import chi2_contingency
    
    chi2 = chi2_contingency(confusion_matrix, correction=False)[0]
    n = confusion_matrix.sum()
    
    # Calculate min dimension - 1
    min_dim = min(confusion_matrix.shape) - 1
    
    if n == 0 or min_dim == 0:
        return 0.0
        
    v = np.sqrt(chi2 / (n * min_dim))
    return float(v)
