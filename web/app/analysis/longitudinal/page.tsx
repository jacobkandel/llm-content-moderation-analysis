'use client';
import type { JsonData } from '@/lib/data-loading';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Line } from 'recharts';
import SkeletonLoader from '@/components/SkeletonLoader';
import { useRouter } from 'next/navigation';

import AnalysisOverview from '@/components/AnalysisOverview';
import { RelatedPages } from '@/components/ui/RelatedPages';

// Distinct categorical colors for the lines
const CHART_COLORS = [
    '#800000', // Maroon
    '#A6A6A6', // Greystone
    '#EAAA00', // Goldenrod
    '#007396', // Lake
    '#789D4A', // Ivy
    '#59315F', // Violet
    '#DE7C00', // Terracotta
    '#275D38', // Forest
    '#A4343A', // Brick
    '#737373', // Dark Greystone
];

export default function LongitudinalPage() {
    const { filteredAuditData, dateRange, setDateRange, loading, ensureAuditData, precomputedLongitudinal, selectedModels } = useAnalysis();
    const hasFilters = selectedModels.length > 0 || dateRange.start || dateRange.end;
    const router = useRouter();

    // Load CSV only when filters are active
    useEffect(() => { if (hasFilters) ensureAuditData(); }, [hasFilters, ensureAuditData]);
    // Local filter state for this view
    const [longitudinalModels] = useState<string[]>([]);

    const longitudinalData = useMemo(() => {
        // Use pre-computed data when no global filters active
        if (!hasFilters && precomputedLongitudinal) {
            const activeModels = longitudinalModels.length > 0
                ? longitudinalModels
                : precomputedLongitudinal.activeModels;
            // If local model filter, filter down the pre-computed chart data
            const chartData = longitudinalModels.length > 0
                ? precomputedLongitudinal.chartData.map((entry: JsonData) => {
                    const row: JsonData = { date: entry.date };
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
            const row: JsonData = { date };
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

            <div className="bg-card p-6 rounded-2xl shadow-sm border border-border flex flex-col h-[500px] md:h-[600px]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className="text-lg font-bold text-foreground">Refusal Rate Over Time</h3>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground font-medium uppercase text-xs">Filter by Date:</span>
                        {(dateRange.start || dateRange.end) ? (
                            <button
                                onClick={() => setDateRange({ start: '', end: '' })}
                                className="text-xs text-brand hover:underline font-medium"
                            >
                                Clear Filter
                            </button>
                        ) : (
                            <span className="text-xs text-muted-foreground italic">Click any point to filter evidence by date</span>
                        )}
                    </div>
                </div>
                <div className="flex-1 w-full overflow-x-auto overflow-y-hidden pb-4">
                    <div className="min-w-[700px] h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={longitudinalData.chartData}
                                onClick={(data: JsonData) => {
                                    if (data && data.activePayload && data.activePayload.length > 0) {
                                        const clickedDate = data.activePayload[0].payload.date;
                                        setDateRange({ start: clickedDate, end: clickedDate });
                                        router.push('/compare'); // Optionally take them to compare page to see evidence
                                    }
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                    tickMargin={10}
                                    minTickGap={30}
                                />
                                <YAxis
                                    unit="%"
                                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                {longitudinalData.activeModels.map((m: string, i: number) => (
                                    <Line
                                        key={m}
                                        type="monotone"
                                        dataKey={m}
                                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                                        strokeWidth={3}
                                        dot={{ r: 4, strokeWidth: 2 }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        connectNulls
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <RelatedPages
                title="Model Stability (Drift)"
                description="How much do these models change over time? Track refusal rate shifts to see if policies are becoming stricter or more lenient."
                href="/analysis/drift"
            />
        </div>
    );
}
