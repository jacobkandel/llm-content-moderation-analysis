import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/annotate
 * Returns a random prompt-response pair from the human audit pending file
 * or falls back to the audit log for annotation.
 */

interface AnnotationItem {
    id: string;
    model: string;
    promptText: string;
    responseText: string;
    aiLabel: string;
    category: string;
}

let cachedItems: AnnotationItem[] | null = null;

function loadAnnotationItems(): AnnotationItem[] {
    if (cachedItems) return cachedItems;

    // Try the human audit pending file first
    const pendingPath = path.join(process.cwd(), '..', 'data', 'human_audit_PENDING.csv');
    const auditPath = path.join(process.cwd(), 'public', 'audit_log_lite.csv');

    let csvPath = '';
    if (fs.existsSync(pendingPath)) {
        csvPath = pendingPath;
    } else if (fs.existsSync(auditPath)) {
        csvPath = auditPath;
    }

    if (!csvPath) {
        // Fallback: generate from summary stats
        return [];
    }

    try {
        const content = fs.readFileSync(csvPath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());
        if (lines.length < 2) return [];

        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        const items: AnnotationItem[] = [];

        for (let i = 1; i < lines.length && items.length < 500; i++) {
            // Simple CSV parsing (handles basic cases)
            const vals = lines[i].split(',');
            if (vals.length < header.length) continue;

            const row: Record<string, string> = {};
            header.forEach((h, idx) => { row[h] = (vals[idx] || '').trim(); });

            const responseText = row['response_text'] || row['response'] || '';
            if (!responseText || responseText.length < 20 || responseText.startsWith('ERROR')) continue;

            items.push({
                id: row['row_id'] || row['prompt_id'] || row['case_id'] || `item_${i}`,
                model: row['model'] || row['model_id'] || 'unknown',
                promptText: row['prompt_text'] || row['prompt'] || '',
                responseText: responseText.slice(0, 800),
                aiLabel: row['ai_label'] || row['verdict'] || '',
                category: row['category'] || 'Uncategorized',
            });
        }

        cachedItems = items;
        return items;
    } catch {
        return [];
    }
}

export async function GET(request: NextRequest) {
    const items = loadAnnotationItems();

    if (items.length === 0) {
        return NextResponse.json({ error: 'No annotation items available' }, { status: 404 });
    }

    // Get a specific item by ID or return a random one
    const url = new URL(request.url);
    const requestedId = url.searchParams.get('id');

    let item: AnnotationItem;
    if (requestedId) {
        item = items.find(i => i.id === requestedId) || items[Math.floor(Math.random() * items.length)];
    } else {
        item = items[Math.floor(Math.random() * items.length)];
    }

    return NextResponse.json({
        item,
        totalAvailable: items.length,
    });
}
