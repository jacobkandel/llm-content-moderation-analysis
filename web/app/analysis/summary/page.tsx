'use client';

import Link from 'next/link';
import { useMemo, useEffect } from 'react';
import { useAnalysis } from '@/app/analysis/AnalysisContext';
import KeyMetrics from '@/components/KeyMetrics';
import RestrictivenessScale from '@/components/RestrictivenessScale';
import { CensorshipHeatmap } from '@/components/CensorshipHeatmap';
import SkeletonLoader from '@/components/SkeletonLoader';
import ShareButton from '@/components/ShareButton';
import { getLogoUrl, getProviderName } from '@/lib/provider-logos';
import { RelatedPages } from '@/components/ui/RelatedPages';

export default function SummaryPage() {
    const { loading, stats, efficiencyData, filteredAuditData, timelineDates, loadFullDetails, precomputedPrompts, precomputedLongitudinal, ensurePrompts } = useAnalysis();

    useEffect(() => {
        ensurePrompts();
    }, [ensurePrompts]);

    // Calculate metrics
    const totalCases = stats?.prompts.length || 0;
    const modelsCount = stats?.models.length || 0;
    const consistencyScore = stats?.reliability?.score ?? 0;
    const totalEvaluations = filteredAuditData?.length || stats?.prompts?.length * stats?.models?.length || 0;

    // Calculate relative time for last update
    const lastUpdated = useMemo(() => {
        if (!timelineDates || timelineDates.length === 0) return 'N/A';
        const lastDateStr = timelineDates[timelineDates.length - 1];
        const lastDate = new Date(lastDateStr);
        const today = new Date();

        // Reset time part for accurate day calculation
        lastDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = Math.abs(today.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        return `${diffDays} days ago`;
    }, [timelineDates]);

    const dateRange = timelineDates?.length > 0
        ? `${timelineDates[0]} to ${timelineDates[timelineDates.length - 1]}`
        : 'All Time';

    // Prepare model data for RestrictivenessScale
    const modelData = useMemo(() => {
        if (!efficiencyData) return [];
        return efficiencyData
            .filter(m => m.refusalRate !== undefined && m.refusalRate !== null)
            .map(m => ({
                name: m.fullName,
                displayName: m.name,
                refusalRate: m.refusalRate / 100,
                cost: m.costPer1k,
                total: m.total ?? 0,
            }));
    }, [efficiencyData]);

    // Use precomputed prompts list (instant, no CSV needed)
    const questions = useMemo(() => {
        return precomputedPrompts.map(p => ({
            id: p.id,
            text: p.text,
            category: p.category,
            source: p.source,
        }));
    }, [precomputedPrompts]);

    // Prepare models list for modal — use precomputed efficiency + longitudinal data (no CSV needed)
    const modelsList = useMemo(() => {
        if (!efficiencyData || efficiencyData.length === 0) return [];

        // Build a map of model → last tested date from longitudinal data
        const lastTestedMap: Record<string, string> = {};
        if (precomputedLongitudinal?.chartData) {
            const chartData = precomputedLongitudinal.chartData;
            // Walk dates in reverse to find last date each model had data
            for (let i = chartData.length - 1; i >= 0; i--) {
                const entry = chartData[i];
                for (const key of Object.keys(entry)) {
                    if (key === 'date' || key.endsWith('_count')) continue;
                    if (entry[key] !== null && entry[key] !== undefined && !lastTestedMap[key]) {
                        lastTestedMap[key] = entry.date;
                    }
                }
            }
        }

        return efficiencyData.map((m: any) => ({
            id: m.fullName,
            name: m.fullName,
            lastTested: lastTestedMap[m.fullName]
                ? new Date(lastTestedMap[m.fullName]).toLocaleDateString()
                : 'N/A',
            totalEvaluations: m.total || 0,
        })).sort((a: any, b: any) => b.totalEvaluations - a.totalEvaluations);
    }, [efficiencyData, precomputedLongitudinal]);

    if (loading) return <SkeletonLoader />;




    return (
        <div>
            {/* Share button */}
            {/* Overview Section */}
            {/* Overview Section */}
            <div className="mb-8">
                <KeyMetrics
                    totalCases={totalCases}
                    modelsCount={modelsCount}
                    consistencyScore={consistencyScore}
                    dateRange={dateRange}
                    totalEvaluations={totalEvaluations}
                    lastUpdated={lastUpdated}
                    questions={questions}
                    onOpenModal={loadFullDetails}
                    models={modelsList}
                />
            </div>



            {/* Restrictiveness Spectrum */}
            {modelData.length > 0 && (
                <RestrictivenessScale models={modelData} />
            )}



            <div className="mb-8">
                <CensorshipHeatmap
                    data={filteredAuditData}
                    title="Refusal Heatmap Details"
                    description="Detailed breakdown of refusal rates per model and category. Darker red indicates higher refusal rates."
                />
            </div>

            <RelatedPages
                title="Model Reliability"
                description="Are models consistent with their own rulings? Discover which models give the same answer to the same prompt."
                href="/analysis/reliability"
            />
        </div>
    );
}
