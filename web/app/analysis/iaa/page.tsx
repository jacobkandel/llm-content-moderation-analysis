'use client';

import { useEffect, useState, useMemo } from 'react';
import AnalysisOverview from '@/components/AnalysisOverview';
import SkeletonLoader from '@/components/SkeletonLoader';
import { RelatedPages } from '@/components/ui/RelatedPages';
import { Users, Target, BarChart3, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface IAAStats {
    lastUpdated: string;
    totalAnnotations: number;
    uniqueAnnotators: number;
    targetAnnotations: number;
    verdictDistribution: { allowed: number; removed: number };
    multiRatedItems: number;
    overallAlpha: number | null;
    overallAlphaInterpretation: string;
    overallPercentAgreement: number | null;
    pairwiseAgreement: Array<{
        annotatorA: string;
        annotatorB: string;
        n: number;
        kappa: number;
        kappaInterpretation: string;
        percentAgreement: number;
    }>;
    categoryStats: Array<{
        category: string;
        total: number;
        allowed: number;
        removed: number;
        refusalRate: number;
    }>;
    categoryAgreement: Array<{
        category: string;
        items: number;
        percentAgreement: number;
    }>;
    annotatorStats: Array<{
        id: string;
        shortId: string;
        total: number;
        allowed: number;
        removed: number;
        refusalRate: number;
        avgTimeMs: number;
    }>;
}

function AlphaBadge({ value, interpretation }: { value: number | null; interpretation: string }) {
    if (value === null) return <span className="text-muted-foreground text-sm">—</span>;

    const color = value >= 0.8 ? 'text-emerald-400' :
                  value >= 0.6 ? 'text-green-400' :
                  value >= 0.4 ? 'text-yellow-400' :
                  value >= 0.2 ? 'text-orange-400' : 'text-red-400';

    const bgColor = value >= 0.8 ? 'bg-emerald-500/10 border-emerald-500/20' :
                    value >= 0.6 ? 'bg-green-500/10 border-green-500/20' :
                    value >= 0.4 ? 'bg-yellow-500/10 border-yellow-500/20' :
                    value >= 0.2 ? 'bg-orange-500/10 border-orange-500/20' :
                                   'bg-red-500/10 border-red-500/20';

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${bgColor}`}>
            <span className={`text-2xl font-bold font-mono ${color}`}>{value.toFixed(3)}</span>
            <span className="text-xs text-muted-foreground">{interpretation}</span>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
    return (
        <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                <Icon className="h-3.5 w-3.5" />
                {label}
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
    );
}

function ProgressBar({ current, target }: { current: number; target: number }) {
    const pct = Math.min(100, (current / target) * 100);
    const segments = [
        { threshold: 20, label: '100', color: 'bg-red-500/60' },
        { threshold: 40, label: '200', color: 'bg-orange-500/60' },
        { threshold: 60, label: '300', color: 'bg-yellow-500/60' },
        { threshold: 80, label: '400', color: 'bg-green-500/60' },
        { threshold: 100, label: '500', color: 'bg-emerald-500/60' },
    ];

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>{current} annotations</span>
                <span>Goal: {target}</span>
            </div>
            <div className="h-3 bg-muted/30 rounded-full overflow-hidden relative">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-brand via-brand-dark to-emerald-600 transition-all duration-1000 ease-out"
                    style={{ width: `${pct}%` }}
                />
                {segments.map((seg) => (
                    <div
                        key={seg.label}
                        className="absolute top-0 h-full w-px bg-border/50"
                        style={{ left: `${seg.threshold}%` }}
                    />
                ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground/60">
                {segments.map((seg) => (
                    <span key={seg.label} style={{ width: '20%', textAlign: 'center' }}>{seg.label}</span>
                ))}
            </div>
            <p className="text-xs text-muted-foreground">
                {current < 100 ? (
                    <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-orange-400" /> n&lt;100: estimates unreliable. Share /annotate to collect more.</span>
                ) : current < 200 ? (
                    <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-yellow-400" /> n&lt;200: tentative IAA. Target n≥200 for publishable results.</span>
                ) : (
                    <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-400" /> Sample sufficient for publication-grade IAA reporting.</span>
                )}
            </p>
        </div>
    );
}

export default function IAAPage() {
    const [data, setData] = useState<IAAStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/iaa_stats.json')
            .then(r => r.ok ? r.json() : null)
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return <SkeletonLoader />;

    if (!data || data.totalAnnotations === 0) {
        return (
            <div className="space-y-6">
                <AnalysisOverview
                    title="Inter-Annotator Agreement"
                    description="Measures how consistently multiple human annotators label the same content. High agreement validates that moderation judgments are reproducible, not subjective."
                    importance="Without IAA, there's no way to distinguish genuine moderation patterns from annotator noise."
                />
                <div className="bg-card p-12 rounded-2xl border border-border text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                    <h3 className="text-lg font-bold text-foreground mb-2">No Annotation Data Yet</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        IAA metrics require crowdsourced annotations. Visit the <a href="/annotate" className="text-brand underline">Annotate</a> page to contribute.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <AnalysisOverview
                title="Inter-Annotator Agreement"
                description="Measures how consistently multiple human annotators label the same content moderation decisions. Krippendorff's Alpha is the gold-standard metric for nominal data with multiple raters — values above 0.667 are considered reliable for content analysis."
                importance="IAA is the cornerstone of research credibility. Without it, there's no way to distinguish genuine moderation patterns from annotator noise. Reviewers will look for α ≥ 0.667 as the minimum threshold for publishable results."
                metrics={[
                    "Krippendorff's Alpha: Chance-corrected agreement for multiple raters (α ≥ 0.667 = reliable)",
                    "Cohen's Kappa: Pairwise agreement between specific annotator pairs",
                    "Percent Agreement: Raw agreement rate (not corrected for chance)"
                ]}
            />

            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={Users} label="Annotations" value={data.totalAnnotations} sub={`from ${data.uniqueAnnotators} annotators`} />
                <StatCard icon={Target} label="Multi-Rated Items" value={data.multiRatedItems} sub="items rated by 2+ people" />
                <StatCard icon={BarChart3} label="Agreement" value={data.overallPercentAgreement !== null ? `${data.overallPercentAgreement}%` : '—'} sub="on shared items" />
                <StatCard icon={Clock} label="Avg Time" value={data.annotatorStats.length > 0 ? `${Math.round(data.annotatorStats.reduce((s, a) => s + a.avgTimeMs, 0) / data.annotatorStats.length / 1000)}s` : '—'} sub="per annotation" />
            </div>

            {/* Krippendorff's Alpha Hero */}
            <div className="bg-card p-6 rounded-2xl border border-border">
                <h3 className="text-lg font-bold text-foreground mb-1">Krippendorff&apos;s Alpha (Overall)</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    The gold-standard reliability metric for content analysis with multiple annotators.
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <AlphaBadge value={data.overallAlpha} interpretation={data.overallAlphaInterpretation} />
                    <div className="text-xs text-muted-foreground space-y-1">
                        <p>α ≥ 0.800 = Almost Perfect &nbsp;|&nbsp; α ≥ 0.667 = Reliable (publishable)</p>
                        <p>α ≥ 0.400 = Moderate &nbsp;|&nbsp; α &lt; 0.400 = Unreliable</p>
                    </div>
                </div>
            </div>

            {/* Progress Toward Goal */}
            <div className="bg-card p-6 rounded-2xl border border-border">
                <h3 className="text-lg font-bold text-foreground mb-3">Annotation Progress</h3>
                <ProgressBar current={data.totalAnnotations} target={data.targetAnnotations} />
            </div>

            {/* Pairwise Agreement Table */}
            {data.pairwiseAgreement.length > 0 && (
                <div className="bg-card p-6 rounded-2xl border border-border">
                    <h3 className="text-lg font-bold text-foreground mb-1">Pairwise Annotator Agreement</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Cohen&apos;s Kappa between each pair of annotators who rated the same items.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Annotator A</th>
                                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Annotator B</th>
                                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Items</th>
                                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Agreement</th>
                                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">κ</th>
                                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Level</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.pairwiseAgreement.map((row, i) => (
                                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                        <td className="py-2 px-3 font-mono text-xs">{row.annotatorA}</td>
                                        <td className="py-2 px-3 font-mono text-xs">{row.annotatorB}</td>
                                        <td className="py-2 px-3 text-right">{row.n}</td>
                                        <td className="py-2 px-3 text-right">{row.percentAgreement}%</td>
                                        <td className="py-2 px-3 text-right font-mono font-bold">{row.kappa.toFixed(3)}</td>
                                        <td className="py-2 px-3">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                row.kappa >= 0.8 ? 'bg-emerald-500/10 text-emerald-400' :
                                                row.kappa >= 0.6 ? 'bg-green-500/10 text-green-400' :
                                                row.kappa >= 0.4 ? 'bg-yellow-500/10 text-yellow-400' :
                                                'bg-red-500/10 text-red-400'
                                            }`}>
                                                {row.kappaInterpretation}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Per-Category Agreement */}
            {data.categoryAgreement.length > 0 && (
                <div className="bg-card p-6 rounded-2xl border border-border">
                    <h3 className="text-lg font-bold text-foreground mb-1">Agreement by Category</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        How consistently annotators agree within each content category.
                    </p>
                    <div className="space-y-2">
                        {data.categoryAgreement
                            .sort((a, b) => b.percentAgreement - a.percentAgreement)
                            .map((cat) => (
                            <div key={cat.category} className="flex items-center gap-3 py-1.5">
                                <span className="text-sm text-foreground w-40 truncate" title={cat.category}>{cat.category}</span>
                                <div className="flex-1 h-5 bg-muted/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{
                                            width: `${cat.percentAgreement}%`,
                                            background: cat.percentAgreement >= 80
                                                ? 'linear-gradient(90deg, #275D38, #34d399)'
                                                : cat.percentAgreement >= 60
                                                ? 'linear-gradient(90deg, #eab308, #facc15)'
                                                : 'linear-gradient(90deg, #A4343A, #ef4444)',
                                        }}
                                    />
                                </div>
                                <span className="text-xs font-mono font-bold text-foreground w-12 text-right">{cat.percentAgreement}%</span>
                                <span className="text-xs text-muted-foreground w-16 text-right">{cat.items} items</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Annotator Leaderboard */}
            <div className="bg-card p-6 rounded-2xl border border-border">
                <h3 className="text-lg font-bold text-foreground mb-1">Annotator Contributions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Individual annotator statistics. All IDs are anonymized.
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-2 px-3 text-muted-foreground font-medium">#</th>
                                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Annotator</th>
                                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Total</th>
                                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Allowed</th>
                                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Removed</th>
                                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Refusal %</th>
                                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Avg Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.annotatorStats.map((ann, i) => (
                                <tr key={ann.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                    <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                                    <td className="py-2 px-3 font-mono text-xs">{ann.shortId}</td>
                                    <td className="py-2 px-3 text-right font-bold">{ann.total}</td>
                                    <td className="py-2 px-3 text-right text-safe">{ann.allowed}</td>
                                    <td className="py-2 px-3 text-right text-brand">{ann.removed}</td>
                                    <td className="py-2 px-3 text-right">{ann.refusalRate}%</td>
                                    <td className="py-2 px-3 text-right text-muted-foreground">{ann.avgTimeMs > 0 ? `${(ann.avgTimeMs / 1000).toFixed(1)}s` : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Verdict Distribution */}
            <div className="bg-card p-6 rounded-2xl border border-border">
                <h3 className="text-lg font-bold text-foreground mb-3">Overall Verdict Distribution</h3>
                <div className="flex gap-4">
                    <div className="flex-1 text-center p-4 rounded-xl bg-safe/10 border border-safe/20">
                        <p className="text-3xl font-bold text-safe">{data.verdictDistribution.allowed}</p>
                        <p className="text-xs text-muted-foreground mt-1">ALLOWED</p>
                        <p className="text-xs text-muted-foreground">
                            {data.totalAnnotations > 0 ? `${(data.verdictDistribution.allowed / data.totalAnnotations * 100).toFixed(1)}%` : ''}
                        </p>
                    </div>
                    <div className="flex-1 text-center p-4 rounded-xl bg-brand/10 border border-brand/20">
                        <p className="text-3xl font-bold text-brand">{data.verdictDistribution.removed}</p>
                        <p className="text-xs text-muted-foreground mt-1">REMOVED</p>
                        <p className="text-xs text-muted-foreground">
                            {data.totalAnnotations > 0 ? `${(data.verdictDistribution.removed / data.totalAnnotations * 100).toFixed(1)}%` : ''}
                        </p>
                    </div>
                </div>
            </div>

            <RelatedPages
                title="Annotate"
                description="Help improve our IAA by annotating more prompts. Every annotation strengthens the statistical reliability of this research."
                href="/annotate"
            />
        </div>
    );
}
