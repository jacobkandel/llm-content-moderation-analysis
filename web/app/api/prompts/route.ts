import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const jsonPath = path.join(process.cwd(), 'public', 'prompts_list.json');

        try {
            const fileContent = await fs.promises.readFile(jsonPath, 'utf-8');
            const data = JSON.parse(fileContent);
            return NextResponse.json({ data });
        } catch {
            return NextResponse.json({ data: [], error: 'Prompts list JSON not found' });
        }
    } catch (error) {
        console.error('Error reading prompts data:', error);
        return NextResponse.json({ error: 'Failed to read prompts', details: String(error) }, { status: 500 });
    }
}
