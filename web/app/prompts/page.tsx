'use client';

import { useEffect, useState, useMemo } from 'react';
import { Search, Filter, ChevronDown, ChevronRight, ShieldCheck, ShieldX, Eye } from 'lucide-react';
import SkeletonLoader from '@/components/SkeletonLoader';
import { fetchAuditData, type AuditRow } from '@/lib/data-loading';
import { getLogoUrl } from '@/lib/provider-logos';
import { sanitizeSearchInput } from '@/lib/utils';

function VerdictDot({ verdict }: { verdict: string }) {
    const v = verdict?.toUpperCase();
    const isAllowed = v === 'ALLOWED' || v === 'SAFE';
    return (
        <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${isAllowed ? 'bg-emerald-500' : 'bg-red-500'}`}
            title={isAllowed ? 'ALLOWED' : 'REMOVED'}
        />
    );
}

export default function PromptsPage() {
    const [data, setData] = useState<AuditRow[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [verdictFilter, setVerdictFilter] = useState<'all' | 'allowed' | 'removed'>('all');
    const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 25;

    useEffect(() => {
        fetchAuditData(false, false).then(rows => {
            setData((rows || []).filter(r => r.verdict !== 'ERROR'));
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const categories = useMemo(() => {
        if (!data) return [];
        return [...new Set(data.map(r => r.category))].filter(Boolean).sort();
    }, [data]);

    const models = useMemo(() => {
        if (!data) return [];
        return [...new Set(data.map(r => r.model))].filter(Boolean).sort();
    }, [data]);

    // Group by prompt text, compute per-model verdicts
    const promptGroups = useMemo(() => {
        if (!data) return [];

        const groups = new Map<string, {
            prompt: string;
            category: string;
            verdicts: Map<string, { verdict: string; response: string }>;
        }>();

        for (const row of data) {
            if (!row.prompt) continue;
            if (!groups.has(row.prompt)) {
                groups.set(row.prompt, {
                    prompt: row.prompt,
                    category: row.category,
                    verdicts: new Map(),
                });
            }
            const group = groups.get(row.prompt)!;
            group.verdicts.set(row.model, {
                verdict: row.verdict,
                response: row.response || '',
            });
        }

        let results = [...groups.values()];

        // Filters
        if (categoryFilter !== 'all') {
            results = results.filter(g => g.category === categoryFilter);
        }
        if (search) {
            const s = sanitizeSearchInput(search).toLowerCase();
            results = results.filter(g => g.prompt.toLowerCase().includes(s));
        }
        if (verdictFilter !== 'all') {
            results = results.filter(g => {
                const verdicts = [...g.verdicts.values()].map(v => v.verdict.toUpperCase());
                if (verdictFilter === 'removed') {
                    return verdicts.some(v => v === 'REMOVED' || v === 'REFUSAL' || v === 'UNSAFE');
                }
                return verdicts.every(v => v === 'ALLOWED' || v === 'SAFE');
            });
        }

        // Sort by category then prompt
        results.sort((a, b) => a.category.localeCompare(b.category) || a.prompt.localeCompare(b.prompt));
        return results;
    }, [data, categoryFilter, search, verdictFilter]);

    const paged = promptGroups.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const totalPages = Math.ceil(promptGroups.length / PAGE_SIZE);

    if (loading) return <SkeletonLoader />;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">Evidence</p>
                <h1 className="text-3xl md:text-4xl font-black text-foreground mb-2">
                    Prompt Explorer
                </h1>
                <p className="text-muted-foreground max-w-2xl">
                    Browse every prompt in the benchmark and see how each model responded.
                    Click a row to expand the full per-model verdicts.
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                        placeholder="Search prompts..."
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
                    value={verdictFilter}
                    onChange={(e) => { setVerdictFilter(e.target.value as any); setPage(0); }}
                    className="px-3 py-2.5 text-sm rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
                >
                    <option value="all">All Verdicts</option>
                    <option value="removed">Has Refusals</option>
                    <option value="allowed">All Allowed</option>
                </select>
            </div>

            {/* Results count */}
            <p className="text-xs text-muted-foreground">
                {promptGroups.length} prompts found · Page {page + 1} of {totalPages || 1}
            </p>

            {/* Prompt List */}
            <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
                {paged.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                        No prompts match your filters.
                    </div>
                ) : paged.map((group) => {
                    const isExpanded = expandedPrompt === group.prompt;
                    const refusalCount = [...group.verdicts.values()].filter(
                        v => ['REMOVED', 'REFUSAL', 'UNSAFE'].includes(v.verdict.toUpperCase())
                    ).length;
                    const totalModels = group.verdicts.size;

                    return (
                        <div key={group.prompt}>
                            <button
                                onClick={() => setExpandedPrompt(isExpanded ? null : group.prompt)}
                                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
                            >
                                {isExpanded
                                    ? <ChevronDown className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                    : <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                }
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground line-clamp-2">{group.prompt}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">
                                            {group.category}
                                        </span>
                                        {refusalCount > 0 ? (
                                            <span className="text-[10px] text-red-400 flex items-center gap-1">
                                                <ShieldX className="h-3 w-3" />
                                                {refusalCount}/{totalModels} refused
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                                                <ShieldCheck className="h-3 w-3" />
                                                All {totalModels} allowed
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-0.5 shrink-0 mt-1">
                                    {models.slice(0, 12).map(m => {
                                        const v = group.verdicts.get(m);
                                        if (!v) return <span key={m} className="w-2.5 h-2.5 rounded-full bg-muted/30" />;
                                        return <VerdictDot key={m} verdict={v.verdict} />;
                                    })}
                                    {models.length > 12 && (
                                        <span className="text-[9px] text-muted-foreground ml-1">+{models.length - 12}</span>
                                    )}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="bg-muted/10 border-t border-border px-4 py-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {models.map(m => {
                                            const v = group.verdicts.get(m);
                                            if (!v) return null;
                                            const isAllowed = ['ALLOWED', 'SAFE'].includes(v.verdict.toUpperCase());
                                            return (
                                                <div key={m} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${isAllowed ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
                                                    <img
                                                        src={getLogoUrl(m)}
                                                        alt=""
                                                        className="w-4 h-4 rounded mt-0.5"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-medium text-foreground">{m.split('/').pop()}</span>
                                                            <VerdictDot verdict={v.verdict} />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
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
