'use client';

import { useEffect } from 'react';
import { useAnalysis } from '@/app/analysis/AnalysisContext';
import dynamic from 'next/dynamic';
const SemanticClustersView = dynamic(() => import('@/components/SemanticClusters').then((mod) => mod.SemanticClustersView), { ssr: false });
import SkeletonLoader from '@/components/SkeletonLoader';
import AnalysisOverview from '@/components/AnalysisOverview';
import { RelatedPages } from '@/components/ui/RelatedPages';

export default function ClustersPage() {
    const { filteredClusters: clusters, loading, ensureClusters } = useAnalysis();
    useEffect(() => { ensureClusters(); }, [ensureClusters]);

    if (loading) return <SkeletonLoader />;

    return (
        <div className="space-y-6">
            <AnalysisOverview
                title="Semantic Clusters: Mapping Censorship by Topic"
                description="Refused prompts aren't random—they cluster around specific topics and themes. Using natural language processing and clustering algorithms (like K-Means or DBSCAN), we group refused prompts by semantic similarity to identify which subjects trigger the highest refusal rates. This reveals the 'forbidden topics' that models are specifically trained to avoid, from politics and religion to health and sexuality."
                importance="Semantic clustering is vital for understanding internet openness because it exposes systematic topic-based censorship. When we discover that prompts about 'elections' cluster together with a 90% refusal rate, it reveals that political discourse is being suppressed. When 'LGBTQ+' forms its own high-refusal cluster, it indicates biased moderation against specific communities. By mapping the semantic landscape of censorship, we can identify which ideas and subjects are being systematically excluded from AI-mediated discourse, allowing advocates to target interventions where they're most needed."
                metrics={[
                    "Cluster Coherence: How semantically similar prompts within a cluster are (higher = more focused topics)",
                    "Cluster Refusal Rate: Percentage of prompts in each cluster that were refused",
                    "Topic Labeling: Automated identification of the main theme/subject for each cluster"
                ]}
            />
            <SemanticClustersView clusters={clusters} />

            <RelatedPages
                title="Censorship Triggers"
                description="What words or topics automatically trigger a refusal? Discover the hidden rules guiding AI moderation."
                href="/analysis/triggers"
            />
        </div>
    );
}
