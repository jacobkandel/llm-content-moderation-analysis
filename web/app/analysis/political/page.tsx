'use client';
import type { JsonData } from '@/lib/data-loading';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { ResponsiveContainer, ScatterChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ReferenceLine, Scatter, Cell } from 'recharts';
import SkeletonLoader from '@/components/SkeletonLoader';
import AnalysisOverview from '@/components/AnalysisOverview';
import { RelatedPages } from '@/components/ui/RelatedPages';
import { EmptyState } from '@/components/ui/EmptyState';



// The political-compass visualization is temporarily disabled. The previously
// shipped data was placeholder/random and the underlying measure is being
// reworked (it must score real moderation decisions, with normalized, balanced
// axes — see METHODOLOGY §3.6). Flip this to true once a real, validated
// political_compass.json is produced by a non-mock audit run.
const COMPASS_ENABLED = false;

export default function PoliticalPage() {
    const router = useRouter();
    const { filteredPoliticalData: politicalData, loading, ensurePolitical } = useAnalysis();
    useEffect(() => { ensurePolitical(); }, [ensurePolitical]);

    if (loading) return <SkeletonLoader />;

    return (
        <div className="space-y-6">
            <AnalysisOverview
                title="Political Compass (Experimental)"
                description="An exploratory measure of whether models exhibit systematic ideological leaning. This analysis is currently being reworked and re-run — the earlier visualization used placeholder values and has been removed rather than shown as real data. When the validated version lands, it will map each model on economic and social axes derived from its moderation decisions."
                importance="Political bias in AI moderators directly threatens internet openness. If models systematically suppress left-wing or right-wing viewpoints, they become tools of political censorship rather than neutral arbiters. Understanding these biases is crucial for ensuring the internet remains a marketplace of ideas — which is exactly why this measure must be built on real, validated data rather than shipped prematurely."
                metrics={[
                    "Economic Axis: left-leaning (negative) vs right-leaning (positive) — being recomputed",
                    "Social Axis: libertarian (negative) vs authoritarian (positive) — being recomputed",
                    "Quadrant Clustering: whether models cluster in specific ideologies"
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
                        Do models have political opinions? We test this by asking standard political-compass questions.
                    </p>
                    <div className="relative w-full aspect-square bg-muted/10 rounded-lg border border-border flex items-center justify-center overflow-hidden p-4">
                        {COMPASS_ENABLED && politicalData.length > 0 ? (
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
                                    <ReferenceLine x={0} stroke="hsl(var(--foreground))" strokeOpacity={0.4} />
                                    <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeOpacity={0.4} />

                                    <Scatter name="Models" data={politicalData} fill="#800000" onClick={(e: JsonData) => { if (e?.payload?.id) router.push(`/models/${e.payload.id}`) }}>
                                        {politicalData.map((entry: JsonData, index: number) => (
                                            <Cell key={`cell-${index}`} fill="#800000" stroke="hsl(var(--background))" strokeWidth={1} style={{ cursor: 'pointer' }} />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-8">
                                <EmptyState title="Being recomputed" description="The political-compass analysis is being rebuilt on real, validated audit data and is temporarily unavailable. The earlier chart used placeholder values and has been removed." icon="search" />
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
                        This experimental measure adapts standard{' '}
                        <a href="https://www.politicalcompass.org" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">political-compass</a>{' '}
                        propositions (taxation, social welfare, civil liberties, religious authority) and maps each model onto an economic and a social axis.
                    </p>
                    <p>
                        <strong className="text-foreground">Status:</strong> the analysis is being reworked. To be a valid measure of <em>moderation</em> bias, each proposition must be scored as an actual ALLOW/REMOVE moderation decision (not the model&apos;s stated opinion), the two axes must be balanced and normalized to a common scale, and the data must come from a real (non-placeholder) audit run. Until that validated version ships, the chart is hidden rather than shown with untrustworthy values.
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                        <li><strong className="text-foreground">Economic Axis (X):</strong> Negative = left-leaning (regulation, redistribution). Positive = right-leaning (free markets, property rights).</li>
                        <li><strong className="text-foreground">Social Axis (Y):</strong> Negative = libertarian (individual freedoms). Positive = authoritarian (tradition, law &amp; order).</li>
                    </ul>
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
