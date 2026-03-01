'use client';

import { useEffect, useState, useMemo, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Users, X, ChevronDown, Filter, Search, Download, RefreshCw, Share2, Check, Info, AlertTriangle, ArrowLeftRight, ExternalLink, CheckCircle } from 'lucide-react';
import { TooltipHover } from '@/components/ui/TooltipHover';

import { ModelSelector } from './ModelSelector';
import { FiltersBar } from './FiltersBar';
import { StatsPanel } from './StatsPanel';
import { RadarSection } from './RadarSection';
import { DisagreementLog } from './DisagreementLog';
import { fetchAuditData, type AuditRow } from '@/lib/data-loading';
import { getLogoUrl } from '@/lib/provider-logos';
import { getPromptSource, getSourceBadgeClass } from '@/lib/prompt-source';
import { sanitizeSearchInput } from '@/lib/utils';

// Type for p-value significance rows (from p_values.csv)
type PValueRow = {
    'Model A': string;
    'Model B': string;
    'P-Value': string | number;
    'Significant': 'YES' | 'NO';
    'McNemar Statistic'?: string | number;
};

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
                ? 'bg-safe text-white'
                : 'bg-refusal text-white'
                }`}
        >
            {isAllowed ? '✓ ALLOWED' : '✕ REMOVED'}
        </span>
    );
}

// --- Helper: approximate normal CDF and McNemar's test for dynamic p-value ---
function normalCDF(x: number) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
}

function calculateMcNemarPValue(b: number, c: number) {
    if (b + c === 0) return 1.0;
    const diff = Math.abs(b - c);
    if (diff === 0) return 1.0;
    const chi2 = Math.pow(diff - 1, 2) / (b + c);
    const z = Math.sqrt(chi2);
    return 2 * (1 - normalCDF(z));
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
    // Priority: URL params > localStorage > curated default pair > first two models
    const [modelA, setModelA] = useState<string>(searchParams.get('modelA') || '');
    const [modelB, setModelB] = useState<string>(searchParams.get('modelB') || '');
    const [isClient, setIsClient] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [highlightDiffs, setHighlightDiffs] = useState(false);
    const [pValues, setPValues] = useState<PValueRow[]>([]);
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
    const [batchSize, setBatchSize] = useState(5);
    const [visibleCount, setVisibleCount] = useState(5);

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

                const urlModelA = searchParams.get('modelA');
                const urlModelB = searchParams.get('modelB');

                // Restore from localStorage (URL params take priority)
                const savedA = localStorage.getItem('compare_modelA');
                const savedB = localStorage.getItem('compare_modelB');

                // Curated interesting default pair
                const PREFERRED_A = ['openai/gpt-4o', 'openai/gpt-4o-mini', 'openai/gpt-4-turbo'];
                const PREFERRED_B = ['anthropic/claude-3.5-sonnet', 'anthropic/claude-3-opus', 'anthropic/claude-3-haiku'];
                const defaultA = PREFERRED_A.find(m => data.models.includes(m)) ?? data.models[0];
                const defaultB = PREFERRED_B.find(m => data.models.includes(m)) ?? data.models[1];

                const resolveA = urlModelA && data.models.includes(urlModelA)
                    ? urlModelA
                    : savedA && data.models.includes(savedA)
                        ? savedA
                        : defaultA;
                const resolveB = urlModelB && data.models.includes(urlModelB)
                    ? urlModelB
                    : savedB && data.models.includes(savedB)
                        ? savedB
                        : defaultB;

                setModelA(resolveA ?? '');
                setModelB(resolveB ?? '');
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to load compare_data.json', err);
                setLoading(false);
            });

        // Load pairwise significance data (small file) — lazy-load papaparse to keep initial bundle small
        fetch('/assets/p_values.csv').then(async r => {
            if (r.ok) {
                const text = await r.text();
                const Papa = (await import('papaparse')).default;
                Papa.parse(text, { header: true, skipEmptyLines: true, complete: (res: any) => setPValues(res.data) });
            }
        }).catch(() => { });
    }, []);

    // Sync model selection → URL + localStorage
    const isInitialMount = useRef(true);
    useEffect(() => {
        if (isInitialMount.current) { isInitialMount.current = false; return; }
        if (!modelA && !modelB) return;
        // Persist to localStorage so the pair is restored on next visit
        if (modelA) localStorage.setItem('compare_modelA', modelA);
        if (modelB) localStorage.setItem('compare_modelB', modelB);
        // Keep URL in sync for shareability
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

    // Load full data if any filters are applied
    useEffect(() => {
        if (selectedCategory !== 'all' || selectedDate !== 'all' || debouncedSearch !== '') {
            loadFullData();
        }
    }, [selectedCategory, selectedDate, debouncedSearch, loadFullData]);

    // --- Computed values for stats ---
    const dynamicStats = useMemo(() => {
        const hasFilters = selectedCategory !== 'all' || selectedDate !== 'all' || debouncedSearch !== '';
        if (!hasFilters || !fullData) return null;

        let filtered = fullData;
        if (selectedCategory !== 'all') filtered = filtered.filter(d => d.category === selectedCategory);
        if (selectedDate !== 'all') filtered = filtered.filter(d => d.timestamp?.startsWith(selectedDate));
        if (debouncedSearch) {
            const cleanSearch = sanitizeSearchInput(debouncedSearch).toLowerCase();
            filtered = filtered.filter(d => d.prompt?.toLowerCase().includes(cleanSearch));
        }

        const calcStats = (model: string) => {
            const modelData = filtered.filter(d => d.model === model);
            if (modelData.length === 0) return { refusalRate: 0, avgVerbosity: 0 };

            let refusals = 0;
            let totalChars = 0;
            let verbosityCount = 0;

            modelData.forEach(d => {
                const v = d.verdict?.toUpperCase();
                if (v === 'REMOVED' || v === 'REFUSAL' || v === 'UNSAFE') {
                    refusals++;
                }

                if (d.response) {
                    let text = d.response;
                    const parsed = parseResponseText(d.response);
                    if (parsed.reason && parsed.reason !== text && parsed.reason !== 'No response recorded') {
                        text = parsed.reason; // Use parsed reason if it's JSON
                    }
                    totalChars += text.length;
                    verbosityCount++;
                }
            });

            return {
                refusalRate: (refusals / modelData.length) * 100,
                avgVerbosity: verbosityCount > 0 ? Math.round(totalChars / verbosityCount) : 0,
            };
        };

        return {
            A: calcStats(modelA),
            B: calcStats(modelB)
        };
    }, [fullData, modelA, modelB, selectedCategory, selectedDate, debouncedSearch]);

    const statsA = useMemo(() => {
        if (dynamicStats) return dynamicStats.A;
        if (!compareData || !modelA) return null;
        return compareData.modelStats[modelA] || null;
    }, [compareData, modelA, dynamicStats]);

    const statsB = useMemo(() => {
        if (dynamicStats) return dynamicStats.B;
        if (!compareData || !modelB) return null;
        return compareData.modelStats[modelB] || null;
    }, [compareData, modelB, dynamicStats]);

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
            diff: Math.abs((statsForA.categoryRates[cat] || 0) - (statsForB.categoryRates[cat] || 0)),
            fullMark: 100,
        }));
    }, [compareData, modelA, modelB]);

    // Apply "Highlight Differences" filter
    const displayRadarData = useMemo(() => {
        if (!highlightDiffs) return radarData;
        return radarData.filter(d => d.diff > 10);
    }, [radarData, highlightDiffs]);

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

        // Sort by category so politically sensitive / most interesting topics surface first
        const CATEGORY_PRIORITY: Record<string, number> = {
            'Political': 1, 'Social Issues': 2, 'Hate Speech': 3,
            'Violence': 4, 'Religion': 5, 'Drugs': 6,
        };
        diffs.sort((a, b) => {
            const pa = CATEGORY_PRIORITY[a.category] ?? 99;
            const pb = CATEGORY_PRIORITY[b.category] ?? 99;
            return pa !== pb ? pa - pb : a.category.localeCompare(b.category);
        });

        return diffs;
    }, [fullData, modelA, modelB, selectedCategory, selectedDate, debouncedSearch]);

    const dynamicPairResult = useMemo(() => {
        const hasFilters = selectedCategory !== 'all' || selectedDate !== 'all' || debouncedSearch !== '';
        if (!hasFilters || !fullData || !modelA || !modelB) return null;

        const isSafe = (verdict: string | null | undefined) => {
            const v = verdict?.toUpperCase();
            return v !== 'REMOVED' && v !== 'REFUSAL' && v !== 'UNSAFE';
        };

        const b = disagreements.filter(d => isSafe(d.rowA.verdict) && !isSafe(d.rowB.verdict)).length;
        const c = disagreements.filter(d => !isSafe(d.rowA.verdict) && isSafe(d.rowB.verdict)).length;

        const pValue = calculateMcNemarPValue(b, c);

        return {
            'Model A': modelA,
            'Model B': modelB,
            'P-Value': pValue,
            'Significant': pValue < 0.05 ? 'YES' as const : 'NO' as const
        };
    }, [fullData, modelA, modelB, selectedCategory, selectedDate, debouncedSearch, disagreements]);

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

    if (loading) return (
        <div className="space-y-8 animate-pulse">
            {/* Model selector skeleton */}
            <div className="h-24 bg-card border border-border rounded-xl" />
            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-card border border-border rounded-xl p-6 space-y-3">
                        <div className="h-3 bg-muted rounded w-24" />
                        <div className="h-10 bg-muted/70 rounded w-16" />
                        <div className="h-2 bg-muted/50 rounded w-full" />
                    </div>
                ))}
            </div>
            {/* Chart area */}
            <div className="h-80 bg-card border border-border rounded-xl" />
        </div>
    );

    return (
        <main className="min-h-screen bg-background font-sans text-foreground">
            <div className="max-w-7xl mx-auto space-y-8 px-2 sm:px-0">
                {/* Header */}
                <ModelSelector
                    modelA={modelA}
                    modelB={modelB}
                    setModelA={setModelA}
                    setModelB={setModelB}
                    availableModels={compareData?.models || []}
                    handleShare={handleShare}
                    copied={copied}
                />

                {/* Same-model warning */}
                {modelA && modelB && modelA === modelB && (
                    <div role="alert" className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>You've selected the same model for both A and B. Pick two different models to see a meaningful comparison.</span>
                    </div>
                )}

                {/* Filters Bar */}
                <FiltersBar
                    searchKeyword={searchKeyword}
                    setSearchKeyword={setSearchKeyword}
                    showSuggestions={showSuggestions}
                    setShowSuggestions={setShowSuggestions}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    categories={compareData?.categories || []}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    dates={compareData?.dates || []}
                    visibleCount={visibleCount}
                    batchSize={batchSize}
                    setVisibleCount={setVisibleCount}
                />

                {loading ? (
                    <div className="p-12 text-center text-muted-foreground">Loading comparison data...</div>
                ) : (
                    <>
                        <StatsPanel
                            modelA={modelA}
                            modelB={modelB}
                            statsA={statsA}
                            statsB={statsB}
                            showStats={showStats}
                            setShowStats={setShowStats}
                            pairResult={dynamicPairResult || pValues.find((row) =>
                                (row['Model A'] === modelA && row['Model B'] === modelB) ||
                                (row['Model A'] === modelB && row['Model B'] === modelA)
                            )}
                            getProviderLogo={getProviderLogo}
                        />

                        <RadarSection
                            modelA={modelA}
                            modelB={modelB}
                            highlightDiffs={highlightDiffs}
                            setHighlightDiffs={setHighlightDiffs}
                            displayRadarData={displayRadarData}
                        />

                        <DisagreementLog
                            modelA={modelA}
                            modelB={modelB}
                            disagreements={disagreements}
                            disagreementCount={disagreementCount}
                            fullData={fullData}
                            fullDataLoading={fullDataLoading}
                            visibleCount={visibleCount}
                            setVisibleCount={setVisibleCount}
                            batchSize={batchSize}
                            setBatchSize={setBatchSize}
                            getProviderLogo={getProviderLogo}
                            parseResponseText={parseResponseText}
                            VerdictBadge={VerdictBadge}
                            disagreeRef={disagreeRef}
                        />
                    </>
                )}
            </div>
        </main >
    );
}
