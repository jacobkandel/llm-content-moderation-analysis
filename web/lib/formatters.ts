/**
 * Shared formatting utilities for consistent display across the app.
 */

/**
 * Format a number as a percentage string with fixed decimals.
 * @example formatPercent(45.678, 1) => "45.7%"
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a large number with locale-appropriate separators.
 * @example formatNumber(123456) => "123,456"
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

/**
 * Format a p-value for display.
 * Very small p-values are shown in scientific notation.
 * @example formatPValue(0.00003) => "< 0.001"
 * @example formatPValue(0.042) => "0.042"
 */
export function formatPValue(p: number): string {
  if (p < 0.001) return '< 0.001';
  if (p < 0.01) return p.toFixed(3);
  return p.toFixed(2);
}

/**
 * Format a kappa score with interpretation label.
 * @example formatKappa(0.72) => "0.72 (Substantial)"
 */
export function formatKappa(kappa: number): string {
  return `${kappa.toFixed(2)} (${interpretKappa(kappa)})`;
}

/**
 * Interpret a Fleiss'/Cohen's Kappa score.
 */
export function interpretKappa(kappa: number): string {
  if (kappa >= 0.81) return 'Almost Perfect';
  if (kappa >= 0.61) return 'Substantial';
  if (kappa >= 0.41) return 'Moderate';
  if (kappa >= 0.21) return 'Fair';
  if (kappa >= 0) return 'Slight';
  return 'Poor';
}

/**
 * Interpret Cohen's h effect size.
 */
export function interpretEffectSize(h: number): string {
  if (h < 0.2) return 'negligible';
  if (h < 0.5) return 'small';
  if (h < 0.8) return 'medium';
  return 'large';
}

/**
 * Format a model ID to a display-friendly short name: drops the provider
 * prefix, a leading "~" (alias/"latest" pointer), and a trailing ":free" tag.
 * @example shortModelName("openai/gpt-4o-mini")            => "gpt-4o-mini"
 * @example shortModelName("~openai/gpt-mini-latest")       => "gpt-mini-latest"
 * @example shortModelName("nousresearch/hermes-3:free")    => "hermes-3"
 */
export function shortModelName(modelId: string): string {
  let s = modelId.startsWith('~') ? modelId.slice(1) : modelId;
  if (s.includes('/')) s = s.split('/').pop()!;
  return s.replace(/:free$/, '');
}

/**
 * Format a cost value in USD.
 * @example formatCost(0.0034) => "$0.0034"
 */
export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Format a date string to a short locale date.
 * @example formatDate("2025-03-15") => "Mar 15, 2025"
 */
export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
