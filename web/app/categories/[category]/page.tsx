import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getLogoUrl } from '@/lib/provider-logos';

const CATEGORIES: Record<string, string> = {
    'crime': 'Crime',
    'cybersecurity': 'Cybersecurity',
    'dangerous': 'Dangerous',
    'deception': 'Deception',
    'explicit-sexual': 'Explicit/Sexual',
    'false-positive-control': 'False Positive Control',
    'harassment': 'Harassment',
    'hate-speech': 'Hate Speech',
    'health-misinformation': 'Health Misinformation',
    'incitement-to-violence': 'Incitement to Violence',
    'paternalism': 'Paternalism',
    'political': 'Political',
    'self-harm': 'Self-Harm',
    'weapons': 'Weapons',
};

export async function generateStaticParams() {
    return Object.keys(CATEGORIES).map(slug => ({ category: slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
    const { category } = await params;
    const label = CATEGORIES[category];
    if (!label) return { title: 'Category Not Found — Moderation Bias' };
    return {
        title: `${label} — AI Censorship by Category — Moderation Bias`,
        description: `How do GPT-4, Claude, Llama, and Gemini handle "${label}" content? Compare refusal rates across all major LLMs for this category of prompts.`,
        openGraph: {
            title: `${label} AI Censorship Comparison`,
            description: `Refusal rates and model disagreements for "${label}" prompts across all major LLMs.`,
        },
    };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
    const { category } = await params;
    const label = CATEGORIES[category];

    if (!label) {
        return (
            <main className="max-w-4xl mx-auto py-12 px-6">
                <p className="text-muted-foreground">Category not found.</p>
                <Link href="/analysis/summary" className="text-primary hover:underline mt-4 inline-block">← Back to Analysis</Link>
            </main>
        );
    }

    // Load compare_data to get per-model category rates
    let modelRankings: { id: string; name: string; rate: number }[] = [];
    let models: any[] = [];
    try {
        const comparePath = path.join(process.cwd(), 'public', 'compare_data.json');
        const modelsPath = path.join(process.cwd(), 'public', 'models.json');

        const [compareFile, modelsFile] = await Promise.all([
            fs.promises.readFile(comparePath, 'utf8'),
            fs.promises.readFile(modelsPath, 'utf8')
        ]);

        const compare = JSON.parse(compareFile);
        models = JSON.parse(modelsFile);
        const modelMap = new Map(models.map((m: any) => [m.id, m]));

        modelRankings = compare.models
            .map((id: string) => {
                const rate = compare.modelStats?.[id]?.categoryRates?.[label];
                const info = modelMap.get(id);
                return { id, name: info?.display_name || id.split('/').pop() || id, rate: rate ?? null };
            })
            .filter((m: any) => m.rate !== null)
            .sort((a: any, b: any) => b.rate - a.rate);
    } catch { }

    const maxRate = modelRankings.length > 0 ? Math.max(...modelRankings.map(m => m.rate)) : 100;

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
                name: 'Categories',
                item: 'https://moderationbias.com/categories'
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: label,
                item: `https://moderationbias.com/categories/${category}`
            }
        ]
    };

    return (
        <main className="max-w-4xl mx-auto py-12 px-6 space-y-10">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Link href="/analysis/summary" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Analysis
            </Link>

            <header className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Category Analysis</p>
                <h1 className="text-3xl md:text-4xl font-black text-foreground">{label}</h1>
                <p className="text-muted-foreground max-w-2xl leading-relaxed">
                    Refusal rates across all evaluated LLMs for <strong>{label}</strong> prompts. Higher rates indicate the model is more likely to refuse or restrict this type of content.
                </p>
            </header>

            {/* Model ranking */}
            {modelRankings.length > 0 ? (
                <section>
                    <h2 className="text-lg font-bold text-foreground mb-5">
                        Model Refusal Rates — {label}
                    </h2>
                    <div className="space-y-3">
                        {modelRankings.map(({ id, name, rate }, idx) => {
                            const logoUrl = getLogoUrl(id);
                            return (
                                <div key={id} className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0">{idx + 1}</span>
                                    {logoUrl && <Image src={logoUrl} width={20} height={20} alt="" className="object-contain flex-shrink-0" aria-hidden="true" unoptimized />}
                                    <span className="text-sm text-foreground w-44 truncate flex-shrink-0">{name}</span>
                                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-brand rounded-full"
                                            style={{ width: `${(rate / maxRate) * 100}%` }}
                                            role="progressbar"
                                            aria-valuenow={Math.round(rate)}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-label={`${name}: ${Math.round(rate)}% refusal rate`}
                                        />
                                    </div>
                                    <span className="text-sm font-mono text-muted-foreground w-12 text-right">{Math.round(rate)}%</span>
                                    <Link
                                        href={`/models/${id}`}
                                        className="text-xs text-primary hover:underline flex-shrink-0"
                                        aria-label={`View ${name} full profile`}
                                    >
                                        Profile →
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                </section>
            ) : (
                <p className="text-muted-foreground text-sm">No per-category data available yet for this category.</p>
            )}

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 pt-2">
                <Link
                    href="/compare"
                    className="inline-flex items-center gap-2 bg-brand text-white font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-brand-dark transition-all hover:scale-105 active:scale-95"
                >
                    Compare Models <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                    href="/analysis/summary"
                    className="inline-flex items-center gap-2 border border-border text-foreground font-medium text-sm px-5 py-2.5 rounded-lg hover:bg-muted/40 transition-all"
                >
                    Full Analysis
                </Link>
            </div>
        </main>
    );
}
