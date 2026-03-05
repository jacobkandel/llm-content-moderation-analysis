import { describe, it, expect } from 'vitest';

/**
 * Tests for `parseReportMetadata` — extracted as a pure function for testability.
 * Mirrors the implementation in OverviewContent.tsx.
 */
function parseReportMetadata(content: string) {
    const match = content.match(/^<!--\s*generated:(\S+)\s+kappa:(\S+)\s+models:(\S+)\s*-->\s*/);
    if (!match) return { body: content };
    return {
        generated: match[1],
        kappa: match[2],
        models: match[3],
        body: content.slice(match[0].length),
    };
}

describe('parseReportMetadata', () => {
    it('extracts all three fields from a valid header', () => {
        const content = `<!-- generated:2026-03-01 kappa:0.1180 models:20 -->\n# Report body`;
        const result = parseReportMetadata(content);
        expect(result.generated).toBe('2026-03-01');
        expect(result.kappa).toBe('0.1180');
        expect(result.models).toBe('20');
    });

    it('strips the header from the body', () => {
        const content = `<!-- generated:2026-03-01 kappa:0.2 models:5 -->\n# Body`;
        const result = parseReportMetadata(content);
        expect(result.body).toBe('# Body');
        expect(result.body).not.toContain('<!--');
    });

    it('returns full content as body when no header present', () => {
        const content = '# Plain report with no metadata';
        const result = parseReportMetadata(content);
        expect(result.body).toBe(content);
        expect(result.generated).toBeUndefined();
        expect(result.kappa).toBeUndefined();
        expect(result.models).toBeUndefined();
    });

    it('handles extra whitespace inside the comment', () => {
        const content = `<!--  generated:2026-01-15  kappa:0.55  models:18  -->\nBody text`;
        const result = parseReportMetadata(content);
        expect(result.generated).toBe('2026-01-15');
        expect(result.kappa).toBe('0.55');
        expect(result.models).toBe('18');
    });

    it('returns only body when header fields are missing', () => {
        const content = `<!-- generated:2026-03-01 -->\nIncomplete header`;
        const result = parseReportMetadata(content);
        // Incomplete header — no kappa/models fields — treated as no-header
        expect(result.body).toBe(content);
    });

    it('does not strip non-header comments from body', () => {
        const content = '# Report\n<!-- internal comment -->';
        const result = parseReportMetadata(content);
        expect(result.body).toContain('<!-- internal comment -->');
    });

    it('handles an empty string', () => {
        const result = parseReportMetadata('');
        expect(result.body).toBe('');
        expect(result.generated).toBeUndefined();
    });
});
