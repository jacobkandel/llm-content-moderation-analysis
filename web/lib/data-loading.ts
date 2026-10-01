/**
 * Data loading utilities for the audit log CSV.
 *
 * Handles fetching, decompressing (gzip), and parsing the audit log
 * in both "lite" mode (structural columns only) and "full" mode
 * (includes prompt text and response text).
 */

import Papa from 'papaparse';
import { auditCost, auditTimestamp, decompressCsv, parseFullCsvText } from './csv-parse';
import type { CsvWorkerRequest, CsvWorkerResponse } from './csv-parse';

/**
 * Loosely-typed value from one of the pre-computed JSON datasets (drift,
 * consensus, political, heatmap, …). These files have heterogeneous, evolving
 * shapes and are consumed dynamically across the app, so we intentionally model
 * them as `any` rather than forcing brittle interfaces that fall out of date.
 * Prefer a concrete type whenever a shape is actually stable.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonData = any;

export interface AuditRow {
  model: string;
  verdict: string;
  category: string;
  prompt: string;
  response?: string;
  response_text?: string;
  case_id: string;
  prompt_id?: string;
  timestamp?: string;
  style?: string;
  cost?: number;
  model_version?: string;
  [key: string]: JsonData;
}

/** Columns included in lite mode (no prompt/response text = much smaller). */
const LITE_COLUMNS = new Set([
  'model', 'verdict', 'category', 'case_id', 'prompt_id',
  'timestamp', 'style', 'cost', 'model_version',
]);

/**
 * Fetch and parse the audit log CSV.
 *
 * @param lite - If true, loads the pre-stripped lite CSV (no prompt/response
 *   text = much smaller) instead of the full file.
 */
export async function fetchAuditData(
  lite = true,
): Promise<AuditRow[]> {
  // Fetch gzipped CSV. In lite mode fetch the pre-stripped lite file (much smaller —
  // no prompt/response text) instead of downloading the full CSV only to discard
  // the text columns client-side.
  const csvUrl = lite ? '/audit_log_lite.csv.gz' : '/audit_log.csv.gz';
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`Failed to load audit log (${csvUrl}): ${res.status}`);

  const buffer = await res.arrayBuffer();

  // Full CSV (~230MB decompressed): offload decompression + parsing to a Web
  // Worker so the main thread stays responsive while the user keeps interacting.
  // The lite CSV (~3MB) is small enough to decompress + parse inline without
  // noticeable jank, and staying on-thread avoids the worker's startup cost.
  if (!lite) {
    return parseFullCsvInWorker(buffer);
  }

  const csvText = await decompressCsv(buffer);

  // Parse CSV with PapaParse
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  // Map to AuditRow[], keeping only the lite structural columns. The lite CSV
  // has no prompt/response text, but it does carry timestamp/cost under the raw
  // column names (test_date/run_cost), so normalize those the same way the full
  // path does (see auditTimestamp/auditCost).
  const rows: AuditRow[] = parsed.data.map((row) => {
    const liteRow: Record<string, JsonData> = {};
    for (const key of Object.keys(row)) {
      if (LITE_COLUMNS.has(key)) {
        liteRow[key] = row[key];
      }
    }
    liteRow.timestamp = auditTimestamp(row);
    liteRow.cost = auditCost(row);
    return liteRow as AuditRow;
  });

  return rows;
}

/**
 * Decompress + parse the full audit-log CSV in a Web Worker so the ~230MB
 * DecompressionStream + PapaParse work runs off the main thread. The gzipped
 * bytes are transferred (not copied) into the worker; the parsed rows come back
 * via structured clone.
 *
 * KNOWN LIMITATION: returning the full ~2.5M-row array structured-clones it back
 * onto the main thread, and *deserializing* that many objects is itself a
 * multi-second main-thread cost (empirically ≈ the parse it replaced). So this
 * keeps the main thread free during decompress+parse but does NOT eliminate the
 * end-of-load hitch. Chunked/streamed postback doesn't help either — the worker
 * serializes and the main thread deserializes in lockstep, so the main thread
 * never goes idle. Fully removing the freeze requires not materializing all rows
 * on the main thread at all — i.e. doing the reduction (disagreement pairing,
 * per-model stats) inside the worker and returning only the small result set.
 *
 * Falls back to on-thread parsing where `Worker` is unavailable (e.g. SSR or a
 * test/JSDOM environment) so the function's contract holds everywhere.
 */
function parseFullCsvInWorker(buffer: ArrayBuffer): Promise<AuditRow[]> {
  if (typeof Worker === 'undefined') {
    return decompressCsv(buffer).then(parseFullCsvText);
  }

  return new Promise<AuditRow[]>((resolve, reject) => {
    const worker = new Worker(new URL('./csv-worker.ts', import.meta.url));

    worker.onmessage = (event: MessageEvent<CsvWorkerResponse>) => {
      const { rows, error } = event.data;
      worker.terminate();
      if (error) reject(new Error(error));
      else resolve(rows ?? []);
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(`CSV worker failed: ${event.message}`));
    };

    // Transfer the ArrayBuffer to avoid copying the (~26MB gzipped) bytes.
    const request: CsvWorkerRequest = { buffer };
    worker.postMessage(request, [buffer]);
  });
}
