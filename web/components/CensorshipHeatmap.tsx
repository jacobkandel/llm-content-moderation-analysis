'use client';
import type { JsonData } from '@/lib/data-loading';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';
import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { getPromptSource, getSourceBadgeClass } from '@/lib/prompt-source';

type HeatmapProps = {
    data: JsonData[];
    title?: string;
    description?: string;
    onCellClick?: (model: string, category: string, entries: JsonData[]) => void;
};

/** Minimum sample size for a cell to be considered statistically meaningful. */
const MIN_SAMPLE_SIZE = 30;

// Shorten long category names for display
const sanitizeCategory = (cat: string): string => {
    const mapping: Record<string, string> = {
        'Violence': 'Violence',
        'Incitement to Violence': 'Incitement',
        'Health Misinformation': 'Health Misinfo',
        'Medical Misinformation': 'Medical Misinfo',
        'False Positive Control': 'False Positive',
        'Explicit/Sexual': 'Explicit/Sexual',
        'Cybersecurity': 'Cybersecurity',
        'Dangerous': 'Dangerous',
        'Deception': 'Deception',
        'Harassment': 'Harassment',
        'Hate Speech': 'Hate Speech',
        'Misinformation': 'Misinfo',
        'Crime': 'Crime',
        'Self-Harm': 'Self-Harm',
        'Theft': 'Theft',
    };
    // Return mapped name or truncate long names
    if (mapping[cat]) return mapping[cat];
    if (cat.length > 10) return cat.substring(0, 8) + '...';
    return cat;
};

// Normalize categories to merge similar ones
const normalizeCategory = (cat: string): string => {
    // Merge Explicit Content and Sexual into one category
    if (cat === 'Explicit Content' || cat === 'Sexual') return 'Explicit/Sexual';
    return cat;
};

export function CensorshipHeatmap({ data, title = "Refusal Heatmap", description, onCellClick }: HeatmapProps) {
    const { isLite, isLoadingFull, loadFullDetails, precomputedHeatmap, precomputedPrompts, selectedModels, dateRange } = useAnalysis();
    const [selectedCell, setSelectedCell] = useState<{ model: string; category: string } | null>(null);
    const [expandedModel, setExpandedModel] = useState<string | null>(null); // For mobile accordion
    const [showModal, setShowModal] = useState(false);

    const hasFilters = selectedModels.length > 0 || dateRange.start || dateRange.end;

    // 1. Process data to get Refusal Rate per Model per Category
    //    Use pre-computed JSON when no filters are active
    const matrix = useMemo((): { models: string[]; categories: string[]; stats: Record<string, Record<string, { total: number; refusals: number; entries: JsonData[] }>> } => {
        // Use pre-computed heatmap when available and no filters active
        if (!hasFilters && precomputedHeatmap) {
            const stats: Record<string, Record<string, { total: number; refusals: number; entries: JsonData[] }>> = {};
            for (const model of precomputedHeatmap.models) {
                stats[model] = {};
                for (const cat of precomputedHeatmap.categories) {
                    const cell = precomputedHeatmap.cells[model]?.[cat] || { total: 0, refusals: 0 };
                    stats[model][cat] = { total: cell.total, refusals: cell.refusals, entries: [] };
                }
            }
            return { models: precomputedHeatmap.models, categories: precomputedHeatmap.categories, stats };
        }

        // Fall back to computing from raw data when filters are active
        const allModels = Array.from(new Set(data.map(d => d.model))).sort();
        // Normalize categories before creating unique set
        const categories = Array.from(new Set(data.map(d => normalizeCategory(d.category)))).filter(c => c).sort();

        const stats: Record<string, Record<string, { total: number; refusals: number; entries: JsonData[] }>> = {};

        // Init stats
        allModels.forEach(m => {
            stats[m] = {};
            categories.forEach(c => {
                stats[m][c] = { total: 0, refusals: 0, entries: [] };
            });
        });

        // Fill stats - use normalized category
        data.forEach(d => {
            if (!d.model || !d.category) return;
            const normalizedCategory = normalizeCategory(d.category);
            if (!stats[d.model] || !stats[d.model][normalizedCategory]) return;
            stats[d.model][normalizedCategory].total++;
            stats[d.model][normalizedCategory].entries.push(d);
            if (['REFUSAL', 'REMOVED', 'unsafe', 'Hard Refusal', 'Soft Censorship'].includes(d.verdict)) {
                stats[d.model][normalizedCategory].refusals++;
            }
        });

        // Filter out models with zero total entries (no data at all)
        const models = allModels.filter(m => {
            const totalForModel = categories.reduce((sum, c) => sum + (stats[m][c]?.total || 0), 0);
            return totalForModel > 0;
        });

        return { models, categories, stats };
    }, [data, hasFilters, precomputedHeatmap]);

    // Reactive modal entries (so they update when full data loads)
    const modalEntries = useMemo(() => {
        if (!selectedCell) return [];
        return matrix.stats[selectedCell.model]?.[selectedCell.category]?.entries || [];
    }, [selectedCell, matrix]);

    // When using precomputed data, entries are empty - show matching prompts instead
    const categoryPrompts = useMemo(() => {
        if (!selectedCell || modalEntries.length > 0) return [];
        return precomputedPrompts.filter(p => {
            const pCat = p.category;
            const selCat = selectedCell.category;
            // Handle normalized categories
            if (selCat === 'Explicit/Sexual') {
                return pCat === 'Explicit Content' || pCat === 'Sexual' || pCat === 'Explicit/Sexual';
            }
            return pCat === selCat;
        });
    }, [selectedCell, modalEntries, precomputedPrompts]);

    // Helper for color scale - Using UChicago Brand Colors
    const getColor = (rate: number) => {
        // UChicago Green: #00843D
        // Fix: Use lighter text in dark mode for 0%
        if (rate === 0) return 'bg-[#00843D]/10 text-[#00843D] dark:text-[#A3E6BE] hover:bg-[#00843D]/20';
        // UChicago Green (More opaque)
        if (rate < 0.2) return 'bg-[#00843D]/30 text-[#006429] dark:text-[#A3E6BE] hover:bg-[#00843D]/40';
        // UChicago Gold: #FFC72C
        if (rate < 0.4) return 'bg-[#FFC72C]/30 text-[#8F6B00] dark:text-[#FFEebb] hover:bg-[#FFC72C]/40';
        // UChicago Orange: #FF671F
        if (rate < 0.6) return 'bg-[#FF671F]/40 text-[#A33600] dark:text-[#FFCCAA] hover:bg-[#FF671F]/50';
        // UChicago Brick: #A4343A
        if (rate < 0.8) return 'bg-refusal/80 text-white hover:bg-refusal';
        // UChicago Maroon: #800000
        return 'bg-brand text-white font-bold hover:bg-[#600000]';
    };

    const getSeverity = (rate: number) => {
        if (rate < 0.2) return 'Safe';
        if (rate < 0.4) return 'Low';
        if (rate < 0.6) return 'Medium';
        if (rate < 0.8) return 'High';
        return 'Critical';
    };

    const handleCellClick = (model: string, category: string) => {
        // Trigger download of full text if needed
        if (isLite) {
            loadFullDetails();
        }

        setSelectedCell({ model, category });
        setShowModal(true);
        const cell = matrix.stats[model]?.[category];
        const entries = cell?.entries || [];
        if (onCellClick) onCellClick(model, category, entries);
    };

    const toggleModel = (model: string) => {
        setExpandedModel(expandedModel === model ? null : model);
    };

    if (matrix.models.length === 0 || matrix.categories.length === 0) return null;

    return (
        <div className="bg-card rounded-xl border border-border p-6 overflow-hidden">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    {title}
                </h3>
                {description && (
                    <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
                        {description}
                    </p>
                )}
                <p className="text-xs text-muted-foreground mt-2 hidden md:block">Click any cell to see details</p>
                <p className="text-xs text-muted-foreground mt-2 md:hidden">Tap a model to view details</p>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr>
                            <th className="p-1.5 bg-muted/50 border-b border-border min-w-[100px] sticky left-0 z-10 text-xs text-muted-foreground">
                                Model
                            </th>
                            {matrix.categories.map(c => (
                                <th key={c} className="p-1.5 bg-muted/50 border-b border-border font-semibold text-muted-foreground min-w-[60px] text-center text-[10px] leading-tight">
                                    {sanitizeCategory(c)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {matrix.models.map(m => (
                            <tr key={m} className="border-b border-border last:border-0">
                                <td className="p-1.5 font-medium text-foreground sticky left-0 bg-card z-10 w-[100px] truncate text-xs" title={m}>
                                    {m && typeof m === 'string' ? (m.split('/').pop() || m) : 'Unknown'}
                                </td>
                                {matrix.categories.map(c => {
                                    const cell = matrix.stats[m][c];
                                    if (!cell || cell.total === 0) {
                                        return (
                                            <td key={c} className="p-1.5 text-center text-muted-foreground/30 bg-muted/10 text-xs">
                                                -
                                            </td>
                                        );
                                    }
                                    const rate = cell.refusals / cell.total;
                                    const isThin = cell.total < MIN_SAMPLE_SIZE;
                                    return (
                                        <td
                                            key={c}
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`${m} in ${c}: ${getSeverity(rate)} severity with ${(rate * 100).toFixed(0)}% refusals${isThin ? ' (low sample size)' : ''}`}
                                            className={`p-1.5 text-center cursor-pointer transition-colors text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${getColor(rate)} ${isThin ? 'border border-dashed border-muted-foreground/40' : ''}`}
                                            onClick={() => handleCellClick(m, c)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCellClick(m, c); } }}
                                            title={isThin
                                                ? `${cell.refusals}/${cell.total} refusals — ⚠️ Low sample size (n < ${MIN_SAMPLE_SIZE}), interpret with caution`
                                                : `${cell.refusals}/${cell.total} refusals - Click for details`
                                            }
                                        >
                                            {(rate * 100).toFixed(0)}%{isThin ? '†' : ''}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile View: Collapsible List */}
            <div className="md:hidden space-y-3">
                {matrix.models.map(m => {
                    // Calculate avg refusal for summary
                    const totalStats = matrix.categories.reduce((acc, c) => {
                        const cell = matrix.stats[m][c];
                        if (cell && cell.total > 0) {
                            acc.refusals += cell.refusals;
                            acc.total += cell.total;
                        }
                        return acc;
                    }, { refusals: 0, total: 0 });

                    const avgRate = totalStats.total > 0 ? totalStats.refusals / totalStats.total : 0;
                    const isExpanded = expandedModel === m;

                    return (
                        <div key={m} className="border border-border rounded-xl shadow-sm bg-card overflow-hidden">
                            <div
                                role="button"
                                tabIndex={0}
                                aria-expanded={isExpanded}
                                className={`p-4 flex items-center justify-between cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[hsl(var(--focus-ring))] ${isExpanded ? 'bg-muted/30' : 'bg-card'}`}
                                onClick={() => toggleModel(m)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        toggleModel(m);
                                    }
                                }}
                            >
                                <div className="flex-1">
                                    <h4 className="font-bold text-foreground text-base">
                                        {m && typeof m === 'string' ? (m.split('/').pop() || m) : 'Unknown'}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Overall:</span>
                                        <span className={`text-sm font-bold ${avgRate > 0.5 ? 'text-brand' : 'text-foreground'}`}>
                                            {(avgRate * 100).toFixed(1)}% refusal
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-muted/40 p-2 rounded-full">
                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-foreground" /> : <ChevronDown className="w-5 h-5 text-foreground" />}
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="border-t border-border bg-muted/10 p-4 space-y-3">
                                    {matrix.categories.map(c => {
                                        const cell = matrix.stats[m][c];
                                        if (!cell || cell.total === 0) return null;
                                        const rate = cell.refusals / cell.total;
                                        const isThinMobile = cell.total < MIN_SAMPLE_SIZE;

                                        return (
                                            <div key={c}
                                                role="button"
                                                tabIndex={0}
                                                aria-label={`${c}: ${getSeverity(rate)} severity with ${(rate * 100).toFixed(0)}% refusals${isThinMobile ? ' (low sample size)' : ''}`}
                                                className={`p-3 rounded-lg flex justify-between items-center cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${getColor(rate)} ${isThinMobile ? 'border-dashed border-muted-foreground/40' : 'border border-black/5'}`}
                                                onClick={() => handleCellClick(m, c)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCellClick(m, c); } }}
                                            >
                                                <span className="truncate mr-3 font-semibold text-sm">{sanitizeCategory(c)}{isThinMobile ? ' †' : ''}</span>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="text-base font-black tracking-tight">{(rate * 100).toFixed(0)}%</span>
                                                    {isThinMobile && <span className="text-[10px] opacity-60">n={cell.total}</span>}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground justify-end flex-wrap" aria-label="Heatmap Legend" role="group">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#00843D]/30 rounded border border-[#00843D]" role="img" aria-label="Safe severity color"></div> Safe</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#FFC72C]/30 rounded border border-[#FFC72C]" role="img" aria-label="Low severity color"></div> Low</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#FF671F]/40 rounded border border-[#FF671F]" role="img" aria-label="Medium severity color"></div> Medium</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-refusal/80 rounded border border-refusal" role="img" aria-label="High severity color"></div> High</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-brand rounded" role="img" aria-label="Critical severity color"></div> Critical</div>
                <div className="flex items-center gap-1 ml-2 border-l pl-2 border-border"><span className="font-mono">†</span> n &lt; {MIN_SAMPLE_SIZE}</div>
            </div>

            {/* Modal for cell details */}
            {showModal && selectedCell && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 transition-opacity" onClick={() => setShowModal(false)}>
                    <div className="bg-popover text-popover-foreground rounded-xl p-4 md:p-6 w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-border animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4 flex-shrink-0 border-b border-border pb-3">
                            <h4 className="text-base md:text-lg font-bold truncate pr-4 text-foreground flex flex-col md:flex-row md:items-center gap-1">
                                <span className="text-primary">{selectedCell.model && typeof selectedCell.model === 'string'
                                    ? (selectedCell.model.split('/').pop() || selectedCell.model)
                                    : 'Unknown'}</span>
                                <span className="hidden md:inline text-muted-foreground">×</span>
                                <span className="text-muted-foreground md:text-foreground">{selectedCell.category}</span>
                            </h4>
                            <button aria-label="Close modal" onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center justify-between mb-3 flex-shrink-0 px-1">
                            <p className="text-sm text-muted-foreground font-medium">
                                {modalEntries.length > 0 ? `${modalEntries.length} entries found` : `${categoryPrompts.length} prompts in this category`}
                            </p>
                            {isLoadingFull && (
                                <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full animate-pulse">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Loading full text...
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 overflow-y-auto flex-grow pr-1 custom-scrollbar">
                            {/* Show full audit entries when available (from CSV) */}
                            {modalEntries.length > 0 ? modalEntries.slice(0, 50).map((entry, idx) => (
                                <div key={idx} className={`p-3 rounded-lg border text-sm ${['safe', 'ALLOWED', 'Authorized'].includes(entry.verdict)
                                    ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30'
                                    : 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30'
                                    }`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${['safe', 'ALLOWED', 'Authorized'].includes(entry.verdict)
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                                            : 'bg-brand text-white'
                                            }`}>
                                            {entry.verdict}
                                        </span>
                                        <span className={`text-[10px] font-mono ${['safe', 'ALLOWED', 'Authorized'].includes(entry.verdict)
                                            ? 'text-emerald-700 dark:text-emerald-300'
                                            : 'text-red-700 dark:text-red-300'
                                            }`}>{entry.case_id}</span>
                                    </div>
                                    <div className="space-y-2.5">
                                        <div>
                                            <p className={`text-[10px] uppercase tracking-wide font-bold mb-1 ${['safe', 'ALLOWED', 'Authorized'].includes(entry.verdict)
                                                ? 'text-emerald-600/80 dark:text-emerald-400/80'
                                                : 'text-red-600/80 dark:text-red-400/80'
                                                }`}>Prompt</p>
                                            <p className={`leading-relaxed font-medium ${['safe', 'ALLOWED', 'Authorized'].includes(entry.verdict)
                                                ? 'text-emerald-900 dark:text-emerald-100'
                                                : 'text-red-900 dark:text-red-100'
                                                }`}>{entry.prompt || <span className="italic opacity-70">No prompt text available</span>}</p>
                                        </div>
                                        {entry.response && (
                                            <div className={`pt-2 border-t ${['safe', 'ALLOWED', 'Authorized'].includes(entry.verdict)
                                                ? 'border-emerald-200/50 dark:border-emerald-800/50'
                                                : 'border-red-200/50 dark:border-red-800/50'
                                                }`}>
                                                <p className={`text-[10px] uppercase tracking-wide font-bold mb-1 ${['safe', 'ALLOWED', 'Authorized'].includes(entry.verdict)
                                                    ? 'text-emerald-600/80 dark:text-emerald-400/80'
                                                    : 'text-red-600/80 dark:text-red-400/80'
                                                    }`}>Response</p>
                                                <p className={`leading-relaxed text-xs ${['safe', 'ALLOWED', 'Authorized'].includes(entry.verdict)
                                                    ? 'text-emerald-900 dark:text-emerald-100'
                                                    : 'text-red-900 dark:text-red-100'
                                                    }`}>{entry.response}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )) : null}
                            {modalEntries.length > 0 && modalEntries.length > 50 && (
                                <div className="py-4 text-center">
                                    <p className="text-muted-foreground text-sm">...and {modalEntries.length - 50} more entries</p>
                                </div>
                            )}

                            {/* Show precomputed prompts when no CSV entries (precomputed mode) */}
                            {modalEntries.length === 0 && categoryPrompts.slice(0, 50).map((prompt, idx) => {
                                const source = prompt.source || getPromptSource(prompt.id);
                                return (
                                    <div key={idx} className="p-3 rounded-lg border border-border bg-muted/20 text-sm">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getSourceBadgeClass(source)}`}>
                                                {source}
                                            </span>
                                            <span className="text-[10px] font-mono text-muted-foreground">ID: {prompt.id}</span>
                                        </div>
                                        <p className="text-sm text-foreground leading-relaxed">{prompt.text || <span className="italic opacity-70">No prompt text available</span>}</p>
                                    </div>
                                );
                            })}
                            {modalEntries.length === 0 && categoryPrompts.length > 50 && (
                                <div className="py-4 text-center">
                                    <p className="text-muted-foreground text-sm">...and {categoryPrompts.length - 50} more prompts</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
