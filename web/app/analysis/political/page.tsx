'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { ResponsiveContainer, ScatterChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ReferenceLine, Scatter, Cell } from 'recharts';
import SkeletonLoader from '@/components/SkeletonLoader';
import AnalysisOverview from '@/components/AnalysisOverview';
import { RelatedPages } from '@/components/ui/RelatedPages';
import { EmptyState } from '@/components/ui/EmptyState';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16'];


export default function PoliticalPage() {
    const router = useRouter();
    const { filteredPoliticalData: politicalData, loading, ensurePolitical } = useAnalysis();
    useEffect(() => { ensurePolitical(); }, []);

    if (loading) return <SkeletonLoader />;

    return (
        <div className="space-y-6">
            <AnalysisOverview
                title="Political Compass: Detecting Ideological Bias"
                description="Do AI models have political leanings? We test this by presenting models with 30 standard political compass questions covering economic (left/right) and social (libertarian/authoritarian) issues. By aggregating their responses, we can map each model's 'political personality' to see if certain viewpoints are systematically favored or censored. This reveals whether models exhibit ideological bias in their moderation decisions."
                importance="Political bias in AI moderators directly threatens internet openness. If models systematically suppress left-wing or right-wing viewpoints, they become tools of political censorship rather than neutral arbiters. When AI moderators embed political bias, they create echo chambers that narrow the range of acceptable discourse. Understanding these biases is crucial for ensuring the internet remains a marketplace of ideas where all legitimate political viewpoints can be expressed, not just those aligned with a model's training data or creators' preferences."
                metrics={[
                    "Economic Axis: Measures left-leaning (negative) vs right-leaning (positive) economic views",
                    "Social Axis: Measures libertarian (negative) vs authoritarian (positive) social views",
                    "Quadrant Clustering: Whether models cluster in specific political ideologies, indicating systematic bias"
                ]}
            />
            <div className="bg-card rounded-xl border border-border p-6 overflow-hidden max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        Political Compass
                    </h3>
                </div>
                <div className="flex flex-col items-center">
                    <p className="text-sm text-muted-foreground mb-4 text-center">
                        Do models have political opinions? We test this by asking 30 standard political questions.
                    </p>
                    <div className="relative w-full aspect-square bg-muted/10 rounded-lg border border-border flex items-center justify-center overflow-hidden p-4">
                        {politicalData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis type="number" dataKey="economic" domain={[-10, 10]} name="Economic" label={{ value: 'Economic (Left <-> Right)', position: 'bottom', offset: 0, fill: 'hsl(var(--muted-foreground))' }} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                    <YAxis type="number" dataKey="social" domain={[-10, 10]} name="Social" label={{ value: 'Social (Libertarian <-> Authoritarian)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                    <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            return (
                                                <div className="bg-popover p-2 border border-border shadow-md rounded text-xs text-popover-foreground">
                                                    <strong>{d.model}</strong>
                                                    <br />Econ: {d.economic.toFixed(2)}
                                                    <br />Soc: {d.social.toFixed(2)}
                                                </div>
                                            );
                                        }
                                        return null;
                                    }} />

                                    {/* Quadrant Colors (Approximate via Reference Areas if needed, but simple Scatter is fine) */}
                                    <ReferenceLine x={0} stroke="#000" />
                                    <ReferenceLine y={0} stroke="#000" />

                                    <Scatter name="Models" data={politicalData} fill="#800000" onClick={(e: any) => { if (e?.payload?.id) router.push(`/models/${e.payload.id}`) }}>
                                        {politicalData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill="#800000" stroke="hsl(var(--background))" strokeWidth={1} style={{ cursor: 'pointer' }} />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-8">
                                <EmptyState title="No political compass data" description="Adjust your filters to see data." icon="search" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <details className="bg-card border border-border rounded-xl p-5 text-sm">
                <summary className="cursor-pointer font-semibold text-foreground select-none flex items-center gap-2">
                    <span className="text-base">🧭</span> How is the Political Compass computed?
                </summary>
                <div className="mt-4 space-y-2 text-muted-foreground leading-relaxed">
                    <p>
                        Each model is asked <strong className="text-foreground">30 standard Political Compass questions</strong> — the same ones used by the{' '}
                        <a href="https://www.politicalcompass.org" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">politicalcompass.org</a>{' '}
                        test. These cover topics like taxation, social welfare, civil liberties, and religious authority.
                    </p>
                    <p>
                        The model is asked to <em>evaluate</em> whether each statement is harmful or acceptable. Systematic agreement or disagreement with groups of questions reveals ideological leanings.
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                        <li><strong className="text-foreground">Economic Axis (X):</strong> Negative = left-leaning (regulation, redistribution). Positive = right-leaning (free markets, property rights). Scale: −10 to +10.</li>
                        <li><strong className="text-foreground">Social Axis (Y):</strong> Negative = libertarian (individual freedoms). Positive = authoritarian (tradition, law &amp; order). Scale: −10 to +10.</li>
                    </ul>
                    <p>
                        A score near <strong className="text-foreground">(0, 0)</strong> suggests the model treats all political viewpoints equally — or has no measurable political leaning in its moderation decisions.
                    </p>
                </div>
            </details>

            <RelatedPages
                title="Paternalism Audit"
                description="Do models treat different users differently based on their claimed identity or expertise? Uncover persona-based discrimination."
                href="/analysis/paternalism"
            />
        </div>
    );
}
