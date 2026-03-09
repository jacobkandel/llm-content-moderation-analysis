
/**
 * Statistical Analysis Library for Frontend
 * Ported from src/statistics.py
 */

export function calculateFleissKappa(data: any[], models: string[], prompts: string[]): { score: number; interpretation: string } {
    // 1. Create Matrix: Rows = Prompts, Cols = Categories (Allowed, Refusal)
    // Actually Fleiss is for fixed number of raters (models) assigning items (prompts) to categories.
    // Categories: [0: Allowed/Safe, 1: Refusal/Unsafe]

    if (prompts.length === 0 || models.length === 0) return { score: 0, interpretation: 'No data' };

    const n = models.length; // number of raters per subject
    const N = prompts.length; // number of subjects
    const k = 2; // number of categories (Safe vs Unsafe) for simplicity, or we can use raw verdicts

    // SAFE vs UNSAFE — META_REFUSAL and POLICY_REFUSAL are both "unsafe" for agreement purposes
    const isUnsafe = (v: string) => ['REFUSAL', 'META_REFUSAL', 'POLICY_REFUSAL', 'REMOVED', 'BLOCKED', 'unsafe'].includes(v);

    // Build N x k matrix
    // cell[i][j] = number of raters who assigned category j to subject i
    const matrix: number[][] = []; // N rows

    // Optimization: Pre-group rows by prompt ID to avoid O(N^2) filter in loop
    const rowsByPrompt = new Map<string, any[]>();
    for (const row of data) {
        const id = row.case_id || row.prompt || row.prompt_id;
        if (!id) continue;
        if (!rowsByPrompt.has(id)) rowsByPrompt.set(id, []);
        rowsByPrompt.get(id)!.push(row);
    }

    for (const prompt of prompts) {
        let safeCount = 0;
        let unsafeCount = 0;

        const promptRows = rowsByPrompt.get(prompt) || [];

        promptRows.forEach(row => {
            if (models.includes(row.model)) {
                if (isUnsafe(row.verdict)) unsafeCount++;
                else safeCount++;
            }
        });

        matrix.push([safeCount, unsafeCount]);
    }

    // Calculation
    // P_j = proportion of all assignments to jth category
    let totalAssignments = 0;
    const p_j = [0, 0];

    matrix.forEach(row => {
        const rowTotal = row[0] + row[1];
        if (rowTotal > 0) {
            totalAssignments += rowTotal;
            p_j[0] += row[0];
            p_j[1] += row[1];
        }
    });

    if (totalAssignments === 0) return { score: 0, interpretation: 'No valid ratings' };

    const P_j = p_j.map(x => x / totalAssignments);

    // P_i = extent to which raters agree for the ith subject
    let sum_P_i = 0;
    let validRows = 0;

    matrix.forEach(row => {
        const n_i = row[0] + row[1];
        if (n_i > 1) { // Need at least 2 raters to agree
            const sum_sq = (row[0] * row[0]) + (row[1] * row[1]);
            const Pi = (sum_sq - n_i) / (n_i * (n_i - 1));
            sum_P_i += Pi;
            validRows++;
        }
    });

    if (validRows === 0) return { score: 0, interpretation: 'Insufficient overlap' };

    const P_bar = sum_P_i / validRows;
    const P_e = (P_j[0] * P_j[0]) + (P_j[1] * P_j[1]);

    if (P_e === 1) return { score: 1, interpretation: 'Perfect Agreement' };

    const kappa = (P_bar - P_e) / (1 - P_e);

    return {
        score: kappa,
        interpretation: interpretKappa(kappa)
    };
}

export function interpretKappa(k: number): string {
    if (k < 0) return "Poor agreement";
    if (k < 0.2) return "Slight agreement";
    if (k < 0.4) return "Fair agreement";
    if (k < 0.6) return "Moderate agreement";
    if (k < 0.8) return "Substantial agreement";
    return "Almost perfect agreement";
}

export function calculatePowerAnalysis(effectSize: number, power: number = 0.8, alpha: number = 0.05): number {
    // Simplified approximation: n = (combined_z / effect_size)^2
    // Z_alpha/2 (two tailed) for 0.05 is 1.96
    // Z_beta for 0.8 is 0.84

    // For Cohen's h:
    // N per group = 2 * ( (z_alpha + z_beta) / h )^2

    // Standard Z values
    const z_alpha = 1.96; // for 0.05
    const z_beta = 0.84;  // for 0.80 power

    if (effectSize === 0) return 0;

    const numerator = z_alpha + z_beta;
    const result = 2 * Math.pow(numerator / effectSize, 2);

    return Math.ceil(result);
}

export function calculateCohensH(p1: number, p2: number): number {
    const phi1 = 2 * Math.asin(Math.sqrt(p1));
    const phi2 = 2 * Math.asin(Math.sqrt(p2));
    return Math.abs(phi1 - phi2);
}

/**
 * Wilson score confidence interval for a proportion.
 * More accurate than normal approximation, especially near 0 or 1.
 * Returns [lower, upper] bounds at the given confidence level.
 *
 * @param successes  Number of "successes" (e.g. refusals)
 * @param n          Total observations
 * @param z          Z-score for confidence level (default 1.96 = 95%)
 */
export function wilsonCI(successes: number, n: number, z: number = 1.96): { lower: number; upper: number; center: number } {
    if (n === 0) return { lower: 0, upper: 0, center: 0 };
    const p_hat = successes / n;
    const z2 = z * z;
    const denominator = 1 + z2 / n;
    const center = (p_hat + z2 / (2 * n)) / denominator;
    const margin = (z / denominator) * Math.sqrt((p_hat * (1 - p_hat)) / n + z2 / (4 * n * n));
    return {
        lower: Math.max(0, center - margin),
        upper: Math.min(1, center + margin),
        center,
    };
}

/**
 * Apply Bonferroni correction to a set of p-values.
 * Adjusts each p-value by multiplying by the total number of comparisons (m).
 * Caps at 1.0.
 *
 * @param pValues  Array of raw p-values
 * @returns        Array of Bonferroni-adjusted p-values (same order)
 */
export function bonferroniCorrect(pValues: number[]): number[] {
    const m = pValues.length;
    return pValues.map(p => Math.min(1, p * m));
}

/**
 * Apply Benjamini-Hochberg FDR correction to a set of p-values.
 * Less conservative than Bonferroni; controls the false discovery rate.
 * Returns adjusted p-values in the ORIGINAL order (not sorted).
 *
 * @param pValues  Array of raw p-values
 * @returns        Array of BH-adjusted p-values (same order as input)
 */
export function benjaminiHochberg(pValues: number[]): number[] {
    const m = pValues.length;
    if (m === 0) return [];

    // Create indexed array and sort by p-value ascending
    const indexed = pValues.map((p, i) => ({ p, i }));
    indexed.sort((a, b) => a.p - b.p);

    // BH adjustment: p_adj[k] = p[k] * m / rank (rank is 1-indexed)
    const adjusted = new Array(m).fill(1);
    let runningMin = 1;

    // Process from largest to smallest to enforce monotonicity
    for (let rank = m; rank >= 1; rank--) {
        const { p, i } = indexed[rank - 1];
        const bhAdj = Math.min(1, (p * m) / rank);
        runningMin = Math.min(runningMin, bhAdj);
        adjusted[i] = runningMin;
    }

    return adjusted;
}
