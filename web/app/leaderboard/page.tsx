import { promises as fs } from 'fs';
import path from 'path';
import type { Metadata } from 'next';
import LeaderboardClient from './LeaderboardClient';

export const metadata: Metadata = {
    title: 'Model Leaderboard — Moderation Bias',
    description: 'All 27 LLMs ranked by content moderation refusal rate with confidence intervals. Filter by category, sort by any metric.',
    openGraph: {
        title: 'LLM Moderation Leaderboard — Moderation Bias',
        description: 'Sortable rankings of 27 AI models by refusal rate across 16 harm categories.',
    },
};

export default async function LeaderboardPage() {
    let compareData = null;
    try {
        const filePath = path.join(process.cwd(), 'public', 'compare_data.json');
        const raw = await fs.readFile(filePath, 'utf8');
        compareData = JSON.parse(raw);
    } catch (e) {
        console.error('Failed to load compare_data.json', e);
    }

    return <LeaderboardClient compareData={compareData} />;
}
