'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchAuditData, type AuditRow } from '@/lib/data-loading';
import { calculateFleissKappa } from '@/lib/statistics';
import Papa from 'papaparse';

// --- Types ---
export type Cluster = {
    cluster_id: number;
    size: number;
    keywords: string[];
    exemplar: string;
    models: Record<string, number>;
};

interface AnalysisContextType {
    auditData: AuditRow[];
    clusters: Cluster[];
    driftData: any[];
    consensusData: any[];
    pValues: any[];
    politicalData: any[];
    paternalismData: any[];
    triggerData: any[];
    reportContent: string;
    loading: boolean;
    dateRange: { start: string; end: string };
    setDateRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
    selectedModels: string[];
    setSelectedModels: React.Dispatch<React.SetStateAction<string[]>>;
    allModels: string[];
    filteredAuditData: AuditRow[];
    filteredPoliticalData: any[];
    filteredPaternalismData: any[];
    filteredDriftData: any[];
    filteredConsensusData: any[];
    filteredPValues: any[];
    filteredClusters: Cluster[];
    timelineDates: string[];
    stats: any;
    efficiencyData: any[];
    precomputedPrompts: { id: string; text: string; category: string; source: string }[];
    precomputedHeatmap: any;
    precomputedConsensus: any;
    precomputedSignificance: any[];
    precomputedReliability: any;
    precomputedLongitudinal: any;
    isLite: boolean;
    isLoadingFull: boolean;
    loadFullDetails: () => Promise<void>;
    // Lazy-load functions for supplementary data
    ensureClusters: () => Promise<void>;
    ensureDrift: () => Promise<void>;
    ensureConsensus: () => Promise<void>;
    ensurePValues: () => Promise<void>;
    ensurePolitical: () => Promise<void>;
    ensurePaternalism: () => Promise<void>;
    ensureTriggers: () => Promise<void>;
    ensureReport: () => Promise<void>;
    ensureAuditData: () => Promise<void>;
    ensureSignificance: () => Promise<void>;
    ensurePrompts: () => Promise<void>;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

// Helper: filter any array with a model field by selectedModels
function filterByModels<T extends { model?: string }>(data: T[], selectedModels: string[]): T[] {
    if (selectedModels.length === 0) return data;
    return data.filter(d => {
        if (!d.model) return true; // Keep items without a model field
        return selectedModels.some(m => d.model!.includes(m) || m.includes(d.model!));
    });
}

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Data Loading
    const [auditData, setAuditData] = useState<AuditRow[]>([]);
    const [isLite, setIsLite] = useState(true);
    const [isLoadingFull, setIsLoadingFull] = useState(false);

    const [clusters, setClusters] = useState<Cluster[]>([]);
    const [driftData, setDriftData] = useState<any[]>([]);
    const [consensusData, setConsensusData] = useState<any[]>([]);
    const [pValues, setPValues] = useState<any[]>([]);
    const [politicalData, setPoliticalData] = useState<any[]>([]);
    const [paternalismData, setPaternalismData] = useState<any[]>([]);
    const [triggerData, setTriggerData] = useState<any[]>([]);
    const [reportContent, setReportContent] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // Pre-computed JSON data (loaded instantly)
    const [precomputedSummary, setPrecomputedSummary] = useState<any>(null);
    const [precomputedSpectrum, setPrecomputedSpectrum] = useState<any[]>([]);
    const [precomputedHeatmap, setPrecomputedHeatmap] = useState<any>(null);
    const [precomputedConsensus, setPrecomputedConsensus] = useState<any>(null);
    const [precomputedSignificance, setPrecomputedSignificance] = useState<any[]>([]);
    const [precomputedReliability, setPrecomputedReliability] = useState<any>(null);
    const [precomputedLongitudinal, setPrecomputedLongitudinal] = useState<any>(null);
    const [precomputedPrompts, setPrecomputedPrompts] = useState<{ id: string; text: string; category: string; source: string }[]>([]);

    // Global Filters – initialised from URL
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => ({
        start: searchParams.get('from') || '',
        end: searchParams.get('to') || '',
    }));
    const [selectedModels, setSelectedModels] = useState<string[]>(() => {
        const param = searchParams.get('models');
        return param ? param.split(',').filter(Boolean) : [];
    });

    // Sync filter state → URL (skip the very first render to avoid replacing on mount)
    const isInitialMount = useRef(true);
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        const params = new URLSearchParams();
        if (selectedModels.length > 0) params.set('models', selectedModels.join(','));
        if (dateRange.start) params.set('from', dateRange.start);
        if (dateRange.end) params.set('to', dateRange.end);
        const qs = params.toString();
        router.replace(qs ? `?${qs}` : '?', { scroll: false });
    }, [selectedModels, dateRange, router]);

    // Action to load full data (text columns)
    const loadFullDetails = async () => {
        if (!isLite || isLoadingFull) return; // Already full or loading

        console.log("🚀 Triggering FULL data load...");
        setIsLoadingFull(true);
        try {
            const fullData = await fetchAuditData(false, false); // lite=false
            setAuditData(fullData);
            setIsLite(false);
            console.log("✅ FULL data loaded (replaced lite data)");
        } catch (e) {
            console.error("Failed to load full data", e);
        } finally {
            setIsLoadingFull(false);
        }
    };

    // --- Lazy-load helpers: fetch supplementary data on-demand (once) ---
    const loaded = useRef<Record<string, boolean>>({});

    const ensureClusters = async () => {
        if (loaded.current.clusters) return;
        loaded.current.clusters = true;
        try {
            const r = await fetch('/clusters.json');
            if (r.ok) setClusters(await r.json());
        } catch { }
    };
    const ensureDrift = async () => {
        if (loaded.current.drift) return;
        loaded.current.drift = true;
        try {
            const r = await fetch('/drift_report.json');
            if (r.ok) setDriftData(await r.json());
        } catch { }
    };
    const ensureConsensus = async () => {
        if (loaded.current.consensus) return;
        loaded.current.consensus = true;
        try {
            const r = await fetch('/consensus_bias.csv');
            if (r.ok) {
                const text = await r.text();
                Papa.parse(text, { header: true, skipEmptyLines: true, complete: (res: any) => setConsensusData(res.data) });
            }
        } catch { }
    };
    const ensurePValues = async () => {
        if (loaded.current.pValues) return;
        loaded.current.pValues = true;
        try {
            const r = await fetch('/assets/p_values.csv');
            if (r.ok) {
                const text = await r.text();
                Papa.parse(text, { header: true, skipEmptyLines: true, complete: (res: any) => setPValues(res.data) });
            }
        } catch { }
    };
    const ensurePolitical = async () => {
        if (loaded.current.political) return;
        loaded.current.political = true;
        try {
            const r = await fetch('/political_compass.json');
            if (r.ok) setPoliticalData(await r.json());
        } catch { }
    };
    const ensurePaternalism = async () => {
        if (loaded.current.paternalism) return;
        loaded.current.paternalism = true;
        try {
            const r = await fetch('/paternalism.json');
            if (r.ok) setPaternalismData(await r.json());
        } catch { }
    };
    const ensureTriggers = async () => {
        if (loaded.current.triggers) return;
        loaded.current.triggers = true;
        try {
            const r = await fetch('/assets/trigger_words.json');
            if (r.ok) setTriggerData(await r.json());
        } catch { }
    };
    const ensureReport = async () => {
        if (loaded.current.report) return;
        loaded.current.report = true;
        try {
            const r = await fetch('/api/report');
            if (r.ok) {
                const j = await r.json();
                if (j.content) setReportContent(j.content);
            }
        } catch { }
    };

    const ensureSignificance = async () => {
        if (loaded.current.significance) return;
        loaded.current.significance = true;
        try {
            const r = await fetch('/significance_pairwise.json');
            if (r.ok) setPrecomputedSignificance(await r.json());
        } catch { }
    };

    const ensurePrompts = async () => {
        if (loaded.current.prompts) return;
        loaded.current.prompts = true;
        try {
            const r = await fetch('/prompts_list.json.gz');
            if (r.ok) {
                const data = await r.json();
                if (data?.length) setPrecomputedPrompts(data);
            }
        } catch { }
    };

    // Load the lite CSV (for filtering & drill-downs)
    const ensureAuditData = async () => {
        if (loaded.current.csv) return;
        loaded.current.csv = true;
        console.log('📦 Loading lite CSV...');
        try {
            const data = await fetchAuditData(false, true);
            setAuditData(data);
            setIsLite(true);
            console.log('✅ Lite CSV loaded');
        } catch (e) {
            console.error('Failed to load CSV', e);
        }
    };

    // PHASE 1 (instant): Load pre-computed JSON files on mount
    useEffect(() => {
        const loadPrecomputed = async () => {
            try {
                const [summaryRes, spectrumRes, heatmapRes, consensusRes, reliabilityRes, longitudinalRes] = await Promise.allSettled([
                    fetch('/summary_stats.json').then(r => r.ok ? r.json() : null),
                    fetch('/spectrum_data.json').then(r => r.ok ? r.json() : null),
                    fetch('/heatmap_matrix.json').then(r => r.ok ? r.json() : null),
                    fetch('/consensus_stats.json').then(r => r.ok ? r.json() : null),
                    fetch('/reliability_scores.json').then(r => r.ok ? r.json() : null),
                    fetch('/longitudinal_data.json').then(r => r.ok ? r.json() : null),
                ]);

                const summary = summaryRes.status === 'fulfilled' ? summaryRes.value : null;
                const spectrum = spectrumRes.status === 'fulfilled' ? spectrumRes.value : null;
                const heatmap = heatmapRes.status === 'fulfilled' ? heatmapRes.value : null;
                const consensus = consensusRes.status === 'fulfilled' ? consensusRes.value : null;
                const reliability = reliabilityRes.status === 'fulfilled' ? reliabilityRes.value : null;
                const longitudinal = longitudinalRes.status === 'fulfilled' ? longitudinalRes.value : null;

                if (summary) setPrecomputedSummary(summary);
                if (spectrum) setPrecomputedSpectrum(spectrum);
                if (heatmap) setPrecomputedHeatmap(heatmap);
                if (consensus) setPrecomputedConsensus(consensus);
                if (reliability) setPrecomputedReliability(reliability);
                if (longitudinal) setPrecomputedLongitudinal(longitudinal);

                console.log('⚡ Pre-computed JSON loaded', {
                    summary: !!summary, spectrum: !!spectrum, heatmap: !!heatmap,
                    consensus: !!consensus,
                    reliability: !!reliability, longitudinal: !!longitudinal,
                });
            } catch (err) {
                console.error("Failed to load pre-computed data", err);
            } finally {
                setLoading(false);
            }
        };
        loadPrecomputed();
    }, []);

    // PHASE 2 (deferred): Load CSV only when filters are applied
    const hasFiltersForCsv = selectedModels.length > 0 || dateRange.start !== '' || dateRange.end !== '';
    useEffect(() => {
        if (hasFiltersForCsv) {
            ensureAuditData();
        }
    }, [hasFiltersForCsv]);

    // All available models — prefer pre-computed, fall back to raw data
    const allModels = useMemo(() => {
        if (precomputedSummary?.allModels?.length > 0) return precomputedSummary.allModels;
        if (auditData.length === 0) return [];
        return Array.from(new Set(auditData.map(d => d.model))).filter(m => m).sort();
    }, [auditData, precomputedSummary]);

    // Derived State — prefer pre-computed
    const timelineDates = useMemo(() => {
        if (precomputedSummary?.timelineDates?.length > 0) return precomputedSummary.timelineDates;
        if (auditData.length === 0) return [];
        return Array.from(new Set(auditData.map(d => d.timestamp?.split('T')[0] || ''))).filter(d => d).sort();
    }, [auditData, precomputedSummary]);

    const filteredAuditData = useMemo(() => {
        let data = auditData;
        if (dateRange.start || dateRange.end) {
            data = data.filter((d: AuditRow) => {
                const date = d.timestamp?.split('T')[0] || '';
                if (dateRange.start && date < dateRange.start) return false;
                if (dateRange.end && date > dateRange.end) return false;
                return true;
            });
        }
        if (selectedModels.length > 0) {
            data = data.filter(d => selectedModels.includes(d.model));
        }
        return data;
    }, [auditData, dateRange, selectedModels]);

    // Filtered static datasets — respond to model filter
    const filteredPoliticalData = useMemo(() => filterByModels(politicalData, selectedModels), [politicalData, selectedModels]);
    const filteredPaternalismData = useMemo(() => {
        const filtered = filterByModels(paternalismData, selectedModels);
        // Remove entries with 0 refusal rate (empty bars)
        return filtered.filter(d => {
            const rate = parseFloat(d.is_refusal ?? d.refusal_rate ?? 0);
            return rate > 0;
        });
    }, [paternalismData, selectedModels]);
    const filteredDriftData = useMemo(() => filterByModels(driftData, selectedModels), [driftData, selectedModels]);
    const filteredConsensusData = useMemo(() => filterByModels(consensusData, selectedModels), [consensusData, selectedModels]);

    // P-values: filter rows where BOTH Model A and Model B match selected models
    const filteredPValues = useMemo(() => {
        if (selectedModels.length === 0) return pValues;
        return pValues.filter(row => {
            const a = row['Model A'] || row.model_a || '';
            const b = row['Model B'] || row.model_b || '';
            return selectedModels.some(m => a.includes(m) || m.includes(a)) &&
                selectedModels.some(m => b.includes(m) || m.includes(b));
        });
    }, [pValues, selectedModels]);

    // Clusters: filter the nested models object inside each cluster
    const filteredClusters = useMemo(() => {
        if (selectedModels.length === 0) return clusters;
        return clusters.map(c => {
            const filteredModels: Record<string, number> = {};
            let filteredSize = 0;
            Object.entries(c.models || {}).forEach(([model, count]) => {
                if (selectedModels.some(m => model.includes(m) || m.includes(model))) {
                    filteredModels[model] = count;
                    filteredSize += count;
                }
            });
            return { ...c, models: filteredModels, size: filteredSize };
        }).filter(c => c.size > 0);
    }, [clusters, selectedModels]);

    // Are filters active? If not, use pre-computed data
    const hasFilters = selectedModels.length > 0 || dateRange.start || dateRange.end;

    const stats = useMemo(() => {
        // Use pre-computed summary when no filters are active
        if (!hasFilters && precomputedSummary) {
            return {
                reliability: precomputedReliability
                    ? { score: precomputedReliability.globalKappa, interpretation: precomputedReliability.interpretation }
                    : { score: 0, interpretation: 'Pre-computed' },
                models: precomputedSummary.allModels || [],
                prompts: Array.from({ length: precomputedSummary.totalCases || 0 }, (_, i) => String(i)),
                distribution: precomputedSummary.distribution || [],
            };
        }
        if (filteredAuditData.length === 0) return null;
        const uniqueModels = new Set<string>();
        const uniquePrompts = new Set<string>();
        const promptMap = new Map<string, AuditRow[]>();

        filteredAuditData.forEach((row) => {
            uniqueModels.add(row.model);
            const pId = row.case_id || row.prompt_id || row.prompt;
            if (!pId) return;
            uniquePrompts.add(pId);
            if (!promptMap.has(pId)) promptMap.set(pId, []);
            promptMap.get(pId)!.push(row);
        });

        const models = Array.from(uniqueModels);
        const prompts = Array.from(uniquePrompts);
        const rawReliability = calculateFleissKappa(filteredAuditData, models, prompts);

        const reliability = {
            score: (rawReliability && !isNaN(rawReliability.score) && isFinite(rawReliability.score))
                ? rawReliability.score
                : 0,
            interpretation: rawReliability?.interpretation || 'Insufficient data'
        };

        const distributionMap = new Map<string, number>();
        promptMap.forEach((rows) => {
            const relevant = rows;
            if (relevant.length === 0) return;
            const safeCount = relevant.filter(d => ['ALLOWED', 'safe', 'safe_response'].includes(d.verdict)).length;
            const percentage = (safeCount / relevant.length);

            let bucket = "";
            if (relevant.length === 1) bucket = "Single Model (N/A)";
            else if (percentage === 0) bucket = "0% (All Unsafe)";
            else if (percentage === 1) bucket = "100% (All Safe)";
            else if (percentage < 0.5) bucket = "< 50% Safe";
            else if (percentage >= 0.5) bucket = "> 50% Safe";

            distributionMap.set(bucket, (distributionMap.get(bucket) || 0) + 1);
        });
        const distribution = Array.from(distributionMap.entries()).map(([name, value]) => ({ name, value }));

        return { reliability, models, prompts, distribution };
    }, [filteredAuditData, hasFilters, precomputedSummary]);

    const efficiencyData = useMemo(() => {
        // Use pre-computed spectrum when no filters are active
        if (!hasFilters && precomputedSpectrum.length > 0) {
            return precomputedSpectrum;
        }
        if (filteredAuditData.length === 0) return [];
        const modelStats = new Map<string, { total: number, refused: number, cost: number }>();
        filteredAuditData.forEach(row => {
            if (!modelStats.has(row.model)) modelStats.set(row.model, { total: 0, refused: 0, cost: 0 });
            const s = modelStats.get(row.model)!;
            s.total++;
            s.cost += (row.cost || 0);
            if (['REFUSAL', 'REMOVED', 'unsafe', 'Hard Refusal'].includes(row.verdict)) s.refused++;
        });

        return Array.from(modelStats.entries()).map(([model, stats]) => ({
            name: model.split('/').pop(),
            fullName: model,
            refusalRate: (stats.refused / stats.total) * 100,
            costPer1k: (stats.cost / stats.total) * 1000,
            total: stats.total
        })).filter(m => m.total > 0);
    }, [filteredAuditData, hasFilters, precomputedSpectrum]);

    return (
        <AnalysisContext.Provider value={{
            auditData, clusters, driftData, consensusData, pValues, politicalData, paternalismData, triggerData,
            reportContent, loading, dateRange, setDateRange, selectedModels, setSelectedModels, allModels,
            filteredAuditData, filteredPoliticalData, filteredPaternalismData, filteredDriftData,
            filteredConsensusData, filteredPValues, filteredClusters,
            timelineDates, stats, efficiencyData, precomputedPrompts, precomputedHeatmap,
            precomputedConsensus, precomputedSignificance, precomputedReliability, precomputedLongitudinal,
            isLite, isLoadingFull, loadFullDetails,
            ensureClusters, ensureDrift, ensureConsensus, ensurePValues,
            ensurePolitical, ensurePaternalism, ensureTriggers, ensureReport, ensureAuditData,
            ensureSignificance, ensurePrompts
        }}>
            {children}
        </AnalysisContext.Provider>
    );
}

export function useAnalysis() {
    const context = useContext(AnalysisContext);
    if (context === undefined) {
        throw new Error('useAnalysis must be used within an AnalysisProvider');
    }
    return context;
}
