/**
 * Shared, thread-agnostic helpers for turning a (possibly gzipped) audit-log
 * CSV buffer into `AuditRow[]`.
 *
 * These functions carry no reference to the DOM or to a Web Worker, so they can
 * run on the main thread (small "lite" CSV) or inside `csv-worker.ts` (the large
 * "full" CSV) without dragging worker-construction code into the worker bundle.
 */

import Papa from 'papaparse';
import type { AuditRow } from './data-loading';

/** Message posted to the CSV worker: the raw (gzipped) CSV bytes, transferred. */
export interface CsvWorkerRequest {
  buffer: ArrayBuffer;
}

/** Message posted back from the CSV worker: parsed rows, or an error string. */
export interface CsvWorkerResponse {
  rows?: AuditRow[];
  error?: string;
}

/**
 * Decompress a possibly-gzipped CSV `ArrayBuffer` to text.
 *
 * The `.csv.gz` files are served with `Content-Type: application/gzip` and no
 * `Content-Encoding`, so the browser hands back raw gzip bytes that we inflate
 * ourselves via `DecompressionStream`. Some hosts (e.g. Vercel) may transparently
 * decompress the response, in which case the bytes are already plain text —
 * detected by the absence of the gzip magic number (1F 8B).
 */
export async function decompressCsv(buffer: ArrayBuffer): Promise<string> {
  const view = new Uint8Array(buffer);
  // Check for gzip magic bytes (1F 8B)
  if (view.length >= 2 && view[0] === 0x1f && view[1] === 0x8b) {
    const ds = new DecompressionStream('gzip');
    const decompressedStream = new Response(buffer).body!.pipeThrough(ds);
    const reader = decompressedStream.getReader();

    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (result.value) chunks.push(result.value);
    }
    const decoder = new TextDecoder();
    return chunks.map((c) => decoder.decode(c, { stream: true })).join('');
  }
  // Vercel (or the browser) already decompressed it transparently
  return new TextDecoder().decode(buffer);
}

/**
 * The audit CSVs use the raw pipeline column names — `prompt_text`,
 * `response_text`, `test_date`, `run_cost` — but the app reads `prompt`,
 * `response`, `timestamp`, `cost`. These helpers bridge the two. Each prefers an
 * already-normalized value when present (`row.timestamp ?? …`), so they become
 * no-ops if a future export ships the normalized names. Without this bridge the
 * compare disagreement view, prompt search, date filtering, and cost totals all
 * silently read `undefined`/`0`.
 */
export const auditTimestamp = (row: Record<string, string>): string | undefined =>
  row.timestamp ?? row.test_date;

export const auditCost = (row: Record<string, string>): number => {
  const raw = row.cost ?? row.run_cost;
  return raw ? parseFloat(raw) : 0;
};

/**
 * Parse the full audit-log CSV text into `AuditRow[]` (keeps every column,
 * including prompt/response text) and normalize the raw column names the app
 * reads under different keys (see {@link auditTimestamp}/{@link auditCost}).
 */
export function parseFullCsvText(csvText: string): AuditRow[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  return parsed.data.map(
    (row): AuditRow =>
      ({
        ...row,
        prompt: row.prompt ?? row.prompt_text,
        response: row.response ?? row.response_text,
        timestamp: auditTimestamp(row),
        cost: auditCost(row),
      }) as AuditRow,
  );
}
