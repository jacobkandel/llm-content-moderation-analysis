import type { JsonData } from '@/lib/data-loading';
import { isRefusal } from '@/lib/verdicts';
/**
 * Statistical Analysis Library for Frontend
 */

export function calculateFleissKappa(data: JsonData[], models: string[], prompts: string[]): { score: number; interpretation: string } {
    if (prompts.length === 0 || models.length === 0) return { score: 0, interpretation: 'No data' };

    // Use the canonical refusal definition (src/refusal.py ↔ lib/verdicts.ts).
    const isUnsafe = (v: string) => isRefusal(v);

    const matrix: number[][] = [];
    const rowsByPrompt = new Map<string, JsonData[]>();
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

    let sum_P_i = 0;
    let validRows = 0;

    matrix.forEach(row => {
        const n_i = row[0] + row[1];
        if (n_i > 1) {
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

export function calculatePowerAnalysis(effectSize: number, _power: number = 0.8, _alpha: number = 0.05): number {
    const z_alpha = 1.96;
    const z_beta = 0.84;
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

export function bonferroniCorrect(pValues: number[]): number[] {
    const m = pValues.length;
    return pValues.map(p => Math.min(1, p * m));
}

export function benjaminiHochberg(pValues: number[]): number[] {
    const m = pValues.length;
    if (m === 0) return [];

    const indexed = pValues.map((p, i) => ({ p, i }));
    indexed.sort((a, b) => a.p - b.p);

    const adjusted = new Array(m).fill(1);
    let runningMin = 1;

    for (let rank = m; rank >= 1; rank--) {
        const { p, i } = indexed[rank - 1];
        const bhAdj = Math.min(1, (p * m) / rank);
        runningMin = Math.min(runningMin, bhAdj);
        adjusted[i] = runningMin;
    }

    return adjusted;
}
