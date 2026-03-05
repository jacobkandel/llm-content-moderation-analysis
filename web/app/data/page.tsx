import Link from 'next/link';
import type { Metadata } from 'next';
import { Database, Download, ExternalLink, FileJson, Github, Table2 } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Access the Data — Moderation Bias',
    description: 'Download or query the full Moderation Bias audit dataset. Available as CSV, JSON, and via the HuggingFace Datasets API.',
    openGraph: {
        title: 'Moderation Bias — Dataset Access',
        description: 'Full audit log, precomputed JSON endpoints, and HuggingFace dataset for the LLM censorship benchmark.',
    },
};

const BLOB_BASE = 'https://oeqbf51ent3zxva1.public.blob.vercel-storage.com';
const HF_REPO = 'https://huggingface.co/datasets/jmk9494/moderation-bias-benchmark';
const GITHUB_REPO = 'https://github.com/jacobkandel/llm-content-moderation-analysis';

const endpoints = [
    {
        path: '/summary_stats.json',
        description: 'Aggregate stats: total assessments, model count, last updated date, timeline dates.',
    },
    {
        path: '/models.json',
        description: 'Full model registry: provider, region, tier, cost per million tokens.',
    },
    {
        path: '/compare_data.json',
        description: 'Per-model refusal rates by category — powers the Compare page.',
    },
    {
        path: '/spectrum_data.json',
        description: 'Restrictiveness spectrum: ranked refusal rates with confidence intervals.',
    },
    {
        path: '/heatmap_matrix.json',
        description: 'Model × category refusal rate matrix for heatmap visualisation.',
    },
    {
        path: '/longitudinal_data.json',
        description: 'Weekly refusal rate trends per model over time.',
    },
    {
        path: '/consensus_stats.json',
        description: 'Council consensus: prompts where all models agree vs. disagree.',
    },
    {
        path: '/significance_pairwise.json',
        description: 'McNemar\'s test p-values for every model pair.',
    },
    {
        path: '/clusters.json',
        description: 'Semantic clusters of prompts based on embedding similarity.',
    },
    {
        path: '/political_compass.json',
        description: 'Political compass positions derived from model response patterns.',
    },
    {
        path: '/drift_report.json',
        description: 'Model drift scores: how much each model\'s behaviour has changed over time.',
    },
];

export default function DataPage() {
    return (
        <main className="max-w-4xl mx-auto py-12 px-6 space-y-12">
            <header className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Open Data</p>
                <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight">
                    Access the Dataset
                </h1>
                <p className="text-muted-foreground max-w-2xl leading-relaxed">
                    All audit data from Moderation Bias is publicly available. Use it for research,
                    replication, or to build your own analyses.
                </p>
            </header>

            {/* ── Full audit log ── */}
            <section className="space-y-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Table2 className="h-5 w-5 text-brand" />
                    Full Audit Log (CSV)
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    The complete audit log — every prompt, every model, every verdict — updated weekly.
                    100 K+ rows covering 24 models and 2,000+ prompts.
                </p>
                <a
                    href={`${BLOB_BASE}/data/audit_log.csv.gz`}
                    className="inline-flex items-center gap-2 bg-brand text-white font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-brand/80 transition-all hover:scale-105 active:scale-95"
                >
                    <Download className="h-4 w-4" />
                    Download audit_log.csv.gz
                </a>
                <p className="text-xs text-muted-foreground/60">
                    Gzip-compressed CSV · ~19 MB · Updated every Sunday
                </p>
                <div className="bg-muted/40 border border-border rounded-lg p-4">
                    <p className="text-xs font-mono text-muted-foreground">
                        <span className="text-brand font-bold">Columns: </span>
                        test_date, model, model_version, prompt_id, category, style, persona,
                        verdict, classification, prompt_text, response_text, prompt_tokens,
                        completion_tokens, total_tokens, run_cost, confidence, reasoning
                    </p>
                </div>
            </section>

            {/* ── HuggingFace ── */}
            <section className="space-y-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Database className="h-5 w-5 text-brand" />
                    HuggingFace Dataset
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    The dataset is mirrored to HuggingFace Datasets for easy loading in Python.
                </p>
                <pre className="text-xs bg-muted/40 border border-border rounded-lg p-4 overflow-x-auto text-muted-foreground/90 font-mono whitespace-pre">{`from datasets import load_dataset

ds = load_dataset("jmk9494/moderation-bias-benchmark")
df = ds["train"].to_pandas()`}</pre>
                <a
                    href={HF_REPO}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-border text-foreground font-medium text-sm px-5 py-2.5 rounded-lg hover:bg-muted/40 transition-all"
                >
                    <ExternalLink className="h-4 w-4" />
                    View on HuggingFace
                </a>
            </section>

            {/* ── JSON endpoints ── */}
            <section className="space-y-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <FileJson className="h-5 w-5 text-brand" />
                    Precomputed JSON Endpoints
                </h2>
                <p className="text-sm text-muted-foreground">
                    All visualisation data is available as static JSON at{' '}
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">https://moderationbias.com</code>.
                    These update on every weekly audit run.
                </p>
                <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                    {endpoints.map(({ path, description }) => (
                        <div key={path} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                            <a
                                href={`https://moderationbias.com${path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-mono text-brand hover:underline flex-shrink-0 w-56"
                            >
                                {path}
                            </a>
                            <span className="text-xs text-muted-foreground">{description}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Source ── */}
            <section className="space-y-3">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Github className="h-5 w-5 text-brand" />
                    Source Code & Methodology
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    The full auditing pipeline — prompt set, model registry, scoring logic, and statistical
                    analysis — is open source under the MIT licence.
                </p>
                <div className="flex flex-wrap gap-3">
                    <a
                        href={GITHUB_REPO}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 border border-border text-foreground font-medium text-sm px-5 py-2.5 rounded-lg hover:bg-muted/40 transition-all"
                    >
                        <Github className="h-4 w-4" />
                        View on GitHub
                    </a>
                    <Link
                        href="/about"
                        className="inline-flex items-center gap-2 border border-border text-foreground font-medium text-sm px-5 py-2.5 rounded-lg hover:bg-muted/40 transition-all"
                    >
                        Methodology & Citation
                    </Link>
                </div>
            </section>
        </main>
    );
}
