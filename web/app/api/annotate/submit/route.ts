import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

/**
 * POST /api/annotate/submit
 * Stores a human annotation verdict to Vercel Blob storage.
 * 
 * Body: { itemId, model, verdict, annotatorId, category }
 * 
 * Each annotation is stored as an individual blob file to avoid
 * race conditions from concurrent read-modify-write on shared files.
 */

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
        
        const userLimit = rateLimitCache.get(ip) || { count: 0, resetTime: now + 3600000 };
        if (now > userLimit.resetTime) {
            userLimit.count = 0;
            userLimit.resetTime = now + 3600000;
        }
        
        if (userLimit.count >= MAX_ANNOTATIONS_PER_HOUR) {
            return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
        }
        
        userLimit.count++;
        rateLimitCache.set(ip, userLimit);

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

        // Build the annotation record
        const record = {
            ...body,
            timestamp: new Date().toISOString(),
            userAgent: request.headers.get('user-agent')?.slice(0, 100) || '',
        };

        // Write each annotation as its own blob file to prevent race conditions.
        // Previously, concurrent writes to a shared daily JSONL file caused data loss
        // because two requests would read the same content, both append, and the slower
        // write would overwrite the faster one.
        const date = new Date().toISOString().split('T')[0];
        const uniqueId = `${now}_${Math.random().toString(36).slice(2, 8)}`;
        const blobPath = `${BLOB_PREFIX}${date}/${body.annotatorId}_${uniqueId}.json`;

        await put(blobPath, JSON.stringify(record), {
            access: 'public',
            addRandomSuffix: false,
            contentType: 'application/json',
        });

        return NextResponse.json({
            success: true,
            message: 'Annotation saved',
            annotationId: `${body.annotatorId}_${body.itemId}`,
        });
    } catch (error: unknown) {
        console.error('Annotation submission error:', error);
        return NextResponse.json(
            { error: 'Failed to save annotation', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

/**
 * GET /api/annotate/submit
 * Returns aggregate stats about collected annotations.
 */
export async function GET() {
    try {
        let totalAnnotations = 0;
        const uniqueAnnotators = new Set<string>();
        const verdictCounts: Record<string, number> = { ALLOWED: 0, REMOVED: 0 };
        let filesCount = 0;

        // Paginate through all annotation blobs (list() returns max 1000 per call)
        let cursor: string | undefined;
        do {
            const blobs = await list({ prefix: BLOB_PREFIX, cursor });
            filesCount += blobs.blobs.length;

            for (const blob of blobs.blobs) {
                try {
                    const response = await fetch(blob.url);
                    if (!response.ok) continue;
                    const content = await response.text();

                    // Handle both old JSONL files (multiple lines) and new individual JSON files
                    const lines = content.split('\n').filter(l => l.trim());
                    for (const line of lines) {
                        try {
                            const record = JSON.parse(line);
                            totalAnnotations++;
                            if (record.annotatorId) uniqueAnnotators.add(record.annotatorId);
                            if (record.verdict) verdictCounts[record.verdict] = (verdictCounts[record.verdict] || 0) + 1;
                        } catch {
                            // Skip malformed lines
                        }
                    }
                } catch (e) {
                    console.error(`Error reading blob ${blob.pathname}:`, e);
                }
            }

            cursor = blobs.hasMore ? blobs.cursor : undefined;
        } while (cursor);

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
