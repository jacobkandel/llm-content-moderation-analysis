'use client';

import { useEffect, useState } from 'react';
import AnalysisOverview from '@/components/AnalysisOverview';
import { RelatedPages } from '@/components/ui/RelatedPages';
import SkeletonLoader from '@/components/SkeletonLoader';

interface FamilyModel {
    name: string;
    fullName: string;
    refusalRate: number;
    refusalRateCILower?: number;
    refusalRateCIUpper?: number;
    total: number;
}

interface FamilyEntry {
    family: string;
    modelCount: number;
    avgRefusalRate: number;
    minRefusalRate: number;
    maxRefusalRate: number;
    spread: number;
    models: FamilyModel[];
}

const FAMILY_COLORS: Record<string, string> = {
    'Anthropic Claude': '#d97706',
    'OpenAI GPT': '#10b981',
    'Google': '#3b82f6',
    'Mistral AI': '#8b5cf6',
    'Meta Llama': '#0ea5e9',
    'DeepSeek': '#f43f5e',
    'Qwen / Alibaba': '#f59e0b',
    'xAI Grok': '#6366f1',
    'Other': '#6b7280',
};

function FamilyBar({ family, maxRate }: { family: FamilyEntry; maxRate: number }) {
    const color = FAMILY_COLORS[family.family] || '#6b7280';
    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                    <span className="font-semibold text-foreground text-sm">{family.family}</span>
                    <span className="text-xs text-muted-foreground">({family.modelCount} model{family.modelCount !== 1 ? 's' : ''})</span>
                </div>
                <span className="text-sm font-mono font-bold text-foreground">{family.avgRefusalRate.toFixed(1)}% avg</span>
            </div>
            {/* Per-model progression bars */}
            <div className="space-y-1.5 pl-5">
                {family.models.map((m) => (
                    <div key={m.fullName} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-48 truncate shrink-0" title={m.name}>{m.name}</span>
                        <div className="flex-1 bg-muted rounded-full h-2 relative">
                            <div
                                className="h-2 rounded-full transition-all duration-500"
                                style={{
                                    width: `${(m.refusalRate / maxRate) * 100}%`,
                                    background: color,
                                    opacity: 0.85,
                                }}
                            />
                        </div>
                        <span className="text-xs font-mono text-foreground w-12 text-right shrink-0">{m.refusalRate.toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ProgressionCard({ family }: { family: FamilyEntry }) {
    if (family.models.length < 2) return null;
    const color = FAMILY_COLORS[family.family] || '#6b7280';
    const first = family.models[0];
    const last = family.models[family.models.length - 1];
    const delta = last.refusalRate - first.refusalRate;
    const isDecreasing = delta < 0;

    return (
        <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                <h3 className="font-bold text-foreground">{family.family}</h3>
                <span className={`ml-auto text-sm font-bold px-2 py-0.5 rounded-full ${isDecreasing ? 'bg-green-500/10 text-green-500' : delta > 0 ? 'bg-red-500/10 text-red-500' : 'bg-muted text-muted-foreground'}`}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}% across versions
                </span>
            </div>
            <div className="flex items-end gap-1 h-20">
                {family.models.map((m, i) => {
                    const height = Math.max(4, (m.refusalRate / 100) * 64);
                    return (
                        <div key={m.fullName} className="flex-1 flex flex-col items-center gap-1">
                            <div
                                className="w-full rounded-sm transition-all"
                                style={{ height: `${height}px`, background: color, opacity: 0.6 + (i / family.models.length) * 0.4 }}
                                title={`${m.name}: ${m.refusalRate.toFixed(1)}%`}
                            />
                        </div>
                    );
                })}
            </div>
            <div className="flex gap-1 mt-1">
                {family.models.map((m) => (
                    <div key={m.fullName} className="flex-1 text-center">
                        <p className="text-[9px] text-muted-foreground truncate" title={m.name}>{m.name.replace('claude-', '').replace('gpt-', '').replace('gemini-', '').replace('mistral-', '')}</p>
                        <p className="text-[10px] font-mono font-bold text-foreground">{m.refusalRate.toFixed(0)}%</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function FamilyPage() {
    const [familyData, setFamilyData] = useState<FamilyEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'overview' | 'progression'>('overview');

    useEffect(() => {
        fetch('/family_stats.json')
            .then(r => r.ok ? r.json() : [])
            .then(data => { setFamilyData(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return <SkeletonLoader />;

    const maxRate = Math.max(...familyData.map(f => f.maxRefusalRate), 1);
    const familiesWithMultiple = familyData.filter(f => f.models.length >= 2);

    return (
        <div className="space-y-6">
            <AnalysisOverview
                title="Model Family Analysis: How Restrictiveness Evolves Across Versions"
                description="Models from the same provider share architectural DNA but differ in content policy. This analysis groups all 27 evaluated models into 9 provider families and measures the average refusal rate per family, the spread within each family, and the generational progression across model versions."
                importance="The generational view is particularly revealing: Anthropic's Claude models have become significantly more permissive over successive versions (Claude 3 Haiku: 85.8% → Claude Haiku 4.5: 55.5%), while Meta's Llama-based models consistently hover below 2% regardless of scale. This suggests that provider policy decisions — not raw model capability — are the primary driver of refusal behavior."
                metrics={[
                    "Average Refusal Rate per family (weighted by evaluation count)",
                    "Intra-family spread: Max − Min refusal rate within a family",
                    "Generational delta: Change in refusal rate from oldest to newest version",
                    "Individual model CIs from Wilson Score Intervals (95%)"
                ]}
            />

            {/* View toggle */}
            <div className="flex gap-2">
                <button
                    onClick={() => setView('overview')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'overview' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                    Family Overview
                </button>
                <button
                    onClick={() => setView('progression')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'progression' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                    Version Progression
                </button>
            </div>

            {view === 'overview' && (
                <>
                    {/* Summary tiles */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {familyData.slice(0, 4).map(f => (
                            <div key={f.family} className="bg-card border border-border rounded-xl p-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider truncate">{f.family}</p>
                                <p className="text-2xl font-bold text-foreground mt-1">{f.avgRefusalRate.toFixed(1)}%</p>
                                <p className="text-xs text-muted-foreground mt-1">±{(f.spread / 2).toFixed(1)}% spread</p>
                            </div>
                        ))}
                    </div>

                    {/* Bar chart */}
                    <div className="bg-card border border-border rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-foreground mb-6">Refusal Rate by Provider Family</h3>
                        {familyData.map(f => (
                            <FamilyBar key={f.family} family={f} maxRate={maxRate} />
                        ))}
                    </div>

                    {/* Table */}
                    <div className="bg-card border border-border rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-foreground mb-4">Family Summary Table</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-muted-foreground font-semibold">
                                        <th className="text-left py-2">Family</th>
                                        <th className="text-right py-2">Models</th>
                                        <th className="text-right py-2">Avg Rate</th>
                                        <th className="text-right py-2">Min</th>
                                        <th className="text-right py-2">Max</th>
                                        <th className="text-right py-2">Spread</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {familyData.map(f => (
                                        <tr key={f.family} className="border-b border-border last:border-0 hover:bg-muted/50">
                                            <td className="py-2 font-medium text-foreground flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ background: FAMILY_COLORS[f.family] || '#6b7280' }} />
                                                {f.family}
                                            </td>
                                            <td className="py-2 text-right text-muted-foreground">{f.modelCount}</td>
                                            <td className="py-2 text-right font-mono font-bold text-foreground">{f.avgRefusalRate.toFixed(1)}%</td>
                                            <td className="py-2 text-right font-mono text-green-500">{f.minRefusalRate.toFixed(1)}%</td>
                                            <td className="py-2 text-right font-mono text-red-500">{f.maxRefusalRate.toFixed(1)}%</td>
                                            <td className="py-2 text-right font-mono text-muted-foreground">{f.spread.toFixed(1)}pp</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {view === 'progression' && (
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Each card shows how a model family's refusal rate has changed across successive versions. Bars grow taller with higher refusal rates. The Δ badge shows the net change from earliest to latest model.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {familiesWithMultiple.map(f => (
                            <ProgressionCard key={f.family} family={f} />
                        ))}
                    </div>
                    {familiesWithMultiple.length === 0 && (
                        <p className="text-muted-foreground text-center py-12">No families with multiple models found.</p>
                    )}
                </div>
            )}

            <RelatedPages
                title="Soft Censorship vs Hard Refusal"
                description="Not all restrictions are equal — see which models moralize and hedge vs. which ones simply refuse outright."
                href="/analysis/paternalism"
            />
        </div>
    );
}
