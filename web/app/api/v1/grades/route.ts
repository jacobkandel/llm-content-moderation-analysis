import { NextResponse } from 'next/server';

/**
 * Human grading API — originally backed by better-sqlite3 which doesn't
 * work on Vercel serverless. Returning 501 until a proper persistence layer
 * (Vercel Postgres, KV, etc.) is wired in.
 */
export async function GET() {
    return NextResponse.json(
        { error: 'Grades API not yet implemented for serverless deployment.' },
        { status: 501 }
    );
}

export async function POST() {
    return NextResponse.json(
        { error: 'Grades API not yet implemented for serverless deployment.' },
        { status: 501 }
    );
}
