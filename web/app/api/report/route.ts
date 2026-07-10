import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const reportPath = path.join(process.cwd(), 'public', 'latest_report.md');

        try {
            const content = await fs.promises.readFile(reportPath, 'utf-8');
            return NextResponse.json({ content });
        } catch {
            return NextResponse.json({ content: '', error: 'Report not found' });
        }
    } catch {
        return NextResponse.json({ error: 'Failed to read report', content: '' }, { status: 500 });
    }
}
