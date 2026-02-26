'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Line } from 'recharts';
import SkeletonLoader from '@/components/SkeletonLoader';

import AnalysisOverview from '@/components/AnalysisOverview';
import { RelatedPages } from '@/components/ui/RelatedPages';

// Monochrome shades for lines
const MONO_SHADES = ['#000000', '#333333', '#666666', '#999999', '#AAAAAA', '#CCCCCC'];

export default function LongitudinalPage() {
    const { filteredAuditData, dateRange, loading, ensureAuditData, precomputedLongitudinal, selectedModels } = useAnalysis();
    const hasFilters = selectedModels.length > 0 || dateRange.start || dateRange.end;

    // Load CSV only when filters are active
    useEffect(() => { if (hasFilters) ensureAuditData(); }, [hasFilters]);
    // Local filter state for this view
    const [longitudinalModels, setLongitudinalModels] = useState<string[]>([]);

    const longitudinalData = useMemo(() => {
        // Use pre-computed data when no global filters active
        if (!hasFilters && precomputedLongitudinal) {
            const activeModels = longitudinalModels.length > 0
                ? longitudinalModels
                : precomputedLongitudinal.activeModels;
            // If local model filter, filter down the pre-computed chart data
            const chartData = longitudinalModels.length > 0
                ? precomputedLongitudinal.chartData.map((entry: any) => {
                    const row: any = { date: entry.date };
                    longitudinalModels.forEach((model: string) => {
                        if (entry[model] !== undefined) {
                            row[model] = entry[model];
                            if (entry[`${model}_count`] !== undefined) row[`${model}_count`] = entry[`${model}_count`];
                        }
                    });
                    return row;
                })
                : precomputedLongitudinal.chartData;
            return { chartData, activeModels };
        }

        if (filteredAuditData.length === 0) return { chartData: [], activeModels: [] };

        const filtered = filteredAuditData.filter((d) => longitudinalModels.length === 0 || longitudinalModels.includes(d.model));
        const uniqueDates = Array.from(new Set(filtered.map(d => d.timestamp?.split('T')[0] || 'Unknown'))).filter(d => d !== 'Unknown').sort();
        const activeModels = longitudinalModels.length > 0 ? longitudinalModels : Array.from(new Set(filtered.map(d => d.model)));

        const chartData = uniqueDates.map(date => {
            const dayRows = filtered.filter(d => (d.timestamp?.split('T')[0]) === date);
            const row: any = { date };
            activeModels.forEach(model => {
                const modelRows = dayRows.filter(d => d.model === model);
                if (modelRows.length > 0) {
                    const refusals = modelRows.filter(d => ['REFUSAL', 'REMOVED', 'unsafe', 'Hard Refusal'].includes(d.verdict)).length;
                    row[model] = (refusals / modelRows.length) * 100;
                    row[`${model}_count`] = modelRows.length;
                } else row[model] = null;
            });
            return row;
        });
        return { chartData, activeModels };
    }, [filteredAuditData, longitudinalModels, hasFilters, precomputedLongitudinal]);

    if (loading) return <SkeletonLoader />;

    return (
        <div className="space-y-6">
            <AnalysisOverview
                title="Longitudinal Analysis: Tracking Model Drift Over Time"
                description="AI models are constantly updated by their creators—sometimes multiple times per week. Each update can shift a model's content moderation policies, making it more or less restrictive. Longitudinal analysis tracks how refusal rates change over time, allowing us to detect when models become more censorious (or more permissive) and identify patterns in how companies adjust their content policies."
                importance="Understanding model drift is critical for internet openness because it reveals whether the AI gatekeepers of online discourse are becoming more restrictive over time. When major AI providers simultaneously tighten their moderation policies, it can create a 'chilling effect' across the entire internet, limiting what information and ideas are accessible to users. By tracking these changes longitudinally, we can hold AI companies accountable for shifts in their censorship practices and identify concerning trends before they become entrenched."
                metrics={[
                    "Refusal Rate Trajectory: Whether models are becoming more or less restrictive over time",
                    "Update Frequency: How often model behaviors change, indicating active policy adjustments",
                    "Synchronization Patterns: Whether multiple providers shift policies in tandem, suggesting industry-wide trends"
                ]}
            />

            <div className="bg-card p-6 rounded-2xl shadow-sm border border-border h-[500px]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className="text-lg font-bold text-foreground">Refusal Rate Over Time</h3>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground font-medium uppercase text-xs">Filter by Date:</span>
                        {(dateRange.start || dateRange.end) && (
                            <span className="text-xs text-muted-foreground italic">Global filtered applied via Dashboard Header</span>
                        )}
                    </div>
                </div>
                <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={longitudinalData.chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis unit="%" />
                        <RechartsTooltip />
                        <Legend />
                        {longitudinalData.activeModels.map((m: string, i: number) => (
                            <Line key={m} type="monotone" dataKey={m} stroke={MONO_SHADES[i % MONO_SHADES.length]} strokeWidth={2} dot={false} connectNulls />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <RelatedPages
                title="Evidence Locker"
                description="Ready to see the raw data? Dive into the interactive evidence locker to explore every single prompt and verdict."
                href="/analysis/evidence"
            />
        </div>
    );
}
