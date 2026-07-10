import type { JsonData } from '@/lib/data-loading';
import { Suspense } from 'react';
import CompareContent from './CompareContent';
import { RefreshCw } from 'lucide-react';
import fs from 'fs';
import path from 'path';
import type { Metadata } from 'next';

// Helper: extract a short display name from a model id like "openai/gpt-4o"
function modelDisplayName(id: string | null): string | null {
    if (!id) return null;
    const part = id.split('/').pop() ?? id;
    // Capitalise and clean up dashes/dots
    return part
        .replace(/[-_.]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Dynamic metadata driven by ?modelA=…&modelB=… query params
export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<{ modelA?: string; modelB?: string }>;
}): Promise<Metadata> {
    const params = await searchParams;
    const nameA = modelDisplayName(params.modelA ?? null);
    const nameB = modelDisplayName(params.modelB ?? null);

    const title =
        nameA && nameB
            ? `Compare ${nameA} vs ${nameB} | ModerationBias`
            : 'Model Comparison | ModerationBias';

    const description =
        nameA && nameB
            ? `Side-by-side analysis of ${nameA} vs ${nameB}: refusal rates, verbosity, category breakdowns, and statistical significance.`
            : 'Compare LLM content-moderation behaviour side-by-side: refusal rates, verbosity, category breakdowns, and statistical significance.';

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
        },
        twitter: {
            card: 'summary',
            title,
            description,
        },
    };
}

export default async function ComparePage() {
    // Read data server-side
    const compareDataPath = path.join(process.cwd(), 'public', 'compare_data.json');
    const pValuesPath = path.join(process.cwd(), 'public', 'significance_pairwise.json');

    let initialCompareData = null;
    let initialPValues = [];

    try {
        const compareFile = await fs.promises.readFile(compareDataPath, 'utf8');
        initialCompareData = JSON.parse(compareFile);
    } catch (e) {
        console.error('Failed to load compare_data.json on server', e);
    }

    try {
        const pValuesFile = await fs.promises.readFile(pValuesPath, 'utf8');
        const rawPValues = JSON.parse(pValuesFile);
        initialPValues = rawPValues.map((d: JsonData) => ({
            'Model A': d.modelA,
            'Model B': d.modelB,
            'P-Value': d.pValue,
            'Significant': d.significant ? 'YES' : 'NO'
        }));
    } catch (e) {
        console.error('Failed to load significance_pairwise.json on server', e);
    }

    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="h-8 w-8 animate-spin text-brand" />
                    <p className="text-muted-foreground animate-pulse">Initializing comparison tool...</p>
                </div>
            </div>
        }>
            <CompareContent
                initialCompareData={initialCompareData}
                initialPValues={initialPValues}
            />
        </Suspense>
    );
}
