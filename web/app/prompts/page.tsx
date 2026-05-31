'use client';

import { useEffect, useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, ShieldCheck, ShieldX } from 'lucide-react';
import SkeletonLoader from '@/components/SkeletonLoader';
import { sanitizeSearchInput } from '@/lib/utils';

interface PromptEntry {
    id: string;
    text: string;
    category: string;
    source: string;
}

function SourceBadge({ source }: { source: string }) {
    const colors: Record<string, string> = {
        'Hand-Written': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        'Template-Generated': 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        'Style Variant': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        'Boundary Test': 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
        'False Positive Control': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    };
    return (
        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-medium ${colors[source] || 'bg-muted/30 text-muted-foreground'}`}>
            {source}
        </span>
    );
}

export default function PromptsPage() {
    const [prompts, setPrompts] = useState<PromptEntry[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 50;

    useEffect(() => {
        // Load from pre-built prompts_list.json (fast, always available)
        fetch('/prompts_list.json')
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data: PromptEntry[]) => {
                setPrompts(data.filter(p => p.text && p.text.trim()));
                setLoading(false);
            })
            .catch(e => {
                setError('Could not load prompt data. The data may still be generating.');
                setLoading(false);
            });
    }, []);

    const categories = useMemo(() => {
        if (!prompts) return [];
        return [...new Set(prompts.map(p => p.category))].filter(Boolean).sort();
    }, [prompts]);

    const sources = useMemo(() => {
        if (!prompts) return [];
        return [...new Set(prompts.map(p => p.source))].filter(Boolean).sort();
    }, [prompts]);

    const filtered = useMemo(() => {
        if (!prompts) return [];
        let results = prompts;

        if (categoryFilter !== 'all') {
            results = results.filter(p => p.category === categoryFilter);
        }
        if (sourceFilter !== 'all') {
            results = results.filter(p => p.source === sourceFilter);
        }
        if (search) {
            const s = sanitizeSearchInput(search).toLowerCase();
            results = results.filter(p =>
                p.text.toLowerCase().includes(s) ||
                p.id.toLowerCase().includes(s)
            );
        }
        return results;
    }, [prompts, categoryFilter, sourceFilter, search]);

    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

    if (loading) return <SkeletonLoader />;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">Evidence</p>
                <h1 className="text-3xl md:text-4xl font-black text-foreground mb-2">
                    Prompt Explorer
                </h1>
                <p className="text-muted-foreground max-w-2xl">
                    Browse every prompt in the benchmark. Filter by category or source type
                    and click a row to see the full prompt text.
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-400">
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                        placeholder="Search prompts or IDs..."
                        className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
                    className="px-3 py-2.5 text-sm rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
                >
                    <option value="all">All Categories</option>
                    {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
                <select
                    value={sourceFilter}
                    onChange={(e) => { setSourceFilter(e.target.value); setPage(0); }}
                    className="px-3 py-2.5 text-sm rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
                >
                    <option value="all">All Sources</option>
                    {sources.map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{filtered.length.toLocaleString()}</span> prompts
                    {prompts && filtered.length !== prompts.length && ` (filtered from ${prompts.length.toLocaleString()} total)`}
                    {totalPages > 1 && ` · Page ${page + 1} of ${totalPages}`}
                </p>
            </div>

            {/* Prompt List */}
            <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
                {paged.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                        No prompts match your filters.
                    </div>
                ) : paged.map((prompt) => {
                    const isExpanded = expandedId === prompt.id;
                    return (
                        <div key={prompt.id}>
                            <button
                                onClick={() => setExpandedId(isExpanded ? null : prompt.id)}
                                className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-muted/20 transition-colors"
                            >
                                {isExpanded
                                    ? <ChevronDown className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                    : <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                }
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground line-clamp-2 mb-1.5">{prompt.text}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">
                                            {prompt.category}
                                        </span>
                                        <SourceBadge source={prompt.source} />
                                        <span className="text-[10px] font-mono text-muted-foreground/60">{prompt.id}</span>
                                    </div>
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="bg-muted/10 border-t border-border px-6 py-4">
                                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{prompt.text}</p>
                                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                                        <span>ID: <span className="font-mono">{prompt.id}</span></span>
                                        <span>·</span>
                                        <span>Category: {prompt.category}</span>
                                        <span>·</span>
                                        <span>Source: {prompt.source}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        disabled={page === 0}
                        onClick={() => setPage(p => p - 1)}
                        className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:bg-muted/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-muted-foreground">
                        {page + 1} / {totalPages}
                    </span>
                    <button
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:bg-muted/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
