'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink } from 'lucide-react';
import Link from 'next/link';

type SortKey = 'rank' | 'refusalRate' | 'avgVerbosity' | 'total' | 'provider';
type SortDir = 'asc' | 'desc';

function heatColor(rate: number): string {
    if (rate >= 80) return 'text-red-500 font-bold';
    if (rate >= 60) return 'text-orange-500 font-semibold';
    if (rate >= 40) return 'text-yellow-600 font-semibold';
    if (rate >= 20) return 'text-green-600';
    return 'text-emerald-500';
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
    if (col !== sortKey) return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === 'desc'
        ? <ChevronDown className="h-3 w-3 text-brand" />
        : <ChevronUp className="h-3 w-3 text-brand" />;
}

interface Props {
    compareData: any;
}

export default function LeaderboardClient({ compareData }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>('refusalRate');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [selectedCategory, setSelectedCategory] = useState<string>('Overall');
    const [search, setSearch] = useState('');

    const { models, categories, modelStats } = compareData ?? {};

    const allCategories = useMemo(() => {
        if (!categories) return ['Overall'];
        return ['Overall', ...categories];
    }, [categories]);

    const rows = useMemo(() => {
        if (!models || !modelStats) return [];
        return models
            .map((fullName: string) => {
                const stats = modelStats[fullName] ?? {};
                const catRate = selectedCategory === 'Overall'
                    ? stats.refusalRate ?? 0
                    : stats.categoryRates?.[selectedCategory]?.rate ?? null;
                const ciLower = selectedCategory === 'Overall'
                    ? stats.refusalRateCILower
                    : stats.categoryRates?.[selectedCategory]?.ciLower;
                const ciUpper = selectedCategory === 'Overall'
                    ? stats.refusalRateCIUpper
                    : stats.categoryRates?.[selectedCategory]?.ciUpper;
                const provider = fullName.split('/')[0] ?? '';
                const shortName = fullName.split('/')[1] ?? fullName;
                return { fullName, provider, shortName, refusalRate: catRate, ciLower, ciUpper, avgVerbosity: stats.avgVerbosity ?? 0, total: stats.total ?? 0 };
            })
            .filter((r: any) => {
                if (!search) return true;
                return r.fullName.toLowerCase().includes(search.toLowerCase()) ||
                       r.provider.toLowerCase().includes(search.toLowerCase());
            });
    }, [models, modelStats, selectedCategory, search]);

    const sorted = useMemo(() => {
        const dir = sortDir === 'desc' ? -1 : 1;
        return [...rows].sort((a: any, b: any) => {
            if (sortKey === 'rank' || sortKey === 'refusalRate') {
                return ((b.refusalRate ?? -1) - (a.refusalRate ?? -1)) * (sortDir === 'desc' ? 1 : -1);
            }
            if (sortKey === 'avgVerbosity') return (a.avgVerbosity - b.avgVerbosity) * dir;
            if (sortKey === 'total') return (a.total - b.total) * dir;
            if (sortKey === 'provider') return a.provider.localeCompare(b.provider) * dir;
            return 0;
        });
    }, [rows, sortKey, sortDir]);

    const rankedSorted = sorted.map((r: any, i: number) => ({ ...r, rank: i + 1 }));

    function toggleSort(key: SortKey) {
        if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        else { setSortKey(key); setSortDir('desc'); }
    }

    const th = (label: string, key: SortKey, extraClass = '') => (
        <th
            key={key}
            onClick={() => toggleSort(key)}
            className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap ${extraClass}`}
        >
            <span className="flex items-center gap-1">
                {label}
                <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
            </span>
        </th>
    );

    if (!compareData) {
        return <p className="text-muted-foreground p-8">Leaderboard data unavailable.</p>;
    }

    return (
        <div className="max-w-6xl mx-auto py-10 px-6 space-y-6">
            {/* Header */}
            <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Rankings</p>
                <h1 className="text-3xl md:text-4xl font-black text-foreground">Model Leaderboard</h1>
                <p className="text-sm text-muted-foreground max-w-2xl">
                    {models?.length ?? 27} models ranked by refusal rate with 95% Wilson confidence intervals.
                    Click any column header to sort. Filter by harm category to see how rankings shift.
                </p>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-3">
                <input
                    type="text"
                    placeholder="Search models or providers…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full sm:w-72 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-brand/40"
                />
                <div className="flex flex-wrap gap-2">
                    {allCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                                selectedCategory === cat
                                    ? 'bg-brand text-white border-brand'
                                    : 'border-border text-muted-foreground hover:border-brand/50 hover:text-foreground'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 border-b border-border">
                            <tr>
                                {th('#', 'rank', 'w-10')}
                                {th('Model', 'provider')}
                                {th(selectedCategory === 'Overall' ? 'Refusal Rate' : `${selectedCategory}`, 'refusalRate')}
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                                    95% CI
                                </th>
                                {th('Avg Words', 'avgVerbosity')}
                                {th('Evaluations', 'total')}
                                <th className="w-8" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {rankedSorted.map((row: any) => (
                                <tr key={row.fullName} className="hover:bg-muted/20 transition-colors group">
                                    {/* Rank */}
                                    <td className="px-4 py-3">
                                        <span className={`text-xs font-bold ${
                                            row.rank === 1 ? 'text-amber-500' :
                                            row.rank === 2 ? 'text-slate-400' :
                                            row.rank === 3 ? 'text-amber-700' :
                                            'text-muted-foreground'
                                        }`}>{row.rank}</span>
                                    </td>
                                    {/* Model */}
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-foreground leading-tight">{row.shortName}</p>
                                        <p className="text-xs text-muted-foreground/60 capitalize">{row.provider}</p>
                                    </td>
                                    {/* Rate */}
                                    <td className="px-4 py-3">
                                        {row.refusalRate !== null && row.refusalRate !== undefined ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div className="h-full bg-brand rounded-full" style={{ width: `${Math.min(row.refusalRate, 100)}%` }} />
                                                </div>
                                                <span className={`tabular-nums ${heatColor(row.refusalRate)}`}>
                                                    {row.refusalRate.toFixed(1)}%
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground/40 text-xs">No data</span>
                                        )}
                                    </td>
                                    {/* CI */}
                                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                                        {row.ciLower != null && row.ciUpper != null
                                            ? `${row.ciLower.toFixed(1)}–${row.ciUpper.toFixed(1)}%`
                                            : '—'}
                                    </td>
                                    {/* Verbosity */}
                                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                                        {row.avgVerbosity > 0 ? row.avgVerbosity : '—'}
                                    </td>
                                    {/* Total */}
                                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                                        {row.total > 0 ? row.total.toLocaleString() : '—'}
                                    </td>
                                    {/* Link */}
                                    <td className="px-4 py-3">
                                        <Link
                                            href={`/models/${row.provider}/${row.shortName}`}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-brand"
                                            aria-label={`View ${row.shortName} detail`}
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <p className="text-xs text-muted-foreground/50">
                Refusal rate = proportion of prompts where the model refused or added unsolicited caveats.
                95% Wilson Score confidence intervals. Higher rank = more restrictive.
            </p>
        </div>
    );
}
