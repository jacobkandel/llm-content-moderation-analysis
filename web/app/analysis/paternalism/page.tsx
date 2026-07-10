'use client';
import type { JsonData } from '@/lib/data-loading';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Bar, Cell } from 'recharts';
import SkeletonLoader from '@/components/SkeletonLoader';
import AnalysisOverview from '@/components/AnalysisOverview';
import { RelatedPages } from '@/components/ui/RelatedPages';
import { EmptyState } from '@/components/ui/EmptyState';


export default function PaternalismPage() {
    const router = useRouter();
    const { filteredPaternalismData: paternalismData, loading, ensurePaternalism } = useAnalysis();
    useEffect(() => { ensurePaternalism(); }, [ensurePaternalism]);

    if (loading) return <SkeletonLoader />;

    return (
        <div className="space-y-6">
            <AnalysisOverview
                title="Paternalism Audit: User-Based Discrimination"
                description="Paternalistic moderation occurs when a model refuses content to 'vulnerable' users (e.g. someone who says 'I am a teenager') while allowing the same content for 'authority' figures — treating users as if they can't make their own judgments about what information they should access. Measuring it requires submitting identical prompts under different personas. NOTE: the persona-differential experiment has not yet been run for the published data. The chart below shows each model's baseline (single-persona) refusal rate on the sensitive-topic set — not a persona differential. The persona comparison is planned for a future audit run."
                importance="Paternalism in AI moderation is a direct threat to internet openness because it creates a tiered system of information access based on user identity. When models assume certain users 'can't handle' certain information and restrict it accordingly, they undermine individual autonomy and create an internet where access to knowledge depends on who you are, not what you're seeking. This is fundamentally incompatible with the ideal of an open internet where information should be equally accessible to all users, regardless of age or perceived authority."
                metrics={[
                    "Baseline refusal rate per model on the sensitive-topic set (shown below)",
                    "Persona-Based Refusal Differential — PLANNED: refusal-rate gap between layperson and authority personas",
                    "Consistency Across Personas — PLANNED: whether models apply the same standards regardless of user claims"
                ]}
            />
            <div className="bg-card rounded-xl border border-border p-6 overflow-hidden max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">Paternalism Audit</h3>
                </div>
                <div className="flex flex-col items-center">
                    <p className="text-sm text-muted-foreground mb-4 text-center">Baseline refusal rate by model on the sensitive-topic set (persona-differential experiment pending)</p>
                    <div className="relative w-full aspect-square bg-muted/10 rounded-lg border border-border flex items-center justify-center overflow-hidden p-4">
                        {paternalismData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={paternalismData} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                    <YAxis dataKey="model" type="category" width={150} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                                    <RechartsTooltip />
                                    <Bar dataKey="refusal_rate" name="Refusal Rate" onClick={(e: JsonData) => { if (e?.id) router.push(`/models/${e.id}`) }} style={{ cursor: 'pointer' }}>
                                        {paternalismData.map((entry: JsonData, index: number) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill="#800000"
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-8">
                                <EmptyState title="No paternalism data" description="No data for the current selection — it may still be loading, or try clearing the model filter." icon="search" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <RelatedPages
                title="Alignment Tax"
                description="Explore the trade-off between model safety and helpfulness on the Pareto frontier."
                href="/analysis/alignment"
            />
        </div>
    );
}
