import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { getLogoUrl } from '@/lib/provider-logos';
import { ArrowLeft, ArrowRight, BarChart2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
    categoryRates: Record<string, number>;
}

function getModelData() {
    const modelsPath = path.join(process.cwd(), 'public', 'models.json');
    const comparePath = path.join(process.cwd(), 'public', 'compare_data.json');
    const longitudinalPath = path.join(process.cwd(), 'public', 'longitudinal_data.json');
    const models: ModelInfo[] = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
    const compare = JSON.parse(fs.readFileSync(comparePath, 'utf8'));
    const longitudinal = JSON.parse(fs.readFileSync(longitudinalPath, 'utf8'));
    return { models, compare, longitudinal };
}

export async function generateStaticParams() {
    try {
        const modelsPath = path.join(process.cwd(), 'public', 'models.json');
        const models: ModelInfo[] = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
        return models.map(m => ({ modelId: m.id.split('/') }));
    } catch {
        return [];
    }
}

export async function generateMetadata({ params }: { params: Promise<{ modelId: string[] }> }): Promise<Metadata> {
    const { modelId } = await params;
    const id = modelId.join('/');
    try {
        const modelsPath = path.join(process.cwd(), 'public', 'models.json');
        const models: ModelInfo[] = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
        const model = models.find(m => m.id === id);
        if (!model) return { title: 'Model Not Found — Moderation Bias' };
        const comparePath = path.join(process.cwd(), 'public', 'compare_data.json');
        const compare = JSON.parse(fs.readFileSync(comparePath, 'utf8'));
        const stats: ModelStats | undefined = compare.modelStats?.[id];
        const refusalPct = stats ? Math.round(stats.refusalRate) : null;
        return {
            title: `${model.display_name} Censorship Analysis — Moderation Bias`,
            description: `How does ${model.display_name} handle content moderation? ${refusalPct !== null ? `Refusal rate: ${refusalPct}%. ` : ''}Category breakdown, behavioral trends, and side-by-side comparisons with other LLMs.`,
            openGraph: {
                title: `${model.display_name} Content Moderation Profile`,
                description: `Refusal rates, category breakdown, and behavioral analysis for ${model.display_name} (${model.provider}).`,
            },
        };
    } catch {
        return { title: 'Model — Moderation Bias' };
    }
}

export default async function ModelPage({ params }: { params: Promise<{ modelId: string[] }> }) {
    const { modelId } = await params;
    const id = modelId.join('/');

    let models: ModelInfo[] = [];
    let stats: ModelStats | null = null;
    let categories: string[] = [];
    let allModels: string[] = [];
    let longitudinalChart: any[] = [];
    let modelInfo: ModelInfo | undefined;

    let compareData: any = null;
    try {
        const data = getModelData();
        models = data.models;
        modelInfo = models.find(m => m.id === id);
        stats = data.compare.modelStats?.[id] || null;
        categories = data.compare.categories || [];
        allModels = data.compare.models || [];
        longitudinalChart = Array.isArray(data.longitudinal.chartData) ? data.longitudinal.chartData : [];
        compareData = data.compare;
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
        .map(cat => ({ cat, rate: stats?.categoryRates?.[cat] ?? null }))
        .filter(e => e.rate !== null)
        .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));

    // Other models sorted by refusal rate for ranking context
    const ranked = allModels
        .map(m => ({ id: m, rate: compareData?.modelStats?.[m]?.refusalRate ?? null }))
        .filter(m => m.rate !== null)
        .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
    const rank = ranked.findIndex(m => m.id === id) + 1;

    const logoUrl = getLogoUrl(id);

    return (
        <main className="max-w-4xl mx-auto py-12 px-6 space-y-10">
            {/* Back link */}
            <Link href="/compare" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                All model comparisons
            </Link>

            {/* Header */}
            <header className="flex items-start gap-5">
                {logoUrl && (
                    <>
                        {/* @ts-expect-error - React 19 types mismatch with next/image */}
                        <Image src={logoUrl} alt={modelInfo.provider} width={56} height={56} className="h-14 w-14 object-contain rounded-xl border border-border bg-card p-2 flex-shrink-0" unoptimized />
                    </>
                )}
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#800000] mb-1">{modelInfo.provider}</p>
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
                    <div key={label} className={`rounded-xl border p-4 ${accent ? 'border-[#800000]/30 bg-[#800000]/5' : 'border-border bg-card'}`}>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                        <div className="flex items-center gap-2">
                            <p className={`text-2xl font-black ${accent ? 'text-[#800000]' : 'text-foreground'}`}>{value}</p>
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
                                        className="h-full bg-[#800000] rounded-full transition-all"
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

            {/* CTA */}
            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href={`/compare?modelA=${encodeURIComponent(id)}`}
                    className="inline-flex items-center gap-2 bg-[#800000] text-white font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-[#9a0000] transition-all hover:scale-105 active:scale-95"
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
