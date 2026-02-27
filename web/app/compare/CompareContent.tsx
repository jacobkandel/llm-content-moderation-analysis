'use client';

import { useEffect, useState, useMemo, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Users, X, ChevronDown, Filter, Search, Download, RefreshCw, Share2, Check, Info, AlertTriangle, ArrowLeftRight, ExternalLink, CheckCircle } from 'lucide-react';

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Papa from 'papaparse';

import { fetchAuditData, type AuditRow } from '@/lib/data-loading';
import { getLogoUrl } from '@/lib/provider-logos';
import { getPromptSource, getSourceBadgeClass } from '@/lib/prompt-source';
import { sanitizeSearchInput } from '@/lib/utils';

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

// --- Helper: safely parse response text that may contain JSON ---
type ParsedResponse = { verdict: string | null; reason: string };
function parseResponseText(raw: string | null | undefined): ParsedResponse {
    if (!raw) return { verdict: null, reason: 'No response recorded' };
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
        try {
            const parsed = JSON.parse(trimmed);
            const verdict = (parsed.verdict ?? parsed.Verdict ?? parsed.decision ?? null) as string | null;
            const reason = (parsed.reason ?? parsed.Reason ?? parsed.explanation ?? parsed.message ?? '') as string;
            return { verdict, reason: reason || trimmed };
        } catch {
            // not valid JSON, fall through
        }
    }
    return { verdict: null, reason: trimmed };
}

function VerdictBadge({ verdict }: { verdict: string | null | undefined }) {
    if (!verdict) return null;
    const v = verdict.toUpperCase();
    const isAllowed = v === 'ALLOWED' || v === 'SAFE';
    return (
        <span
            className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${isAllowed
                ? 'bg-[#275D38] text-white'
                : 'bg-[#A4343A] text-white'
                }`}
        >
            {isAllowed ? '✓ ALLOWED' : '✕ REMOVED'}
        </span>
    );
}

export default function CompareContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // --- Phase 1: Instant data (precomputed JSON, ~20KB) ---
    const [compareData, setCompareData] = useState<CompareData | null>(null);
    const [loading, setLoading] = useState(true);

    // --- Phase 2: Full CSV data (lazy, for disagreement text) ---
    const [fullData, setFullData] = useState<AuditRow[] | null>(null);
    const [fullDataLoading, setFullDataLoading] = useState(false);
    const fullDataTriggered = useRef(false);
    const disagreeRef = useRef<HTMLDivElement>(null);

    // --- UI state ---
    const [modelA, setModelA] = useState<string>(searchParams.get('modelA') || '');
    const [modelB, setModelB] = useState<string>(searchParams.get('modelB') || '');
    const [isClient, setIsClient] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [pValues, setPValues] = useState<any[]>([]);
    const [copied, setCopied] = useState(false);

    const handleShare = useCallback(() => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, []);

    // Filters
    const [searchKeyword, setSearchKeyword] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedDate, setSelectedDate] = useState('all');

    // Pagination
    const [batchSize, setBatchSize] = useState(10);
    const [visibleCount, setVisibleCount] = useState(10);

    // Debounce search input (300ms)
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchKeyword), 300);
        return () => clearTimeout(timer);
    }, [searchKeyword]);

    // --- Phase 1: Load precomputed JSON (instant) ---
    useEffect(() => {
        setIsClient(true);

        const urlModelA = searchParams.get('modelA');
        const urlModelB = searchParams.get('modelB');

        fetch('/compare_data.json')
            .then(r => r.json())
            .then((data: CompareData) => {
                setCompareData(data);
                // Prefer URL params, fall back to first two models
                if (urlModelA && data.models.includes(urlModelA)) {
                    setModelA(urlModelA);
                } else if (data.models.length > 0) {
                    setModelA(data.models[0]);
                }
                if (urlModelB && data.models.includes(urlModelB)) {
                    setModelB(urlModelB);
                } else if (data.models.length > 1) {
                    setModelB(data.models[1]);
                }
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

    // Sync model selection → URL (skip initial mount to avoid replacing on load)
    const isInitialMount = useRef(true);
    useEffect(() => {
        if (isInitialMount.current) { isInitialMount.current = false; return; }
        if (!modelA && !modelB) return;
        const params = new URLSearchParams();
        if (modelA) params.set('modelA', modelA);
        if (modelB) params.set('modelB', modelB);
        router.replace(`?${params.toString()}`, { scroll: false });
    }, [modelA, modelB]);

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
        if (debouncedSearch) {
            const cleanSearch = sanitizeSearchInput(debouncedSearch).toLowerCase();
            filtered = filtered.filter(d => d.prompt?.toLowerCase().includes(cleanSearch));
        }

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
        setVisibleCount(batchSize);
    };

    // Reset visible count when model pair or filters change
    useEffect(() => {
        setVisibleCount(batchSize);
    }, [modelA, modelB, selectedCategory, selectedDate, debouncedSearch, batchSize]);

    if (!isClient) return null;

    return (
        <main className="min-h-screen bg-background font-sans text-foreground">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
                            Model Comparison
                        </h1>
                        <p className="text-muted-foreground text-sm md:text-base mt-1">
                            Side-by-side analysis of model behavior, refusal rates, and disagreements.
                        </p>
                    </div>
                    <button
                        onClick={handleShare}
                        title="Copy shareable link"
                        className="inline-flex items-center gap-2 text-sm font-medium border border-border rounded-lg px-3 py-2 hover:bg-muted/40 transition-all text-muted-foreground hover:text-foreground flex-shrink-0"
                        aria-label={copied ? 'Link copied!' : 'Copy comparison link to clipboard'}
                    >
                        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4" />}
                        {copied ? 'Copied!' : 'Share'}
                    </button>
                </header>

                {/* Model Selectors (Moved up for correct Tab order) */}
                <div className="flex flex-col md:flex-row items-center gap-4 bg-card p-4 rounded-xl border border-border">
                    <div className="w-full md:w-1/2 relative">
                        <label htmlFor="model-a-select" className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Model A</label>
                        <select
                            id="model-a-select"
                            value={modelA}
                            onChange={(e) => setModelA(e.target.value)}
                            className="w-full relative z-10 appearance-none bg-background border border-border text-foreground rounded-lg p-3 pr-8 focus:ring-2 focus:ring-[#800000] font-medium"
                        >
                            {(compareData?.models || []).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-9 h-4 w-4 text-muted-foreground pointer-events-none z-20" />
                    </div>

                    <button
                        onClick={() => {
                            const temp = modelA;
                            setModelA(modelB);
                            setModelB(temp);
                        }}
                        aria-label="Swap models"
                        title="Swap Model A and Model B"
                        className="hidden md:flex items-center justify-center p-3 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mt-5 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <ArrowLeftRight className="h-4 w-4" />
                    </button>

                    <div className="w-full md:w-1/2 relative">
                        <label htmlFor="model-b-select" className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Model B</label>
                        <select
                            id="model-b-select"
                            value={modelB}
                            onChange={(e) => setModelB(e.target.value)}
                            className="w-full relative z-10 appearance-none bg-background border border-border text-foreground rounded-lg p-3 pr-8 focus:ring-2 focus:ring-[#800000] font-medium"
                        >
                            {(compareData?.models || []).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-9 h-4 w-4 text-muted-foreground pointer-events-none z-20" />
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="bg-card p-4 rounded-xl border border-border">
                    <div className="flex flex-wrap gap-4 items-end">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <label htmlFor="search-prompts" className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Search Prompts</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                                <input
                                    id="search-prompts"
                                    type="text"
                                    value={searchKeyword}
                                    onChange={e => setSearchKeyword(e.target.value)}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                    placeholder="Search prompts…"
                                    className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                                />
                                {showSuggestions && !searchKeyword && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 pt-2.5 pb-1.5">
                                            Try one of these
                                        </p>
                                        {[
                                            'Should abortion be legal?',
                                            'How do I legally own a gun?',
                                            'What are the arguments for drug legalization?',
                                            'Is capital punishment ever justified?',
                                            'How does racial profiling work in policing?',
                                            'What is the evidence for and against climate change?',
                                        ].map(suggestion => (
                                            <button
                                                key={suggestion}
                                                onMouseDown={() => {
                                                    setSearchKeyword(suggestion);
                                                    setShowSuggestions(false);
                                                }}
                                                className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-2"
                                            >
                                                <Search className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Category */}
                        <div className="w-48">
                            <label htmlFor="filter-category" className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Category</label>
                            <div className="relative">
                                <Filter className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <select
                                    id="filter-category"
                                    value={selectedCategory}
                                    onChange={e => setSelectedCategory(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm appearance-none focus:ring-2 focus:ring-primary text-foreground relative z-10"
                                >
                                    <option value="all">All Categories</option>
                                    {(compareData?.categories || []).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Date */}
                        <div className="w-48">
                            <label htmlFor="filter-date" className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <select
                                    id="filter-date"
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm appearance-none focus:ring-2 focus:ring-[#800000] text-foreground relative z-10"
                                >
                                    <option value="all">All Dates</option>
                                    {(compareData?.dates || []).slice().reverse().map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Clear */}
                        {(searchKeyword || selectedCategory !== 'all' || selectedDate !== 'all') && (
                            <button aria-label="Clear Compare Filters" onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg">
                                <X className="h-4 w-4" /> Clear
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-muted-foreground">Loading comparison data...</div>
                ) : (
                    <>
                        {/* Advanced Stats (collapsed by default) */}
                        {(() => {
                            const pairResult = pValues.find((row: any) =>
                                (row['Model A'] === modelA && row['Model B'] === modelB) ||
                                (row['Model A'] === modelB && row['Model B'] === modelA)
                            );
                            return (
                                <div className="bg-card rounded-xl border border-border overflow-hidden">
                                    {/* Toggle header */}
                                    <button
                                        onClick={() => setShowStats(s => !s)}
                                        className="w-full flex items-center justify-between px-5 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                                        aria-expanded={showStats}
                                    >
                                        <span className="flex items-center gap-2 font-medium">
                                            <Info className="h-4 w-4" />
                                            Advanced Stats
                                            {pairResult && (
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pairResult['Significant'] === 'YES'
                                                    ? 'bg-[#275D38]/10 text-[#275D38]'
                                                    : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {pairResult['Significant'] === 'YES' ? 'Significant' : 'Not Significant'}
                                                </span>
                                            )}
                                        </span>
                                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showStats ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Expanded content */}
                                    {showStats && (
                                        <div className="px-5 pb-5 pt-1 border-t border-border">
                                            {pairResult ? (
                                                <div className="flex flex-wrap items-start gap-8 mt-3">
                                                    <div>
                                                        <span className="text-xs text-muted-foreground uppercase tracking-wider">P-Value (McNemar's)</span>
                                                        <div className="text-2xl font-black font-mono text-foreground mt-1">
                                                            {parseFloat(pairResult['P-Value']).toExponential(2)}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Result</span>
                                                        <div className="mt-2">
                                                            {pairResult['Significant'] === 'YES'
                                                                ? <span className="text-sm bg-[#275D38]/10 text-[#275D38] dark:text-[#9CAF88] px-3 py-1.5 rounded-full font-bold">✓ Statistically Significant</span>
                                                                : <span className="text-sm bg-muted text-muted-foreground px-3 py-1.5 rounded-full">Not Significant</span>
                                                            }
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground max-w-xs mt-3 self-end">
                                                        P&nbsp;&lt;&nbsp;0.05 means the difference in refusal behavior is statistically real, not random chance.
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground mt-3">No significance data available for this model pair.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Comparison Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Card A */}
                            <div className="bg-card rounded-xl border border-border p-6 border-t border-t-[#800000] relative overflow-hidden">
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
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-xl font-bold truncate text-foreground">{modelA}</h2>
                                        <Link href={`/models/${modelA}`} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 mt-0.5">
                                            View profile <ExternalLink className="h-3 w-3" />
                                        </Link>
                                    </div>
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
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-xl font-bold truncate text-foreground">{modelB}</h2>
                                        <Link href={`/models/${modelB}`} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 mt-0.5">
                                            View profile <ExternalLink className="h-3 w-3" />
                                        </Link>
                                    </div>
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
                            <div
                                className="h-[400px] w-full"
                                role="img"
                                aria-label={`Radar chart comparing ${modelA} and ${modelB} across ${radarData.length} content categories. ${radarData.map(d => `${d.subject}: ${modelA.split('/').pop()} ${d.A.toFixed(0)}% vs ${modelB.split('/').pop()} ${d.B.toFixed(0)}%`).join('. ')}`}
                            >
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
                                    {/* Batch size + results count */}
                                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                                        <span>
                                            Showing {Math.min(visibleCount, disagreements.length)} of {disagreements.length} disagreements
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider">Per page:</label>
                                            <select
                                                value={batchSize}
                                                onChange={e => {
                                                    const v = Number(e.target.value);
                                                    setBatchSize(v);
                                                    setVisibleCount(v);
                                                }}
                                                className="text-xs bg-background border border-border rounded px-2 py-1 text-foreground focus:ring-2 focus:ring-primary"
                                            >
                                                <option value={10}>10</option>
                                                <option value={20}>20</option>
                                                <option value={50}>50</option>
                                                <option value={100}>100</option>
                                            </select>
                                        </div>
                                    </div>

                                    {disagreements.slice(0, visibleCount).map((diff, idx) => (
                                        <div key={idx} className="bg-card rounded-lg border border-border overflow-hidden hover:bg-muted/40 transition-colors">
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
                                                        <div className="p-3 space-y-2">
                                                            {(() => { const p = parseResponseText(diff.rowA.response); return (<><VerdictBadge verdict={p.verdict} /><p className="text-sm text-foreground leading-relaxed max-h-36 overflow-y-auto">{p.reason}</p></>); })()}
                                                        </div>
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
                                                        <div className="p-3 space-y-2">
                                                            {(() => { const p = parseResponseText(diff.rowB.response); return (<><VerdictBadge verdict={p.verdict} /><p className="text-sm text-foreground leading-relaxed max-h-36 overflow-y-auto">{p.reason}</p></>); })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {visibleCount < disagreements.length && (
                                        <div className="flex flex-col items-center gap-2 pt-2 pb-4">
                                            <button
                                                onClick={() => setVisibleCount(v => v + batchSize)}
                                                className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
                                            >
                                                Load {Math.min(batchSize, disagreements.length - visibleCount)} more
                                            </button>
                                            <span className="text-xs text-muted-foreground">
                                                {disagreements.length - visibleCount} remaining
                                            </span>
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
