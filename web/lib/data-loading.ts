/**
 * Data loading utilities for the audit log CSV.
 *
 * Handles fetching, decompressing (gzip), and parsing the audit log
 * in both "lite" mode (structural columns only) and "full" mode
 * (includes prompt text and response text).
 */

import Papa from 'papaparse';

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
 * @param useTraces - If true, loads from /assets/traces.json (pre-parsed).
 * @param lite - If true, strips text-heavy columns for faster initial load.
 */
export async function fetchAuditData(
  useTraces = false,
  lite = true,
): Promise<AuditRow[]> {
  if (useTraces) {
    const res = await fetch('/assets/traces.json');
    if (!res.ok) throw new Error(`Failed to load traces: ${res.status}`);
    return res.json();
  }

  // Fetch gzipped CSV
  const res = await fetch('/audit_log.csv.gz');
  if (!res.ok) throw new Error(`Failed to load audit log: ${res.status}`);

  const buffer = await res.arrayBuffer();
  let csvText = '';

  const view = new Uint8Array(buffer);
  // Check for gzip magic bytes (1F 8B)
  if (view.length >= 2 && view[0] === 0x1F && view[1] === 0x8B) {
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
    csvText = chunks.map(c => decoder.decode(c, { stream: true })).join('');
  } else {
    // Vercel (or the browser) already decompressed it transparently
    csvText = new TextDecoder().decode(buffer);
  }

  // Parse CSV with PapaParse
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  // Map to AuditRow[]
  const rows: AuditRow[] = parsed.data.map((row) => {
    if (lite) {
      const liteRow: Record<string, JsonData> = {};
      for (const key of Object.keys(row)) {
        if (LITE_COLUMNS.has(key)) {
          liteRow[key] = row[key];
        }
      }
      liteRow.cost = liteRow.cost ? parseFloat(liteRow.cost) : 0;
      return liteRow as AuditRow;
    }

    return {
      ...row,
      cost: row.cost ? parseFloat(row.cost) : 0,
    } as AuditRow;
  });

  return rows;
}
