import { describe, it, expect } from 'vitest';
import { getPromptSource, getSourceBadgeClass } from '@/lib/prompt-source';

describe('getPromptSource', () => {
    it('returns Unknown for undefined input', () => {
        expect(getPromptSource(undefined)).toBe('Unknown');
    });

    it('returns Unknown for empty string', () => {
        expect(getPromptSource('')).toBe('Unknown');
    });

    it('identifies Template-Generated for GEN- prefix without style suffix', () => {
        expect(getPromptSource('GEN-001')).toBe('Template-Generated');
    });

    it('identifies Style Variant for GEN- with -DIRECT suffix', () => {
        expect(getPromptSource('GEN-001-DIRECT')).toBe('Style Variant');
    });

    it('identifies Style Variant for GEN- with -ROLEPLAY suffix', () => {
        expect(getPromptSource('gen-002-roleplay')).toBe('Style Variant');
    });

    it('identifies Style Variant for GEN- with -ACADEMIC suffix', () => {
        expect(getPromptSource('GEN-003-ACADEMIC')).toBe('Style Variant');
    });

    it('identifies Style Variant for GEN- with -CASUAL suffix', () => {
        expect(getPromptSource('GEN-004-CASUAL')).toBe('Style Variant');
    });

    it('identifies Boundary Test for B- prefix', () => {
        expect(getPromptSource('B-001')).toBe('Boundary Test');
    });

    it('identifies False Positive Control for FPC- prefix', () => {
        expect(getPromptSource('FPC-001')).toBe('False Positive Control');
    });

    it('falls back to Hand-Written for unrecognized IDs', () => {
        expect(getPromptSource('WIKI-005')).toBe('Hand-Written');
        expect(getPromptSource('some-random-id')).toBe('Hand-Written');
    });

    it('is case-insensitive', () => {
        expect(getPromptSource('gen-001-direct')).toBe('Style Variant');
        expect(getPromptSource('b-042')).toBe('Boundary Test');
        expect(getPromptSource('fpc-010')).toBe('False Positive Control');
    });
});

describe('getSourceBadgeClass', () => {
    it('returns blue class for Hand-Written', () => {
        expect(getSourceBadgeClass('Hand-Written')).toContain('blue');
    });

    it('returns amber class for Template-Generated', () => {
        expect(getSourceBadgeClass('Template-Generated')).toContain('amber');
    });

    it('returns purple class for Style Variant', () => {
        expect(getSourceBadgeClass('Style Variant')).toContain('purple');
    });

    it('returns red class for Boundary Test', () => {
        expect(getSourceBadgeClass('Boundary Test')).toContain('red');
    });

    it('returns green class for False Positive Control', () => {
        expect(getSourceBadgeClass('False Positive Control')).toContain('green');
    });

    it('returns muted class for unknown source', () => {
        expect(getSourceBadgeClass('Unknown')).toContain('muted');
    });
});
