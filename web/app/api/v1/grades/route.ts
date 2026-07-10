import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';
import { sanitizeSegment, clampString, rateLimit, fetchJsonBlobs } from '@/lib/api-utils';

/**
 * Human Grading API — backed by Vercel Blob storage.
 *
 * POST /api/v1/grades — Save a human grade for an audit result
 * GET  /api/v1/grades — Retrieve aggregated grades
 *
 * Each grade is stored as an individual blob file under grades/ to avoid
 * race conditions from concurrent writes (same pattern as annotations).
 */

// This route mutates/aggregates external state — never serve a cached copy.
export const dynamic = 'force-dynamic';

interface GradePayload {
    itemId: string;
    verdict: string;
    annotatorId: string;
    notes?: string;
    confidence?: 'high' | 'medium' | 'low';
    category?: string;
}

const BLOB_PREFIX = 'grades/';
const ALLOWED_VERDICTS = ['ALLOWED', 'REMOVED'];

// Baseline in-memory per-IP rate limiting (mirrors /api/annotate/submit).
const rateLimitCache = new Map<string, { count: number, resetTime: number }>();
const MAX_GRADES_PER_HOUR = 200;

export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        if (!rateLimit(rateLimitCache, ip, MAX_GRADES_PER_HOUR)) {
            return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
        }

        const body: GradePayload = await request.json();

        // Validate required fields
        if (!body.itemId || !body.verdict || !body.annotatorId) {
            return NextResponse.json(
                { error: 'Missing required fields: itemId, verdict, annotatorId' },
                { status: 400 }
            );
        }

        // Validate the verdict against an allowed set — previously any string was
        // accepted, which let callers poison the aggregated grade distribution.
        if (!ALLOWED_VERDICTS.includes(body.verdict)) {
            return NextResponse.json(
                { error: `verdict must be one of: ${ALLOWED_VERDICTS.join(', ')}` },
                { status: 400 }
            );
        }

        // Build the record from a bounded whitelist — never spread the raw body.
        const record = {
            itemId: clampString(body.itemId, 128),
            verdict: body.verdict,
            annotatorId: clampString(body.annotatorId, 64),
            notes: clampString(body.notes, 1000),
            confidence: ['high', 'medium', 'low'].includes(body.confidence as string) ? body.confidence : undefined,
            category: clampString(body.category, 64),
            timestamp: new Date().toISOString(),
        };

        // Write each grade as its own blob file to prevent race conditions.
        // Sanitize the user-controlled ids before they reach the pathname so a
        // value like '../annotations/x' cannot escape the grades/ prefix.
        const date = new Date().toISOString().split('T')[0];
        const safeAnnotator = sanitizeSegment(body.annotatorId);
        const safeItem = sanitizeSegment(body.itemId, 128);
        const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const blobPath = `${BLOB_PREFIX}${date}/${safeAnnotator}_${safeItem}_${uniqueId}.json`;

        await put(blobPath, JSON.stringify(record), {
            access: 'public',
            addRandomSuffix: false,
            contentType: 'application/json',
        });

        return NextResponse.json({
            success: true,
            message: 'Grade saved',
            gradeId: `${safeAnnotator}_${safeItem}`,
        });
    } catch (error: any) {
        console.error('Grade submission error:', error);
        return NextResponse.json(
            { error: 'Failed to save grade', details: error.message || String(error) },
            { status: 500 }
        );
    }
}

interface GradeRecord {
    annotatorId?: string;
    verdict?: string;
}

export async function GET() {
    try {
        let totalGrades = 0;
        const uniqueGraders = new Set<string>();
        const verdictCounts: Record<string, number> = {};

        // Collect every grade blob URL across all pages, then fetch with bounded
        // concurrency instead of a serial per-blob waterfall.
        const urls: string[] = [];
        let cursor: string | undefined;
        do {
            const blobs = await list({ prefix: BLOB_PREFIX, cursor });
            for (const blob of blobs.blobs) urls.push(blob.url);
            cursor = blobs.hasMore ? blobs.cursor : undefined;
        } while (cursor);

        const records = await fetchJsonBlobs<GradeRecord>(urls);
        for (const record of records) {
            totalGrades++;
            if (record.annotatorId) uniqueGraders.add(record.annotatorId);
            if (record.verdict) {
                verdictCounts[record.verdict] = (verdictCounts[record.verdict] || 0) + 1;
            }
        }

        return NextResponse.json({
            totalGrades,
            uniqueGraders: uniqueGraders.size,
            verdictCounts,
        });
    } catch (e) {
        console.error('GET /api/v1/grades error:', e);
        return NextResponse.json({
            totalGrades: 0,
            uniqueGraders: 0,
            verdictCounts: {},
        });
    }
}
