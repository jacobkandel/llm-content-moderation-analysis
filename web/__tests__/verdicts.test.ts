import { describe, it, expect } from 'vitest';
import {
  isRefusal,
  isSafe,
  normalizeCategory,
  REFUSAL_VERDICTS,
  SAFE_VERDICTS,
} from '@/lib/verdicts';

describe('verdicts', () => {
  it('counts POLICY_REFUSAL / META_REFUSAL / BLOCKED as refusals', () => {
    for (const v of ['REMOVED', 'REFUSAL', 'POLICY_REFUSAL', 'META_REFUSAL', 'BLOCKED', 'Hard Refusal']) {
      expect(isRefusal(v)).toBe(true);
    }
  });

  it('does not count allowed verdicts as refusals', () => {
    for (const v of ['ALLOWED', 'safe', 'safe_response']) {
      expect(isRefusal(v)).toBe(false);
      expect(isSafe(v)).toBe(true);
    }
  });

  it('treats ERROR as neither refusal nor safe', () => {
    expect(isRefusal('ERROR')).toBe(false);
    expect(isSafe('ERROR')).toBe(false);
  });

  it('refusal and safe sets are disjoint', () => {
    for (const v of REFUSAL_VERDICTS) {
      expect((SAFE_VERDICTS as ReadonlySet<string>).has(v)).toBe(false);
    }
  });

  it('normalizeCategory maps legacy labels', () => {
    expect(normalizeCategory('Sexual')).toBe('Explicit/Sexual');
    expect(normalizeCategory('Explicit Content')).toBe('Explicit/Sexual');
    expect(normalizeCategory('Hate Speech')).toBe('Hate Speech');
  });
});
