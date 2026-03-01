'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Activity } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

interface ModelDriftProps {
    data?: any[];
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
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="hsl(var(--border))" />
                            <XAxis type="number" domain={[-20, 20]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis dataKey="model" type="category" width={100} fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }} />
                            <Bar dataKey="rate_change" fill="#A4343A" name="Rate Change (%)" onClick={(e: any) => { if (e?.model) router.push(`/models/${e.model}`) }} style={{ cursor: 'pointer' }}>
                                {data.map((entry, index) => (
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
            </CardContent>
        </Card>
    );
}
