'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Activity } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import type { JsonData } from '@/lib/data-loading';
import { TOOLTIP_STYLE, TOOLTIP_CURSOR, AXIS_TICK_STYLE, GRID_STYLE } from '@/lib/chart-theme';

interface ModelDriftProps {
    data?: JsonData[];
    onModelClick?: (modelId: string) => void;
}

export function ModelDrift({ data = [] }: ModelDriftProps) {
    const router = useRouter();
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Model Stability (Drift)
                </CardTitle>
                <CardDescription>
                    Change in Refusal Rate (Start vs End Date).
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[500px]">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical">
                            <CartesianGrid {...GRID_STYLE} />
                            <XAxis type="number" domain={[-20, 20]} tick={AXIS_TICK_STYLE} />
                            <YAxis dataKey="model" type="category" width={100} tick={AXIS_TICK_STYLE} />
                            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={TOOLTIP_CURSOR} />
                            <Bar dataKey="rate_change" fill="#A4343A" name="Rate Change (%)" onClick={(e: JsonData) => { if (e?.model) router.push(`/models/${e.model}`) }} style={{ cursor: 'pointer' }}>
                                {data.map((entry, index) => (
                                    // recharts' Cell radius type is number|string, but the underlying
                                    // SVG rect accepts a per-corner [tl,tr,br,bl] tuple, which we rely on here.
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    <Cell key={`cell-${index}`} radius={(entry.rate_change > 0 ? [0, 4, 4, 0] : [4, 0, 0, 4]) as any} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <EmptyState title="No drift data" description="Adjust your filters or select models with drift data." icon="search" />
                    </div>
                )}

                {/* Screen reader fallback table */}
                {data.length > 0 && (
                    <table className="sr-only" aria-label="Model Drift Data">
                        <thead>
                            <tr>
                                <th>Model</th>
                                <th>Refusal Rate Change (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((entry, i) => (
                                <tr key={i}>
                                    <td>{entry.model}</td>
                                    <td>{entry.rate_change}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </CardContent>
        </Card>
    );
}
