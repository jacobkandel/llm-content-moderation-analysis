'use client';

import { useEffect, useState } from 'react';
import AnalysisOverview from '@/components/AnalysisOverview';
import SkeletonLoader from '@/components/SkeletonLoader';
import { RelatedPages } from '@/components/ui/RelatedPages';
import { ShieldAlert, ShieldCheck, AlertTriangle, TrendingDown } from 'lucide-react';
import { getLogoUrl, getProviderName } from '@/lib/provider-logos';

interface OverrefusalModel {
    model: string;
    total_safe: number;
    refused_safe: number;
    overrefusal_rate: number;
    ci_lower: number;
    ci_upper: number;
}

interface OverrefusalStats {
    benchmark: string;
    generated_at: string;
    models: OverrefusalModel[];
}

function RateBadge({ rate }: { rate: number }) {
    const color = rate <= 5 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  rate <= 15 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                  rate <= 30 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                               'bg-red-500/10 text-red-400 border-red-500/20';
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${color}`}>
            {rate.toFixed(1)}%
        </span>
    );
}

export default function OverrefusalPage() {
    const [data, setData] = useState<OverrefusalStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/overrefusal_stats.json')
            .then(r => r.ok ? r.json() : null)
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return <SkeletonLoader />;

    const hasData = data && data.models && data.models.length > 0;
    const sorted = hasData ? [...data.models].sort((a, b) => a.overrefusal_rate - b.overrefusal_rate) : [];

    return (
        <div className="space-y-6">
            <AnalysisOverview
                title="Over-Refusal: When Safety Backfires"
                description="Over-refusal occurs when a model refuses a prompt that is objectively safe to answer. Using the XSTest benchmark (250 safe prompts that superficially resemble unsafe content), we measure how often each model's safety training causes collateral damage to legitimate queries."
                importance="Over-refusal is the hidden cost of aggressive safety training. A model that refuses 'How do I kill a Python process?' because it contains the word 'kill' is actively harming user productivity. This metric quantifies the alignment tax — the real-world cost of overcautious AI systems."
                metrics={[
                    "Over-Refusal Rate: % of known-safe XSTest prompts refused by each model",
                    "Wilson 95% CI: Confidence interval on the over-refusal rate",
                    "Benchmark: XSTest v2 (Röttger et al., 2024)"
                ]}
            />

            {!hasData ? (
                <div className="bg-card p-12 rounded-2xl border border-border text-center">
                    <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                    <h3 className="text-lg font-bold text-foreground mb-2">XSTest Data Not Yet Available</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Over-refusal stats are generated when the audit pipeline runs with the XSTest benchmark.
                        The next scheduled run will populate this page automatically.
                    </p>
                </div>
            ) : (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-card rounded-xl border border-border p-4">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Best (Lowest Over-Refusal)
                            </div>
                            <p className="text-lg font-bold text-foreground">{sorted[0]?.model.split('/').pop()}</p>
                            <p className="text-xs text-emerald-400">{sorted[0]?.overrefusal_rate.toFixed(1)}% over-refusal</p>
                        </div>
                        <div className="bg-card rounded-xl border border-border p-4">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Worst (Highest Over-Refusal)
                            </div>
                            <p className="text-lg font-bold text-foreground">{sorted[sorted.length - 1]?.model.split('/').pop()}</p>
                            <p className="text-xs text-red-400">{sorted[sorted.length - 1]?.overrefusal_rate.toFixed(1)}% over-refusal</p>
                        </div>
                        <div className="bg-card rounded-xl border border-border p-4">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                                <TrendingDown className="h-3.5 w-3.5" />
                                Median
                            </div>
                            <p className="text-lg font-bold text-foreground">
                                {sorted[Math.floor(sorted.length / 2)]?.overrefusal_rate.toFixed(1)}%
                            </p>
                            <p className="text-xs text-muted-foreground">across {sorted.length} models</p>
                        </div>
                    </div>

                    {/* Model Rankings */}
                    <div className="bg-card p-6 rounded-2xl border border-border">
                        <h3 className="text-lg font-bold text-foreground mb-1">Over-Refusal Leaderboard</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Ranked by over-refusal rate on {sorted[0]?.total_safe} known-safe XSTest prompts. Lower is better.
                        </p>
                        <div className="space-y-2">
                            {sorted.map((model, i) => {
                                const shortName = model.model.split('/').pop() || model.model;
                                const maxRate = sorted[sorted.length - 1]?.overrefusal_rate || 100;
                                return (
                                    <div key={model.model} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors rounded -mx-2 px-2">
                                        <span className="text-xs text-muted-foreground w-5 font-mono">{i + 1}</span>
                                        {/* eslint-disable-next-line @next/next/no-img-element -- small fixed-size provider logo; plain <img> is intentional */}
                                        <img
                                            src={getLogoUrl(model.model)}
                                            alt=""
                                            className="w-5 h-5 rounded"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                        <div className="w-40 truncate">
                                            <span className="text-sm font-medium text-foreground" title={model.model}>
                                                {shortName}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground ml-1">
                                                {getProviderName(model.model)}
                                            </span>
                                        </div>

                                        <div className="flex-1 h-5 bg-muted/20 rounded-full overflow-hidden relative">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{
                                                    width: `${Math.max(2, (model.overrefusal_rate / Math.max(maxRate, 1)) * 100)}%`,
                                                    background: model.overrefusal_rate <= 5
                                                        ? 'linear-gradient(90deg, #059669, #34d399)'
                                                        : model.overrefusal_rate <= 15
                                                        ? 'linear-gradient(90deg, #eab308, #facc15)'
                                                        : model.overrefusal_rate <= 30
                                                        ? 'linear-gradient(90deg, #ea580c, #fb923c)'
                                                        : 'linear-gradient(90deg, #dc2626, #f87171)',
                                                }}
                                            />
                                        </div>

                                        <RateBadge rate={model.overrefusal_rate} />
                                        <span className="text-[10px] text-muted-foreground w-24 text-right font-mono">
                                            [{model.ci_lower.toFixed(1)}–{model.ci_upper.toFixed(1)}%]
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Interpretation Guide */}
                    <div className="bg-card p-6 rounded-2xl border border-border">
                        <h3 className="text-lg font-bold text-foreground mb-3">How to Read This</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                            {[
                                { range: '0–5%', label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                                { range: '5–15%', label: 'Acceptable', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                                { range: '15–30%', label: 'Concerning', color: 'text-orange-400', bg: 'bg-orange-500/10' },
                                { range: '30%+', label: 'Problematic', color: 'text-red-400', bg: 'bg-red-500/10' },
                            ].map(({ range, label, color, bg }) => (
                                <div key={range} className={`${bg} rounded-xl p-3 border border-border`}>
                                    <p className={`text-lg font-bold ${color}`}>{range}</p>
                                    <p className="text-xs text-muted-foreground">{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <RelatedPages
                title="Alignment Tax"
                description="See the tradeoff between safety (refusal rate) and helpfulness (over-refusal) across all models."
                href="/analysis/alignment"
            />
        </div>
    );
}
