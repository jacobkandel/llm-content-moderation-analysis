import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

/**
 * Human Grading API — backed by Vercel Blob storage.
 *
 * POST /api/v1/grades — Save a human grade for an audit result
 * GET  /api/v1/grades — Retrieve aggregated grades
 *
 * Each grade is stored as an individual blob file under grades/ to avoid
 * race conditions from concurrent writes (same pattern as annotations).
 */

interface GradePayload {
    itemId: string;
    verdict: string;
    annotatorId: string;
    notes?: string;
    confidence?: 'high' | 'medium' | 'low';
    category?: string;
}

const BLOB_PREFIX = 'grades/';

export async function POST(request: NextRequest) {
    try {
        const body: GradePayload = await request.json();

        // Validate required fields
        if (!body.itemId || !body.verdict || !body.annotatorId) {
            return NextResponse.json(
                { error: 'Missing required fields: itemId, verdict, annotatorId' },
                { status: 400 }
            );
        }

        // Build the grade record
        const record = {
            ...body,
            timestamp: new Date().toISOString(),
        };

        // Write each grade as its own blob file to prevent race conditions
        const date = new Date().toISOString().split('T')[0];
        const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const blobPath = `${BLOB_PREFIX}${date}/${body.annotatorId}_${body.itemId}_${uniqueId}.json`;

        await put(blobPath, JSON.stringify(record), {
            access: 'public',
            addRandomSuffix: false,
            contentType: 'application/json',
        });

        return NextResponse.json({
            success: true,
            message: 'Grade saved',
            gradeId: `${body.annotatorId}_${body.itemId}`,
        });
    } catch (error: any) {
        console.error('Grade submission error:', error);
        return NextResponse.json(
            { error: 'Failed to save grade', details: error.message || String(error) },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        let totalGrades = 0;
        const uniqueGraders = new Set<string>();
        const verdictCounts: Record<string, number> = {};

        // Paginate through all grade blobs
        let cursor: string | undefined;
        do {
            const blobs = await list({ prefix: BLOB_PREFIX, cursor });

            for (const blob of blobs.blobs) {
                try {
                    const response = await fetch(blob.url);
                    if (!response.ok) continue;
                    const content = await response.text();

                    // Handle both JSONL (legacy) and individual JSON files
                    const lines = content.split('\n').filter(l => l.trim());
                    for (const line of lines) {
                        try {
                            const record = JSON.parse(line);
                            totalGrades++;
                            if (record.annotatorId) uniqueGraders.add(record.annotatorId);
                            if (record.verdict) {
                                verdictCounts[record.verdict] = (verdictCounts[record.verdict] || 0) + 1;
                            }
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
