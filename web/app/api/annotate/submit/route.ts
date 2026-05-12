import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

/**
 * POST /api/annotate/submit
 * Stores a human annotation verdict to Vercel Blob storage.
 * 
 * Body: { itemId, model, verdict, annotatorId, category }
 * 
 * Annotations are appended to a JSONL file in Vercel Blob for easy analysis.
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

        // Append to a daily JSONL file in Vercel Blob
        const date = new Date().toISOString().split('T')[0];
        const blobPath = `${BLOB_PREFIX}${date}.jsonl`;

        // Read existing content if any
        let existingContent = '';
        try {
            const blobs = await list({ prefix: blobPath });
            if (blobs.blobs.length > 0) {
                const existingBlob = blobs.blobs[0];
                const response = await fetch(existingBlob.url);
                existingContent = await response.text();
            }
        } catch {
            // File doesn't exist yet — that's fine
        }

        // Append the new record
        const newContent = existingContent + JSON.stringify(record) + '\n';

        // Write back to blob (overwrite with appended content)
        await put(blobPath, newContent, {
            access: 'public',
            addRandomSuffix: false,
            contentType: 'application/x-ndjson',
            allowOverwrite: true,
        });

        return NextResponse.json({
            success: true,
            message: 'Annotation saved',
            annotationId: `${body.annotatorId}_${body.itemId}`,
        });
    } catch (error: any) {
        console.error('Annotation submission error:', error);
        return NextResponse.json(
            { error: 'Failed to save annotation', details: error.message || String(error) },
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
        const blobs = await list({ prefix: BLOB_PREFIX });
        
        let totalAnnotations = 0;
        const uniqueAnnotators = new Set<string>();
        const verdictCounts: Record<string, number> = { ALLOWED: 0, REMOVED: 0 };

        for (const blob of blobs.blobs) {
            try {
                const response = await fetch(blob.url);
                const content = await response.text();
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
            } catch {
                // Skip unreadable blobs
            }
        }

        return NextResponse.json({
            totalAnnotations,
            uniqueAnnotators: uniqueAnnotators.size,
            verdictCounts,
            filesCount: blobs.blobs.length,
        });
    } catch {
        return NextResponse.json({
            totalAnnotations: 0,
            uniqueAnnotators: 0,
            verdictCounts: { ALLOWED: 0, REMOVED: 0 },
            filesCount: 0,
        });
    }
}
