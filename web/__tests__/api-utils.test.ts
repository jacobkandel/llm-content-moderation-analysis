import { describe, it, expect } from 'vitest';
import { sanitizeSegment, clampString, rateLimit } from '@/lib/api-utils';

describe('sanitizeSegment (blob path-injection guard)', () => {
  it('strips slashes so a segment cannot escape its prefix', () => {
    // Dots may remain, but with no '/' there is no path traversal.
    expect(sanitizeSegment('../grades/x')).toBe('..gradesx');
    expect(sanitizeSegment('../grades/x')).not.toContain('/');
    expect(sanitizeSegment('a/b/c')).toBe('abc');
    expect(sanitizeSegment('..%2f..%2f')).not.toContain('/');
  });

  it('keeps safe characters', () => {
    expect(sanitizeSegment('anon_9f8a-b2.1')).toBe('anon_9f8a-b2.1');
  });

  it('caps length', () => {
    expect(sanitizeSegment('a'.repeat(500), 64).length).toBe(64);
  });

  it('falls back to anon for empty/garbage', () => {
    expect(sanitizeSegment('')).toBe('anon');
    expect(sanitizeSegment('////')).toBe('anon');
    expect(sanitizeSegment(null)).toBe('anon');
  });
});

describe('clampString', () => {
  it('truncates to max length', () => {
    expect(clampString('hello world', 5)).toBe('hello');
  });
  it('coerces non-strings', () => {
    expect(clampString(12345, 3)).toBe('123');
    expect(clampString(null, 10)).toBe('');
  });
});

describe('rateLimit', () => {
  it('allows up to the limit then blocks', () => {
    const store = new Map();
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(store, '1.2.3.4', 3, now)).toBe(true);
    }
    expect(rateLimit(store, '1.2.3.4', 3, now)).toBe(false);
  });

  it('resets after the window', () => {
    const store = new Map();
    expect(rateLimit(store, 'ip', 1, 1000)).toBe(true);
    expect(rateLimit(store, 'ip', 1, 1000)).toBe(false);
    // Advance past the 1h reset window.
    expect(rateLimit(store, 'ip', 1, 1000 + 3_600_001)).toBe(true);
  });

  it('tracks IPs independently', () => {
    const store = new Map();
    expect(rateLimit(store, 'a', 1, 1)).toBe(true);
    expect(rateLimit(store, 'b', 1, 1)).toBe(true);
    expect(rateLimit(store, 'a', 1, 1)).toBe(false);
  });
});
