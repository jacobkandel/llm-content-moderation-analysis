/**
 * Web Worker: decompresses and parses the FULL audit-log CSV off the main thread.
 *
 * The full CSV is ~230MB decompressed; running `DecompressionStream` +
 * `Papa.parse` on the main thread janks the UI for seconds. This worker receives
 * the gzipped bytes as a transferred `ArrayBuffer`, does the heavy work here, and
 * posts back the parsed `AuditRow[]`.
 *
 * Instantiated from `data-loading.ts` via
 * `new Worker(new URL('./csv-worker.ts', import.meta.url))` — webpack bundles this
 * file (and its imports, including PapaParse) into a separate worker chunk.
 */

import { decompressCsv, parseFullCsvText } from './csv-parse';
import type { CsvWorkerRequest, CsvWorkerResponse } from './csv-parse';

// The dedicated-worker global scope, typed minimally. We avoid the `webworker`
// TS lib (it clashes with the project's `dom` lib on shared names like `self`),
// so we narrow `self` to just the message API this worker uses.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<CsvWorkerRequest>) => void) | null;
  postMessage: (message: CsvWorkerResponse) => void;
};

scope.onmessage = async (event) => {
  try {
    const csvText = await decompressCsv(event.data.buffer);
    const rows = parseFullCsvText(csvText);
    scope.postMessage({ rows });
  } catch (err) {
    scope.postMessage({
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
