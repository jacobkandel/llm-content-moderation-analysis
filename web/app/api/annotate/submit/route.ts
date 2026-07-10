import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';
import { sanitizeSegment, clampString, rateLimit, fetchJsonBlobs } from '@/lib/api-utils';

/**
 * POST /api/annotate/submit
 * Stores a human annotation verdict to Vercel Blob storage.
 *
 * Body: { itemId, model, verdict, annotatorId, category }
 *
 * Each annotation is stored as an individual blob file to avoid
 * race conditions from concurrent read-modify-write on shared files.
 */

// This route mutates/aggregates external state — never serve a cached copy.
export const dynamic = 'force-dynamic';

interface AnnotationPayload {
    itemId: string;
    model: string;
    verdict: 'ALLOWED' | 'REMOVED';
    confidence: 'high' | 'medium' | 'low';
    annotatorId: string;
    category: string;
    promptPreview: string;
    timeSpentMs: number;
}

const BLOB_PREFIX = 'annotations/';

// Basic in-memory rate limiting (resets when serverless instance shuts down, but provides baseline protection)
const rateLimitCache = new Map<string, { count: number, resetTime: number }>();
const MAX_ANNOTATIONS_PER_HOUR = 200;

export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const now = Date.now();

        if (!rateLimit(rateLimitCache, ip, MAX_ANNOTATIONS_PER_HOUR, now)) {
            return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
        }

        const body: AnnotationPayload = await request.json();

        // Validate required fields
        if (!body.itemId || !body.verdict || !body.annotatorId) {
            return NextResponse.json(
                { error: 'Missing required fields: itemId, verdict, annotatorId' },
                { status: 400 }
            );
        }

        if (!['ALLOWED', 'REMOVED'].includes(body.verdict)) {
            return NextResponse.json(
                { error: 'verdict must be ALLOWED or REMOVED' },
                { status: 400 }
            );
        }

        // Build the annotation record from a whitelist of fields with bounded
        // lengths — never spread the raw body, which would let a client store
        // arbitrary oversized attacker-controlled data.
        const record = {
            itemId: clampString(body.itemId, 128),
            model: clampString(body.model, 128),
            verdict: body.verdict,
            confidence: ['high', 'medium', 'low'].includes(body.confidence) ? body.confidence : 'high',
            annotatorId: clampString(body.annotatorId, 64),
            category: clampString(body.category, 64),
            promptPreview: clampString(body.promptPreview, 200),
            timeSpentMs: Number.isFinite(body.timeSpentMs) ? body.timeSpentMs : 0,
            timestamp: new Date().toISOString(),
            userAgent: request.headers.get('user-agent')?.slice(0, 100) || '',
        };

        // Write each annotation as its own blob file to prevent race conditions.
        // Previously, concurrent writes to a shared daily JSONL file caused data loss
        // because two requests would read the same content, both append, and the slower
        // write would overwrite the faster one.
        //
        // annotatorId is sanitized before it reaches the pathname so a value like
        // '../grades/x' cannot escape the annotations/ prefix.
        const date = new Date().toISOString().split('T')[0];
        const safeAnnotator = sanitizeSegment(body.annotatorId);
        const uniqueId = `${now}_${Math.random().toString(36).slice(2, 8)}`;
        const blobPath = `${BLOB_PREFIX}${date}/${safeAnnotator}_${uniqueId}.json`;

        await put(blobPath, JSON.stringify(record), {
            access: 'public',
            addRandomSuffix: false,
            contentType: 'application/json',
        });

        return NextResponse.json({
            success: true,
            message: 'Annotation saved',
            annotationId: `${safeAnnotator}_${sanitizeSegment(body.itemId, 128)}`,
        });
    } catch (error: unknown) {
        // Log full detail server-side; return a generic message so raw exception
        // text (paths, internals) never reaches the client.
        console.error('Annotation submission error:', error);
        return NextResponse.json(
            { error: 'Failed to save annotation' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/annotate/submit
 * Returns aggregate stats about collected annotations.
 */
interface AnnotationRecord {
    annotatorId?: string;
    verdict?: string;
}

export async function GET() {
    try {
        let totalAnnotations = 0;
        const uniqueAnnotators = new Set<string>();
        const verdictCounts: Record<string, number> = { ALLOWED: 0, REMOVED: 0 };
        let filesCount = 0;

        // Collect every blob URL across all pages (list() returns max 1000 per call),
        // then fetch them with bounded concurrency instead of a serial per-blob
        // waterfall — the old loop scaled linearly and would exceed the serverless
        // time limit once a few thousand annotations were collected.
        const urls: string[] = [];
        let cursor: string | undefined;
        do {
            const blobs = await list({ prefix: BLOB_PREFIX, cursor });
            filesCount += blobs.blobs.length;
            for (const blob of blobs.blobs) urls.push(blob.url);
            cursor = blobs.hasMore ? blobs.cursor : undefined;
        } while (cursor);

        const records = await fetchJsonBlobs<AnnotationRecord>(urls);
        for (const record of records) {
            totalAnnotations++;
            if (record.annotatorId) uniqueAnnotators.add(record.annotatorId);
            if (record.verdict) verdictCounts[record.verdict] = (verdictCounts[record.verdict] || 0) + 1;
        }

        return NextResponse.json({
            totalAnnotations,
            uniqueAnnotators: uniqueAnnotators.size,
            verdictCounts,
            filesCount,
        });
    } catch (e) {
        console.error('GET /api/annotate/submit error:', e);
        return NextResponse.json({
            totalAnnotations: 0,
            uniqueAnnotators: 0,
            verdictCounts: { ALLOWED: 0, REMOVED: 0 },
            filesCount: 0,
        });
    }
}
