import { describe, it, expect } from 'vitest';
import { sanitizeSearchInput } from '@/lib/utils';

describe('sanitizeSearchInput', () => {
    it('returns empty string for empty input', () => {
        expect(sanitizeSearchInput('')).toBe('');
    });

    it('strips HTML angle brackets', () => {
        expect(sanitizeSearchInput('<script>alert(1)</script>')).not.toContain('<');
        expect(sanitizeSearchInput('<script>alert(1)</script>')).not.toContain('>');
    });

    it('strips single quotes', () => {
        expect(sanitizeSearchInput("it's a test")).not.toContain("'");
    });

    it('strips double quotes', () => {
        expect(sanitizeSearchInput('"quoted"')).not.toContain('"');
    });

    it('strips semicolons', () => {
        expect(sanitizeSearchInput('SELECT * FROM users;')).not.toContain(';');
    });

    it('trims whitespace from start and end', () => {
        expect(sanitizeSearchInput('  hello  ')).toBe('hello');
    });

    it('preserves normal search text', () => {
        expect(sanitizeSearchInput('Should abortion be legal?')).toBe('Should abortion be legal?');
    });

    it('preserves hyphens and numbers', () => {
        expect(sanitizeSearchInput('gun control 2024')).toBe('gun control 2024');
    });

    it('handles XSS attempt gracefully', () => {
        const result = sanitizeSearchInput('<img src=x onerror="alert(1)">');
        expect(result).not.toContain('<');
        expect(result).not.toContain('"');
    });
});
