'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalysis } from '@/app/analysis/AnalysisContext';
import dynamic from 'next/dynamic';
const ModelDrift = dynamic(() => import('@/components/ModelDrift').then((mod) => mod.ModelDrift), { ssr: false });
import SkeletonLoader from '@/components/SkeletonLoader';
import AnalysisOverview from '@/components/AnalysisOverview';
import { RelatedPages } from '@/components/ui/RelatedPages';

export default function DriftPage() {
    const router = useRouter();
    const { filteredDriftData: driftData, loading, ensureDrift } = useAnalysis();
    useEffect(() => { ensureDrift(); }, []);

    return (
        <div className="space-y-6">
            <AnalysisOverview
                title="Model Stability (Drift): Detecting Policy Changes"
                description="Model drift measures how much a model's refusal rate changes between the start and end of our testing period. Significant drift indicates that the model's content moderation policies have been updated, either becoming more restrictive (positive drift) or more permissive (negative drift). This helps us identify which models are actively adjusting their censorship policies and in which direction."
                importance="Tracking model stability is essential for internet openness because sudden policy changes can radically alter what content is accessible. When a widely-used AI model suddenly becomes more restrictive, millions of users may lose access to previously available information overnight—often without transparency about what changed or why. By measuring drift, we can detect these shifts early, hold companies accountable for policy changes, and warn users when their favorite models are becoming more censorious."
                metrics={[
                    "Drift Magnitude: Percentage point change in refusal rate over the testing period",
                    "Direction: Positive drift = more restrictive, negative drift = more permissive",
                    "Stability Score: Lower drift values indicate more stable, predictable moderation policies"
                ]}
            />
            {loading ? <SkeletonLoader /> : (
                <ModelDrift
                    data={driftData}
                    onModelClick={(modelId: string) => router.push(`/models/${modelId}`)}
                />
            )}

            <RelatedPages
                title="Statistical Significance"
                description="Are these refusal rate differences real, or just statistical noise? Explore pairwise p-values and significance testing."
                href="/analysis/significance"
            />
        </div>
    );
}
