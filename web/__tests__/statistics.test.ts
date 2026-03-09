import { describe, it, expect } from 'vitest';
import {
    calculateFleissKappa,
    interpretKappa,
    calculateCohensH,
    calculatePowerAnalysis,
} from '@/app/analysis/stats';

// ─────────────────────────────────────
// interpretKappa
// ─────────────────────────────────────
describe('interpretKappa', () => {
    it('returns "Poor agreement" for negative kappa', () => {
        expect(interpretKappa(-0.1)).toBe('Poor agreement');
    });
    it('returns "Slight agreement" for kappa 0–0.2', () => {
        expect(interpretKappa(0.1)).toBe('Slight agreement');
    });
    it('returns "Fair agreement" for kappa 0.2–0.4', () => {
        expect(interpretKappa(0.3)).toBe('Fair agreement');
    });
    it('returns "Moderate agreement" for kappa 0.4–0.6', () => {
        expect(interpretKappa(0.5)).toBe('Moderate agreement');
    });
    it('returns "Substantial agreement" for kappa 0.6–0.8', () => {
        expect(interpretKappa(0.7)).toBe('Substantial agreement');
    });
    it('returns "Almost perfect agreement" for kappa ≥ 0.8', () => {
        expect(interpretKappa(0.85)).toBe('Almost perfect agreement');
    });
});

// ─────────────────────────────────────
// calculateCohensH
// ─────────────────────────────────────
describe('calculateCohensH', () => {
    it('returns 0 when both proportions are equal', () => {
        expect(calculateCohensH(0.5, 0.5)).toBeCloseTo(0, 5);
    });
    it('returns positive value when proportions differ', () => {
        expect(calculateCohensH(0.3, 0.6)).toBeGreaterThan(0);
    });
    it('is symmetric (|h(p1,p2)| = |h(p2,p1)|)', () => {
        expect(calculateCohensH(0.2, 0.7)).toBeCloseTo(calculateCohensH(0.7, 0.2), 8);
    });
    it('returns known value for p1=0, p2=1 (max effect)', () => {
        // phi(0) = 0, phi(1) = π → |2arcsin(1) - 2arcsin(0)| = π
        expect(calculateCohensH(0, 1)).toBeCloseTo(Math.PI, 5);
    });
});

// ─────────────────────────────────────
// calculatePowerAnalysis
// ─────────────────────────────────────
describe('calculatePowerAnalysis', () => {
    it('returns 0 for zero effect size', () => {
        expect(calculatePowerAnalysis(0)).toBe(0);
    });
    it('returns a positive integer', () => {
        const n = calculatePowerAnalysis(0.3);
        expect(n).toBeGreaterThan(0);
        expect(Number.isInteger(n)).toBe(true);
    });
    it('larger effect size requires fewer samples', () => {
        const nSmall = calculatePowerAnalysis(0.1);
        const nLarge = calculatePowerAnalysis(0.5);
        expect(nSmall).toBeGreaterThan(nLarge);
    });
    it('returns reasonable n for a typical effect size (Cohen h = 0.3)', () => {
        // Known: ~176 per group at power=0.8, alpha=0.05 for h=0.3
        const n = calculatePowerAnalysis(0.3);
        expect(n).toBeGreaterThan(100);
        expect(n).toBeLessThan(400);
    });
});

// ─────────────────────────────────────
// calculateFleissKappa (integration)
// ─────────────────────────────────────
describe('calculateFleissKappa', () => {
    it('returns 0 score when no data', () => {
        const result = calculateFleissKappa([], [], []);
        expect(result.score).toBe(0);
    });

    it('returns near-1 kappa when all models agree (all ALLOWED)', () => {
        const models = ['gpt-4', 'claude', 'gemini'];
        const prompts = ['p1', 'p2'];
        const data = models.flatMap(model =>
            prompts.map(prompt => ({ model, case_id: prompt, verdict: 'ALLOWED' }))
        );
        const result = calculateFleissKappa(data, models, prompts);
        // Perfect agreement on ALLOWED → kappa ≈ 1
        expect(result.score).toBeCloseTo(1, 1);
    });

    it('returns near-1 kappa when all models agree (all REFUSAL)', () => {
        const models = ['gpt-4', 'claude'];
        const prompts = ['p1', 'p2', 'p3'];
        const data = models.flatMap(model =>
            prompts.map(prompt => ({ model, case_id: prompt, verdict: 'REFUSAL' }))
        );
        const result = calculateFleissKappa(data, models, prompts);
        expect(result.score).toBeCloseTo(1, 1);
    });

    it('returns kappa < 0.5 when models completely disagree', () => {
        const data = [
            { model: 'gpt-4', case_id: 'p1', verdict: 'ALLOWED' },
            { model: 'claude', case_id: 'p1', verdict: 'REFUSAL' },
            { model: 'gpt-4', case_id: 'p2', verdict: 'REFUSAL' },
            { model: 'claude', case_id: 'p2', verdict: 'ALLOWED' },
        ];
        const result = calculateFleissKappa(data, ['gpt-4', 'claude'], ['p1', 'p2']);
        expect(result.score).toBeLessThan(0.5);
    });

    it('returns an interpretation string', () => {
        const models = ['gpt-4'];
        const prompts = ['p1'];
        const data = [{ model: 'gpt-4', case_id: 'p1', verdict: 'ALLOWED' }];
        const result = calculateFleissKappa(data, models, prompts);
        expect(typeof result.interpretation).toBe('string');
        expect(result.interpretation.length).toBeGreaterThan(0);
    });
});
