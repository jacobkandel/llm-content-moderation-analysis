'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { ChevronDown, CheckCircle, Search, Filter, Calendar, X } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Papa from 'papaparse';

import { fetchAuditData, type AuditRow } from '@/lib/data-loading';
import { getLogoUrl } from '@/lib/provider-logos';
import { getPromptSource, getSourceBadgeClass } from '@/lib/prompt-source';

// --- Types for precomputed data ---
type CompareModelStats = {
    refusalRate: number;
    avgVerbosity: number;
    total: number;
    categoryRates: Record<string, number>;
};

type CompareData = {
    models: string[];
    categories: string[];
    dates: string[];
    modelStats: Record<string, CompareModelStats>;
    pairwiseDisagreements: Record<string, number>;
};

const getProviderLogo = (model: string): string => getLogoUrl(model);

export default function ComparePage() {
    // --- Phase 1: Instant data (precomputed JSON, ~20KB) ---
    const [compareData, setCompareData] = useState<CompareData | null>(null);
    const [loading, setLoading] = useState(true);

    // --- Phase 2: Full CSV data (lazy, for disagreement text) ---
    const [fullData, setFullData] = useState<AuditRow[] | null>(null);
    const [fullDataLoading, setFullDataLoading] = useState(false);
    const fullDataTriggered = useRef(false);
    const disagreeRef = useRef<HTMLDivElement>(null);

    // --- UI state ---
    const [modelA, setModelA] = useState<string>('');
    const [modelB, setModelB] = useState<string>('');
    const [isClient, setIsClient] = useState(false);
    const [pValues, setPValues] = useState<any[]>([]);

    // Filters
    const [searchKeyword, setSearchKeyword] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedDate, setSelectedDate] = useState('all');

    // Debounce search input (300ms)
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchKeyword), 300);
        return () => clearTimeout(timer);
    }, [searchKeyword]);

    // --- Phase 1: Load precomputed JSON (instant) ---
    useEffect(() => {
        setIsClient(true);

        fetch('/compare_data.json')
            .then(r => r.json())
            .then((data: CompareData) => {
                setCompareData(data);
                if (data.models.length > 0) setModelA(data.models[0]);
                if (data.models.length > 1) setModelB(data.models[1]);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to load compare_data.json', err);
                setLoading(false);
            });

        // Load pairwise significance data (small file)
        fetch('/assets/p_values.csv').then(async r => {
            if (r.ok) {
                const text = await r.text();
                Papa.parse(text, { header: true, skipEmptyLines: true, complete: (res: any) => setPValues(res.data) });
            }
        }).catch(() => { });
    }, []);

    // --- Phase 2: Lazy-load full CSV when disagreement section is visible ---
    const loadFullData = useCallback(() => {
        if (fullDataTriggered.current) return;
        fullDataTriggered.current = true;
        setFullDataLoading(true);

        fetchAuditData(false, false).then(rows => {
            const cleanRows = (rows || []).filter(r => r.verdict !== 'ERROR');
            setFullData(cleanRows);
            setFullDataLoading(false);
        }).catch(err => {
            console.error('Failed to load full data', err);
            setFullDataLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!disagreeRef.current || !compareData) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    loadFullData();
                    observer.disconnect();
                }
            },
            { rootMargin: '200px' } // Start loading 200px before visible
        );
        observer.observe(disagreeRef.current);
        return () => observer.disconnect();
    }, [compareData, loadFullData]);

    // --- Computed values from precomputed data ---
    const statsA = useMemo(() => {
        if (!compareData || !modelA) return null;
        return compareData.modelStats[modelA] || null;
    }, [compareData, modelA]);

    const statsB = useMemo(() => {
        if (!compareData || !modelB) return null;
        return compareData.modelStats[modelB] || null;
    }, [compareData, modelB]);

    // Radar chart from precomputed per-category rates
    const radarData = useMemo(() => {
        if (!compareData || !modelA || !modelB) return [];
        const statsForA = compareData.modelStats[modelA];
        const statsForB = compareData.modelStats[modelB];
        if (!statsForA || !statsForB) return [];

        return compareData.categories.map(cat => ({
            subject: cat,
            A: statsForA.categoryRates[cat] || 0,
            B: statsForB.categoryRates[cat] || 0,
            fullMark: 100,
        }));
    }, [compareData, modelA, modelB]);

    // Disagreement count from precomputed pairwise data
    const disagreementCount = useMemo(() => {
        if (!compareData || !modelA || !modelB) return 0;
        const key1 = `${modelA}||${modelB}`;
        const key2 = `${modelB}||${modelA}`;
        return compareData.pairwiseDisagreements[key1] || compareData.pairwiseDisagreements[key2] || 0;
    }, [compareData, modelA, modelB]);

    // --- Disagreements from full data (Phase 2, only when loaded) ---
    const disagreements = useMemo(() => {
        if (!fullData || !modelA || !modelB) return [];

        const isSafe = (verdict: string) => {
            const v = verdict?.toUpperCase();
            return v !== 'REMOVED' && v !== 'REFUSAL' && v !== 'UNSAFE';
        };

        let filtered = fullData;
        if (selectedCategory !== 'all') filtered = filtered.filter(d => d.category === selectedCategory);
        if (selectedDate !== 'all') filtered = filtered.filter(d => d.timestamp?.startsWith(selectedDate));
        if (debouncedSearch) filtered = filtered.filter(d => d.prompt?.toLowerCase().includes(debouncedSearch.toLowerCase()));

        const mapA = new Map<string, AuditRow>();
        filtered.filter(d => d.model === modelA && d.prompt).forEach(d => mapA.set(d.prompt!, d));

        const diffs: { prompt: string; category: string; rowA: AuditRow; rowB: AuditRow }[] = [];
        filtered.filter(d => d.model === modelB && d.prompt).forEach(rowB => {
            const rowA = mapA.get(rowB.prompt!);
            if (rowA && isSafe(rowA.verdict) !== isSafe(rowB.verdict)) {
                diffs.push({ prompt: rowB.prompt!, category: rowB.category, rowA, rowB });
            }
        });

        return diffs;
    }, [fullData, modelA, modelB, selectedCategory, selectedDate, debouncedSearch]);

    const clearFilters = () => {
        setSearchKeyword('');
        setDebouncedSearch('');
        setSelectedCategory('all');
        setSelectedDate('all');
    };

    if (!isClient) return null;

    return (
        <main className="min-h-screen bg-background font-sans text-foreground">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <header className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
                        Model Comparison
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base mt-1">
                        Side-by-side analysis of model behavior, refusal rates, and disagreements.
                    </p>
                </header>

                {/* Filters Bar */}
                <div className="bg-card p-4 rounded-xl border border-border">
                    <div className="flex flex-wrap gap-4 items-end">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Search Prompts</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={searchKeyword}
                                    onChange={e => setSearchKeyword(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                                />
                            </div>
                        </div>

                        {/* Category */}
                        <div className="w-48">
                            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Category</label>
                            <div className="relative">
                                <Filter className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <select
                                    value={selectedCategory}
                                    onChange={e => setSelectedCategory(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm appearance-none focus:ring-2 focus:ring-primary text-foreground"
                                >
                                    <option value="all">All Categories</option>
                                    {(compareData?.categories || []).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Date */}
                        <div className="w-48">
                            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <select
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm appearance-none focus:ring-2 focus:ring-indigo-500 text-foreground"
                                >
                                    <option value="all">All Dates</option>
                                    {(compareData?.dates || []).slice().reverse().map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Clear */}
                        {(searchKeyword || selectedCategory !== 'all' || selectedDate !== 'all') && (
                            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg">
                                <X className="h-4 w-4" /> Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Model Selectors */}
                <div className="flex flex-col md:flex-row items-center gap-4 bg-card p-4 rounded-xl border border-border">
                    <div className="w-full md:w-1/2">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Model A</label>
                        <div className="relative">
                            <select
                                value={modelA}
                                onChange={(e) => setModelA(e.target.value)}
                                className="w-full appearance-none bg-background border border-border text-foreground rounded-lg p-3 pr-8 focus:ring-2 focus:ring-primary font-medium"
                            >
                                {(compareData?.models || []).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>

                    <div className="hidden md:flex items-center justify-center p-2 rounded-full bg-muted mt-6">
                        <span className="text-xs font-bold text-muted-foreground">VS</span>
                    </div>

                    <div className="w-full md:w-1/2">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Model B</label>
                        <div className="relative">
                            <select
                                value={modelB}
                                onChange={(e) => setModelB(e.target.value)}
                                className="w-full appearance-none bg-background border border-border text-foreground rounded-lg p-3 pr-8 focus:ring-2 focus:ring-primary font-medium"
                            >
                                {(compareData?.models || []).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-muted-foreground">Loading comparison data...</div>
                ) : (
                    <>
                        {/* Pairwise Significance for Selected Pair */}
                        {(() => {
                            const pairResult = pValues.find((row: any) =>
                                (row['Model A'] === modelA && row['Model B'] === modelB) ||
                                (row['Model A'] === modelB && row['Model B'] === modelA)
                            );
                            return (
                                <div className="bg-card rounded-xl border border-border p-5">
                                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                        📊 Statistical Significance
                                    </h3>
                                    {pairResult ? (
                                        <div className="flex items-center gap-6">
                                            <div>
                                                <span className="text-xs text-muted-foreground">P-Value</span>
                                                <div className="text-2xl font-black font-mono text-foreground">
                                                    {parseFloat(pairResult['P-Value']).toExponential(2)}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-xs text-muted-foreground">Result</span>
                                                <div className="mt-1">
                                                    {pairResult['Significant'] === 'YES'
                                                        ? <span className="text-sm bg-[#275D38]/10 text-[#275D38] dark:text-[#9CAF88] px-3 py-1.5 rounded-full font-bold">✓ Statistically Significant</span>
                                                        : <span className="text-sm bg-muted text-muted-foreground px-3 py-1.5 rounded-full">Not Significant</span>
                                                    }
                                                </div>
                                            </div>
                                            <div className="ml-auto text-xs text-muted-foreground max-w-xs">
                                                McNemar&#39;s test: P &lt; 0.05 means the difference in refusal behavior is real, not random chance.
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No significance data for this pair. Run the audit pipeline to generate p-values.</p>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Comparison Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Card A */}
                            <div className="bg-card rounded-xl border border-border p-6 border-t border-t-primary relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <img src={getProviderLogo(modelA)} alt="" className="h-32 w-32 object-contain" />
                                </div>
                                <div className="flex items-center gap-3 mb-4">
                                    <img
                                        src={getProviderLogo(modelA)}
                                        alt=""
                                        className="h-10 w-10 rounded-lg object-contain bg-card border border-border"
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                    <h2 className="text-xl font-bold truncate pr-8 text-foreground">{modelA}</h2>
                                </div>
                                {statsA && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-muted/50 p-4 rounded-lg">
                                            <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Refusal Rate</div>
                                            <div className={`text-2xl font-bold ${statsA.refusalRate > 50 ? 'text-[#A4343A]' : 'text-[#275D38]'}`}>
                                                {statsA.refusalRate.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="bg-muted/50 p-4 rounded-lg">
                                            <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Avg Verbosity</div>
                                            <div className="text-2xl font-bold text-foreground">
                                                {statsA.avgVerbosity} <span className="text-sm font-normal text-muted-foreground">chars</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Card B */}
                            <div className="bg-card rounded-xl border border-border p-6 border-t border-t-[#275D38] relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <img src={getProviderLogo(modelB)} alt="" className="h-32 w-32 object-contain" />
                                </div>
                                <div className="flex items-center gap-3 mb-4">
                                    <img
                                        src={getProviderLogo(modelB)}
                                        alt=""
                                        className="h-10 w-10 rounded-lg object-contain bg-card border border-border"
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                    <h2 className="text-xl font-bold truncate pr-8 text-foreground">{modelB}</h2>
                                </div>
                                {statsB && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-muted/50 p-4 rounded-lg">
                                            <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Refusal Rate</div>
                                            <div className={`text-2xl font-bold ${statsB.refusalRate > 50 ? 'text-[#A4343A]' : 'text-[#275D38]'}`}>
                                                {statsB.refusalRate.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="bg-muted/50 p-4 rounded-lg">
                                            <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Avg Verbosity</div>
                                            <div className="text-2xl font-bold text-foreground">
                                                {statsB.avgVerbosity} <span className="text-sm font-normal text-muted-foreground">chars</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Radar Chart */}
                        <div className="bg-card rounded-xl border border-border p-6">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-foreground">
                                Side-by-Side Censorship Profile
                            </h3>
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                        <PolarGrid stroke="hsl(var(--border))" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                        <Radar
                                            name={modelA}
                                            dataKey="A"
                                            stroke="#800000"
                                            strokeWidth={2}
                                            fill="#800000"
                                            fillOpacity={0.3}
                                        />
                                        <Radar
                                            name={modelB}
                                            dataKey="B"
                                            stroke="#275D38"
                                            strokeWidth={2}
                                            fill="#275D38"
                                            fillOpacity={0.3}
                                        />
                                        <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '8px',
                                                border: '1px solid hsl(var(--border))',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                                backgroundColor: 'hsl(var(--popover))',
                                                color: 'hsl(var(--popover-foreground))'
                                            }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Disagreement Analysis */}
                        <div className="space-y-4" ref={disagreeRef}>
                            <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                                Disagreement Analysis ({fullData ? disagreements.length : disagreementCount})
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Showing instances where one model refused while the other allowed (and vice versa).
                            </p>

                            {!fullData ? (
                                /* Skeleton placeholders while full data loads */
                                <div className="grid gap-4">
                                    {fullDataLoading ? (
                                        Array.from({ length: Math.min(3, disagreementCount) }).map((_, idx) => (
                                            <div key={idx} className="bg-card rounded-lg border border-border overflow-hidden animate-pulse">
                                                <div className="bg-muted/30 p-3 border-b border-border">
                                                    <div className="h-3 w-24 bg-muted rounded" />
                                                </div>
                                                <div className="p-4 space-y-4">
                                                    <div className="space-y-2">
                                                        <div className="h-3 w-16 bg-muted rounded" />
                                                        <div className="h-16 bg-muted/50 rounded" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="h-24 bg-muted/30 rounded-lg" />
                                                        <div className="h-24 bg-muted/30 rounded-lg" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-muted-foreground py-8 bg-card rounded-lg border border-dashed border-border">
                                            <p className="text-sm">Scroll down to load detailed disagreement data ({disagreementCount} disagreements).</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {disagreements.slice(0, 50).map((diff, idx) => (
                                        <div key={idx} className="bg-card rounded-lg border border-border overflow-hidden hover:bg-accent/50 transition-colors">
                                            <div className="bg-muted/30 p-3 border-b border-border flex justify-between items-center">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                                                        {diff.category}
                                                    </span>
                                                    {(() => {
                                                        const source = getPromptSource(diff.rowA?.prompt_id || diff.rowB?.prompt_id);
                                                        return (
                                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getSourceBadgeClass(source)}`}>
                                                                {source}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                            <div className="p-4 space-y-4">
                                                {/* Prompt */}
                                                <div>
                                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Prompt</p>
                                                    <div className="text-sm text-foreground font-mono bg-muted/50 p-3 rounded border border-border max-h-32 overflow-y-auto">
                                                        {diff.prompt || <div className="h-4 w-3/4 bg-muted/50 rounded animate-pulse" />}
                                                    </div>
                                                </div>

                                                {/* Side-by-Side Responses */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Model A Response */}
                                                    <div className={`rounded-lg border ${diff.rowA.verdict === 'safe' || diff.rowA.verdict === 'ALLOWED' ? 'border-[#275D38]/30 bg-[#275D38]/5' : 'border-[#A4343A]/30 bg-[#A4343A]/5'}`}>
                                                        <div className={`px-3 py-2 flex justify-between items-center border-b ${diff.rowA.verdict === 'safe' || diff.rowA.verdict === 'ALLOWED' ? 'border-[#275D38]/30 bg-[#275D38]/10' : 'border-[#A4343A]/30 bg-[#A4343A]/10'}`}>
                                                            <div className="flex items-center gap-2">
                                                                <img
                                                                    src={getProviderLogo(modelA)}
                                                                    alt=""
                                                                    className="h-5 w-5 rounded object-contain"
                                                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                />
                                                                <span className="font-bold text-sm text-foreground">{modelA?.split('/')[1] || modelA}</span>
                                                            </div>
                                                            <span className={`text-xs font-bold px-2 py-1 rounded ${diff.rowA.verdict === 'safe' || diff.rowA.verdict === 'ALLOWED' ? 'bg-[#275D38] text-white' : 'bg-[#A4343A] text-white'}`}>
                                                                {diff.rowA.verdict === 'safe' || diff.rowA.verdict === 'ALLOWED' ? 'ALLOWED' : 'REMOVED'}
                                                            </span>
                                                        </div>
                                                        <p className="p-3 text-sm text-foreground max-h-36 overflow-y-auto">
                                                            {diff.rowA.response || 'No response recorded'}
                                                        </p>
                                                    </div>

                                                    {/* Model B Response */}
                                                    <div className={`rounded-lg border ${diff.rowB.verdict === 'safe' || diff.rowB.verdict === 'ALLOWED' ? 'border-[#275D38]/30 bg-[#275D38]/5' : 'border-[#A4343A]/30 bg-[#A4343A]/5'}`}>
                                                        <div className={`px-3 py-2 flex justify-between items-center border-b ${diff.rowB.verdict === 'safe' || diff.rowB.verdict === 'ALLOWED' ? 'border-[#275D38]/30 bg-[#275D38]/10' : 'border-[#A4343A]/30 bg-[#A4343A]/10'}`}>
                                                            <div className="flex items-center gap-2">
                                                                <img
                                                                    src={getProviderLogo(modelB)}
                                                                    alt=""
                                                                    className="h-5 w-5 rounded object-contain"
                                                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                />
                                                                <span className="font-bold text-sm text-foreground">{modelB?.split('/')[1] || modelB}</span>
                                                            </div>
                                                            <span className={`text-xs font-bold px-2 py-1 rounded ${diff.rowB.verdict === 'safe' || diff.rowB.verdict === 'ALLOWED' ? 'bg-[#275D38] text-white' : 'bg-[#A4343A] text-white'}`}>
                                                                {diff.rowB.verdict === 'safe' || diff.rowB.verdict === 'ALLOWED' ? 'ALLOWED' : 'REMOVED'}
                                                            </span>
                                                        </div>
                                                        <p className="p-3 text-sm text-foreground max-h-36 overflow-y-auto">
                                                            {diff.rowB.response || 'No response recorded'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {disagreements.length > 50 && (
                                        <div className="text-center text-muted-foreground text-sm py-4">
                                            ...and {disagreements.length - 50} more
                                        </div>
                                    )}
                                    {disagreements.length === 0 && (
                                        <div className="text-center text-muted-foreground py-8 bg-card rounded-lg border border-dashed border-border">
                                            <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            No disagreements found between selected models.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </main >
    );
}
