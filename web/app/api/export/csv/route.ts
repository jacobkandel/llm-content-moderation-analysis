import { NextResponse } from 'next/server';

/**
 * Server-side CSV export — originally backed by better-sqlite3.
 * The DataTable component already handles client-side CSV export.
 * Returning 501 until a proper persistence layer is wired in.
 */
export async function GET() {
    return NextResponse.json(
        { error: 'Server-side CSV export not yet implemented. Use the Export button in the Database view instead.' },
        { status: 501 }
    );
}
