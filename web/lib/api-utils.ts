/**
 * Shared helpers for the write/aggregate API routes (annotations & grades).
 *
 * These routes persist crowd-sourced records as individual blobs and later
 * aggregate them, so they need (a) safe blob pathnames built from
 * user-controlled ids, (b) a lightweight per-IP rate limit, and (c) a bounded,
 * parallel blob fetch when aggregating.
 */

/**
 * Make a request-supplied id safe to interpolate into a blob pathname.
 *
 * Strips anything outside [A-Za-z0-9._-] (which removes '/', '..', whitespace,
 * etc. that could escape the intended prefix) and caps the length so a hostile
 * or buggy client cannot create absurdly long or deeply-nested paths.
 */
export function sanitizeSegment(input: unknown, maxLen = 64): string {
  const s = typeof input === 'string' ? input : String(input ?? '');
  const cleaned = s.replace(/[^A-Za-z0-9._-]/g, '').slice(0, maxLen);
  return cleaned || 'anon';
}

/** Clamp an arbitrary string field to a maximum length (for stored records). */
export function clampString(input: unknown, maxLen: number): string {
  const s = typeof input === 'string' ? input : String(input ?? '');
  return s.slice(0, maxLen);
}

interface RateEntry {
  count: number;
  resetTime: number;
}

/**
 * Best-effort in-memory per-IP rate limiter. Resets when the serverless
 * instance recycles, so it is a baseline guard against abuse rather than a
 * durable quota. Returns true if the request is allowed.
 */
export function rateLimit(
  store: Map<string, RateEntry>,
  ip: string,
  maxPerHour: number,
  now: number = Date.now(),
): boolean {
  const entry = store.get(ip) || { count: 0, resetTime: now + 3_600_000 };
  if (now > entry.resetTime) {
    entry.count = 0;
    entry.resetTime = now + 3_600_000;
  }
  if (entry.count >= maxPerHour) {
    store.set(ip, entry);
    return false;
  }
  entry.count++;
  store.set(ip, entry);
  return true;
}

/**
 * Fetch and JSON-parse a list of blob URLs with bounded concurrency, so
 * aggregating thousands of individual records does not run as a serial
 * request-per-blob waterfall (which blows past the serverless time limit).
 */
export async function fetchJsonBlobs<T = unknown>(
  urls: string[],
  concurrency = 12,
): Promise<T[]> {
  const results: T[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < urls.length) {
      const index = cursor++;
      try {
        const res = await fetch(urls[index]);
        if (!res.ok) continue;
        const text = await res.text();
        // Support both individual JSON files and legacy JSONL (one record per line).
        for (const line of text.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            results.push(JSON.parse(trimmed) as T);
          } catch {
            /* skip malformed line */
          }
        }
      } catch {
        /* skip unreachable blob */
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, worker);
  await Promise.all(workers);
  return results;
}
