import { NextResponse } from 'next/server';

/**
 * GET /api/export/csv
 *
 * Redirects to the publicly hosted audit log CSV on Vercel Blob storage.
 * Previously returned 501 because the original SQLite-backed implementation
 * doesn't work on Vercel serverless.
 */
const BLOB_CSV_URL = 'https://oeqbf51ent3zxva1.public.blob.vercel-storage.com/data/audit_log.csv.gz';

export async function GET() {
    return NextResponse.redirect(BLOB_CSV_URL);
}
