'use client';
import type { JsonData } from '@/lib/data-loading';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { Scale } from 'lucide-react';
import { TOOLTIP_STYLE, TOOLTIP_CURSOR, AXIS_TICK_STYLE, GRID_STYLE } from '@/lib/chart-theme';

interface CouncilConsensusProps {
    data?: JsonData[];
}

const COLORS = ['#800000', '#737373', '#EAAA00', '#A4343A', '#007396', '#275D38'];

export function CouncilConsensus({ data = [] }: CouncilConsensusProps) {
    // Aggregate data by consensus_leaning (the actual useful dimension)
    const leaningData = useMemo(() => {
        if (data.length === 0) return [];

        const leaningMap = new Map<string, { count: number; totalAgreement: number }>();
        data.forEach((row: JsonData) => {
            const leaning = row.consensus_leaning || 'Unknown';
            if (!leaningMap.has(leaning)) leaningMap.set(leaning, { count: 0, totalAgreement: 0 });
            const m = leaningMap.get(leaning)!;
            m.count++;
            m.totalAgreement += parseFloat(row.agreement_score || 0);
        });

        return Array.from(leaningMap.entries())
            .map(([leaning, { count, totalAgreement }]) => ({
                leaning,
                count,
                avgAgreement: totalAgreement / count,
            }))
            .sort((a, b) => b.count - a.count);
    }, [data]);

    // Agreement distribution
    const agreementDistribution = useMemo(() => {
        if (data.length === 0) return [];
        let full = 0, majority = 0, split = 0;
        data.forEach((row: JsonData) => {
            const score = parseFloat(row.agreement_score || 0);
            if (score >= 0.9) full++;
            else if (score >= 0.6) majority++;
            else split++;
        });
        return [
            { name: 'Full Agreement (≥90%)', value: full },
            { name: 'Majority (60-89%)', value: majority },
            { name: 'Split Decision (<60%)', value: split },
        ].filter(d => d.value > 0);
    }, [data]);

    if (data.length === 0) {
        return (
            <Card className="h-full">
                <CardContent className="flex items-center justify-center h-[400px] text-muted-foreground">
                    No consensus data available. Run analysis first.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Consensus Leaning Distribution */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Scale className="h-5 w-5 text-primary" />
                        Consensus by Leaning
                    </CardTitle>
                    <CardDescription>
                        How judges classified model refusal behaviors across {data.length} evaluated prompts
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={leaningData}>
                            <CartesianGrid {...GRID_STYLE} />
                            <XAxis dataKey="leaning" angle={-15} textAnchor="end" height={70} tick={AXIS_TICK_STYLE} />
                            <YAxis allowDecimals={false} tick={AXIS_TICK_STYLE} />
                            <Tooltip
                                contentStyle={TOOLTIP_STYLE}
                                cursor={TOOLTIP_CURSOR}
                                formatter={(value, name) => {
                                    if (name === 'count') return [value, 'Prompts'];
                                    return [value, name];
                                }}
                            />
                            <Bar dataKey="count" fill="#800000" name="count" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Agreement Distribution */}
            <Card>
                <CardHeader>
                    <CardTitle>Agreement Distribution</CardTitle>
                    <CardDescription>
                        How often judges fully agreed, had a majority, or were split
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={agreementDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={130}
                                paddingAngle={3}
                                dataKey="value"
                                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                            >
                                {agreementDistribution.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={['#10b981', '#f59e0b', '#ef4444'][index] || COLORS[index]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={TOOLTIP_STYLE} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
