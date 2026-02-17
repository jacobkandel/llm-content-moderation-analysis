'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAnalysis } from '@/app/analysis/AnalysisContext';
import KeyMetrics from '@/components/KeyMetrics';
import RestrictivenessScale from '@/components/RestrictivenessScale';
import { CensorshipHeatmap } from '@/components/CensorshipHeatmap';
import SkeletonLoader from '@/components/SkeletonLoader';
import ShareButton from '@/components/ShareButton';
import { getLogoUrl, getProviderName } from '@/lib/provider-logos';

export default function SummaryPage() {
    const { loading, stats, efficiencyData, filteredAuditData, timelineDates, loadFullDetails } = useAnalysis();

    // Calculate metrics
    const totalCases = stats?.prompts.length || 0;
    const modelsCount = stats?.models.length || 0;
    const consistencyScore = stats?.reliability?.score ?? 0;
    const totalEvaluations = filteredAuditData?.length || 0;

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
                cost: m.costPer1k
            }));
    }, [efficiencyData]);

    // Extract unique questions
    const questions = useMemo(() => {
        if (!stats?.prompts || !filteredAuditData) return [];
        console.log("Generating questions list", { prompts: stats.prompts.length, data: filteredAuditData.length });
        const unique = new Map();
        stats.prompts.forEach((pId: string) => {
            const row = filteredAuditData.find(d => (d.case_id || d.prompt_id || d.prompt) === pId);
            if (row && !unique.has(pId)) {
                unique.set(pId, {
                    id: pId,
                    text: row.prompt,
                    category: row.category
                });
            }
        });
        return Array.from(unique.values());
    }, [stats?.prompts, filteredAuditData]);

    // Prepare models list for modal
    const modelsList = useMemo(() => {
        if (!stats?.models || !filteredAuditData) return [];

        return stats.models.map((modelId: string) => {
            const modelRows = filteredAuditData.filter(r => r.model === modelId);

            // Get latest timestamp
            let lastTested = 'N/A';
            if (modelRows.length > 0) {
                const maxDate = modelRows.reduce((max: number, row) => {
                    const current = new Date(row.timestamp).getTime();
                    return current > max ? current : max;
                }, 0);
                if (maxDate > 0) {
                    lastTested = new Date(maxDate).toLocaleDateString();
                }
            }

            const efficiencyInfo = efficiencyData?.find(e => e.name === modelId);
            const displayName = efficiencyInfo ? efficiencyInfo.fullName : modelId;

            return {
                id: modelId,
                name: displayName,
                lastTested,
                totalEvaluations: modelRows.length
            };
        }).sort((a: any, b: any) => b.totalEvaluations - a.totalEvaluations);
    }, [stats?.models, filteredAuditData, efficiencyData]);

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



            {/* Refusal Heatmap */}
            <div className="mb-8">
                <CensorshipHeatmap
                    data={filteredAuditData}
                    title="Refusal Heatmap Details"
                    description="Detailed breakdown of refusal rates per model and category. Darker red indicates higher refusal rates."
                />
            </div>
        </div>
    );
}
