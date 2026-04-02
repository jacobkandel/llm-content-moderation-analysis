import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import Image from 'next/image';
import { getLogoUrl } from '@/lib/provider-logos';
import { ArrowLeft, ArrowRight, BarChart2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { TooltipHover } from '@/components/ui/TooltipHover';

interface ModelInfo {
    id: string;
    name: string;
    display_name: string;
    provider: string;
    tier: string;
    cost_per_m_in: number;
    cost_per_m_out: number;
}

interface ModelStats {
    refusalRate: number;
    avgVerbosity: number;
    total: number;
    categoryRates: Record<string, { rate: number; ciLower: number; ciUpper: number } | number>;
}

async function getModelData() {
    const modelsPath = path.join(process.cwd(), 'public', 'models.json');
    const comparePath = path.join(process.cwd(), 'public', 'compare_data.json');
    const longitudinalPath = path.join(process.cwd(), 'public', 'longitudinal_data.json');

    const driftPath = path.join(process.cwd(), 'public', 'drift_report.json');
    const politicalPath = path.join(process.cwd(), 'public', 'political_compass.json');
    const paternalismPath = path.join(process.cwd(), 'public', 'paternalism.json');
    const consensusPath = path.join(process.cwd(), 'public', 'consensus_stats.json');

    const [modelsFile, compareFile, longitudinalFile] = await Promise.all([
        fs.promises.readFile(modelsPath, 'utf8'),
        fs.promises.readFile(comparePath, 'utf8'),
        fs.promises.readFile(longitudinalPath, 'utf8')
    ]);

    const models: ModelInfo[] = JSON.parse(modelsFile);
    const compare = JSON.parse(compareFile);
    const longitudinal = JSON.parse(longitudinalFile);

    let drift = [];
    let political = [];
    let paternalism = [];
    let consensus: any = {};
    try { drift = JSON.parse(await fs.promises.readFile(driftPath, 'utf8')); } catch { }
    try { political = JSON.parse(await fs.promises.readFile(politicalPath, 'utf8')); } catch { }
    try { paternalism = JSON.parse(await fs.promises.readFile(paternalismPath, 'utf8')); } catch { }
    try { consensus = JSON.parse(await fs.promises.readFile(consensusPath, 'utf8')); } catch { }

    return { models, compare, longitudinal, drift, political, paternalism, consensus };
}

export async function generateStaticParams() {
    try {
        const modelsPath = path.join(process.cwd(), 'public', 'models.json');
        const fileContent = await fs.promises.readFile(modelsPath, 'utf8');
        const models: ModelInfo[] = JSON.parse(fileContent);
        return models.map(m => {
            const [provider, ...rest] = m.id.split('/');
            return {
                provider,
                model: rest.join('/')
            };
        });
    } catch {
        return [];
    }
}

export async function generateMetadata({ params }: { params: Promise<{ provider: string, model: string }> }): Promise<Metadata> {
    const { provider, model } = await params;
    const decodedModel = decodeURIComponent(model);
    const id = `${provider}/${decodedModel}`;
    try {
        const modelsPath = path.join(process.cwd(), 'public', 'models.json');
        const modelsFile = await fs.promises.readFile(modelsPath, 'utf8');
        const models: ModelInfo[] = JSON.parse(modelsFile);
        const md = models.find(m => m.id === id);
        if (!md) return { title: 'Model Not Found — Moderation Bias' };

        const comparePath = path.join(process.cwd(), 'public', 'compare_data.json');
        const compareFile = await fs.promises.readFile(comparePath, 'utf8');
        const compare = JSON.parse(compareFile);

        const stats: ModelStats | undefined = compare.modelStats?.[id];
        const refusalPct = stats ? Math.round(stats.refusalRate) : null;
        return {
            title: `${md.display_name} Censorship Analysis — Moderation Bias`,
            description: `How does ${md.display_name} handle content moderation? ${refusalPct !== null ? `Refusal rate: ${refusalPct}%. ` : ''}Category breakdown, behavioral trends, and side-by-side comparisons with other LLMs.`,
            openGraph: {
                title: `${md.display_name} Content Moderation Profile`,
                description: `Refusal rates, category breakdown, and behavioral analysis for ${md.display_name} (${md.provider}).`,
            },
        };
    } catch {
        return { title: 'Model — Moderation Bias' };
    }
}

export default async function ModelPage({ params }: { params: Promise<{ provider: string, model: string }> }) {
    const { provider, model } = await params;
    const decodedModel = decodeURIComponent(model);
    const id = `${provider}/${decodedModel}`;

    let models: ModelInfo[] = [];
    let stats: ModelStats | null = null;
    let categories: string[] = [];
    let allModels: string[] = [];
    let longitudinalChart: any[] = [];
    let modelInfo: ModelInfo | undefined;

    let compareData: any = null;
    let driftData: any = null;
    let politicalData: any = null;
    let paternalismData: any = null;
    let consensusData: any = null;

    try {
        const data = await getModelData();
        models = data.models;
        modelInfo = models.find(m => m.id === id);
        stats = data.compare.modelStats?.[id] || null;
        categories = data.compare.categories || [];
        allModels = data.compare.models || [];
        longitudinalChart = Array.isArray(data.longitudinal.chartData) ? data.longitudinal.chartData : [];
        compareData = data.compare;

        driftData = data.drift?.find((d: any) => d.model === id);
        politicalData = data.political?.find((d: any) => d.model === id);
        paternalismData = data.paternalism?.find((d: any) => d.model === id);
        consensusData = data.consensus?.perModel?.find((d: any) => d.model === id);
    } catch { }

    if (!modelInfo) {
        return (
            <main className="max-w-4xl mx-auto py-12 px-6">
                <p className="text-muted-foreground">Model not found: <code>{id}</code></p>
                <Link href="/compare" className="text-primary hover:underline mt-4 inline-block">← Back to Compare</Link>
            </main>
        );
    }

    // Compute trend: compare last two data points for this model
    const modelPoints = longitudinalChart
        .map(d => ({ date: d.date, rate: d[id] as number | null }))
        .filter(d => d.rate !== null && d.rate !== undefined);
    const trend = modelPoints.length >= 2
        ? (modelPoints[modelPoints.length - 1].rate! - modelPoints[modelPoints.length - 2].rate!)
        : null;

    // Sort categories by this model's rate descending
    const categoryEntries = categories
        .map(cat => {
            const rateData = stats?.categoryRates?.[cat];
            const rate = typeof rateData === 'object' && rateData !== null ? rateData.rate : rateData;
            return { cat, rate: rate ?? null };
        })
        .filter(e => e.rate !== null)
        .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));

    // Other models sorted by refusal rate for ranking context
    const ranked = allModels
        .map(m => ({ id: m, rate: compareData?.modelStats?.[m]?.refusalRate ?? null }))
        .filter(m => m.rate !== null)
        .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
    const rank = ranked.findIndex(m => m.id === id) + 1;

    const logoUrl = getLogoUrl(id);

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://moderationbias.com/'
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'Models',
                item: 'https://moderationbias.com/models'
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: modelInfo.display_name,
                item: `https://moderationbias.com/models/${id}`
            }
        ]
    };

    const datasetJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: `${modelInfo.display_name} Content Moderation Audit`,
        description: `Independent audit of ${modelInfo.display_name}'s content moderation behavior across ${stats?.total?.toLocaleString() ?? 'multiple'} prompts in ${categories.length} categories. Refusal rate: ${stats ? Math.round(stats.refusalRate) : 'N/A'}%.`,
        url: `https://moderationbias.com/models/${id}`,
        creator: {
            '@type': 'Organization',
            name: modelInfo.provider,
        },
        variableMeasured: [
            { '@type': 'PropertyValue', name: 'Refusal Rate', value: stats ? `${Math.round(stats.refusalRate)}%` : 'N/A' },
            { '@type': 'PropertyValue', name: 'Total Evaluations', value: stats?.total ?? 0 },
            { '@type': 'PropertyValue', name: 'Categories Tested', value: categories.length },
        ],
        isAccessibleForFree: true,
        license: 'https://creativecommons.org/licenses/by/4.0/',
    };

    return (
        <main className="max-w-4xl mx-auto py-12 px-6 space-y-10">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
            />
            {/* Back link */}
            <Link href="/compare" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                All model comparisons
            </Link>

            {/* Header */}
            <header className="flex items-start gap-5">
                {logoUrl && (
                    <>
                        <Image src={logoUrl} alt={`${modelInfo.display_name} logo by ${modelInfo.provider}`} width={56} height={56} className="h-14 w-14 object-contain rounded-xl border border-border bg-card p-2 flex-shrink-0" unoptimized />
                    </>
                )}
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand mb-1">{modelInfo.provider}</p>
                    <h1 className="text-3xl font-black text-foreground">{modelInfo.display_name}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {modelInfo.tier} tier · {modelInfo.id}
                    </p>
                </div>
            </header>

            {/* Key stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    {
                        label: 'Refusal Rate',
                        value: stats ? `${Math.round(stats.refusalRate)}%` : '—',
                        sub: rank > 0 ? `#${rank} of ${ranked.length} models` : undefined,
                        accent: true,
                        trend,
                    },
                    {
                        label: 'Evaluations',
                        value: stats ? stats.total.toLocaleString() : '—',
                    },
                    {
                        label: 'Cost / 1M in',
                        value: modelInfo.cost_per_m_in ? `$${modelInfo.cost_per_m_in}` : '—',
                    },
                    {
                        label: 'Cost / 1M out',
                        value: modelInfo.cost_per_m_out ? `$${modelInfo.cost_per_m_out}` : '—',
                    },
                ].map(({ label, value, sub, accent, trend }) => (
                    <div key={label} className={`rounded-xl border p-4 ${accent ? 'border-brand/30 bg-brand/5' : 'border-border bg-card'}`}>
                        {label === 'Refusal Rate' ? (
                            <TooltipHover
                                label={<p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>}
                                tooltipText="Percentage of prompts in our dataset that this model refused to answer. Higher = more restrictive."
                            />
                        ) : (
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                        )}
                        <div className="flex items-center gap-2">
                            <p className={`text-2xl font-black ${accent ? 'text-brand' : 'text-foreground'}`}>{value}</p>
                            {trend !== null && trend !== undefined ? (
                                <span className={`text-xs font-semibold flex items-center gap-0.5 ${trend > 0 ? 'text-red-500' : trend < 0 ? 'text-green-600' : 'text-muted-foreground'
                                    }`}>
                                    {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                    {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                                </span>
                            ) : null}
                        </div>
                        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
                    </div>
                ))}
            </div>

            {/* Category Breakdown */}
            {categoryEntries.length > 0 && (
                <section>
                    <h2 className="text-lg font-bold text-foreground mb-4">Refusal Rate by Category</h2>
                    <div className="space-y-2.5">
                        {categoryEntries.map(({ cat, rate }) => (
                            <div key={cat}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-foreground font-medium">{cat}</span>
                                    <span className="text-muted-foreground font-mono">{Math.round(rate!)}%</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-brand rounded-full transition-all"
                                        style={{ width: `${Math.min(rate!, 100)}%` }}
                                        role="progressbar"
                                        aria-valuenow={Math.round(rate!)}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-label={`${cat}: ${Math.round(rate!)}% refusal rate`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Analysis Deep Dives */}
            {(consensusData || politicalData || driftData || (paternalismData && paternalismData.refusal_rate > 0)) && (
                <section className="space-y-4">
                    <h2 className="text-lg font-bold text-foreground">Analysis Deep Dives</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Consensus */}
                        {consensusData && (
                            <div className="bg-card border border-border rounded-xl p-5">
                                <Link href="/analysis/consensus" className="text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider mb-2 flex items-center gap-1 transition-colors group w-fit">
                                    Council Consensus
                                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all -ml-2 group-hover:ml-0" />
                                </Link>
                                <div className="flex justify-between items-end mb-1">
                                    <h3 className="text-lg font-black text-foreground">Majority Agreement</h3>
                                    <span className="text-xl font-bold text-brand">{consensusData.agreementRate.toFixed(1)}%</span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">Model's alignment with the council decision.</p>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-brand rounded-full" style={{ width: `${consensusData.agreementRate}%` }} />
                                </div>
                                <p className="text-xs text-muted-foreground mt-3 font-mono">CAPP Score: {consensusData.kappa.toFixed(2)}</p>
                            </div>
                        )}

                        {/* Political Compass */}
                        {politicalData && (
                            <div className="bg-card border border-border rounded-xl p-5">
                                <Link href="/analysis/political" className="text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider mb-2 flex items-center gap-1 transition-colors group w-fit">
                                    Political Compass
                                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all -ml-2 group-hover:ml-0" />
                                </Link>
                                <div className="flex flex-col gap-3 mt-3">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-muted-foreground">Econ <span className="text-[10px]">(Left &rarr; Right)</span></span>
                                            <span className="font-semibold text-foreground">{politicalData.economic > 0 ? '+' : ''}{politicalData.economic.toFixed(1)}</span>
                                        </div>
                                        <div className="h-1.5 bg-muted rounded-full overflow-hidden relative">
                                            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-border z-10 -ml-[1px]" />
                                            <div className="absolute top-0 bottom-0 bg-blue-500 rounded-full" style={{ left: politicalData.economic < 0 ? `${50 + politicalData.economic * 5}%` : '50%', right: politicalData.economic > 0 ? `${50 - politicalData.economic * 5}%` : '50%' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-muted-foreground">Social <span className="text-[10px]">(Lib &rarr; Auth)</span></span>
                                            <span className="font-semibold text-foreground">{politicalData.social > 0 ? '+' : ''}{politicalData.social.toFixed(1)}</span>
                                        </div>
                                        <div className="h-1.5 bg-muted rounded-full overflow-hidden relative">
                                            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-border z-10 -ml-[1px]" />
                                            <div className="absolute top-0 bottom-0 bg-red-500 rounded-full" style={{ left: politicalData.social < 0 ? `${50 + politicalData.social * 5}%` : '50%', right: politicalData.social > 0 ? `${50 - politicalData.social * 5}%` : '50%' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Drift */}
                        {driftData && (
                            <div className="bg-card border border-border rounded-xl p-5">
                                <Link href="/analysis/drift" className="text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider mb-2 flex items-center gap-1 transition-colors group w-fit">
                                    Model Stability (Drift)
                                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all -ml-2 group-hover:ml-0" />
                                </Link>
                                <div className="flex justify-between items-end mb-1">
                                    <h3 className="text-lg font-black text-foreground">Refusal Rate Change</h3>
                                    <span className={`text-xl font-bold ${driftData.rate_change > 0 ? 'text-red-500' : driftData.rate_change < 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
                                        {driftData.rate_change > 0 ? '+' : ''}{driftData.rate_change.toFixed(1)}%
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">Difference over the testing period.</p>
                                <div className="flex justify-between text-sm text-muted-foreground mt-4 pt-4 border-t border-border">
                                    <span>Start: {driftData.start_refusal_rate}%</span>
                                    <span>&rarr;</span>
                                    <span>End: {driftData.end_refusal_rate}%</span>
                                </div>
                            </div>
                        )}

                        {/* Paternalism */}
                        {paternalismData && paternalismData.refusal_rate > 0 && (
                            <div className="bg-card border border-border rounded-xl p-5">
                                <Link href="/analysis/paternalism" className="text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider mb-2 flex items-center gap-1 transition-colors group w-fit">
                                    Paternalism Audit
                                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all -ml-2 group-hover:ml-0" />
                                </Link>
                                <div className="flex justify-between items-end mb-1">
                                    <h3 className="text-lg font-black text-foreground">Persona Refusal Rate</h3>
                                    <span className="text-xl font-bold text-foreground">{paternalismData.refusal_rate.toFixed(1)}%</span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">Refusals for sensitive user personas.</p>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(paternalismData.refusal_rate, 100)}%` }} />
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* CTA */}
            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href={`/compare?modelA=${encodeURIComponent(id)}`}
                    className="inline-flex items-center gap-2 bg-brand text-white font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-brand-dark transition-all hover:scale-105 active:scale-95"
                >
                    Compare {modelInfo.display_name}
                    <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                    href="/compare"
                    className="inline-flex items-center gap-2 border border-border text-foreground font-medium text-sm px-5 py-2.5 rounded-lg hover:bg-muted/40 transition-all"
                >
                    <BarChart2 className="h-4 w-4" />
                    All Model Rankings
                </Link>
            </div>

            {/* Hidden variable to avoid build error */}
            {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
        </main>
    );
}
