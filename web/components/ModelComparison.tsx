'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';

type AuditRow = {
    model: string;
    verdict: string;
    category: string;
    response?: string;
    response_text?: string;
    timestamp?: string;
};

type ModelStats = {
    model: string;
    refusalRate: number;
    avgLength: number;
    count: number;
    confidenceInterval: { lower: number; upper: number };
    pValue: number | null;
};

// Calculate Wilson score confidence interval for proportions
function wilsonConfidenceInterval(successes: number, total: number, confidence: number = 0.95): { lower: number; upper: number } {
    if (total === 0) return { lower: 0, upper: 0 };

    // Z-score for 95% confidence
    const z = confidence === 0.95 ? 1.96 : 1.645; // 95% or 90%
    const p = successes / total;
    const n = total;

    const denominator = 1 + (z * z) / n;
    const center = p + (z * z) / (2 * n);
    const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);

    return {
        lower: Math.max(0, (center - margin) / denominator) * 100,
        upper: Math.min(1, (center + margin) / denominator) * 100
    };
}

// Two-proportion Z-test for significance
function twoProportionZTest(p1: number, n1: number, p2: number, n2: number): number {
    if (n1 === 0 || n2 === 0) return 1;

    const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

    if (se === 0) return 1;

    const z = Math.abs(p1 - p2) / se;
    // Approximate p-value from Z-score (two-tailed)
    const pValue = 2 * (1 - normalCDF(z));
    return pValue;
}

// Standard normal CDF approximation
function normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
}

export default function ModelComparison({ data, onModelSelect }: { data: AuditRow[], onModelSelect?: (model: string) => void }) {
    const [sortKey, setSortKey] = useState<'refusalRate' | 'model' | 'count' | 'avgLength'>('refusalRate');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const handleSort = (key: typeof sortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('desc'); // Default new sort to desc, since higher values are usually more interesting here
        }
    };

    const stats = useMemo(() => {
        const map: Record<string, { total: number; refusals: number; totalLen: number }> = {};

        data.forEach(d => {
            const modelName = d.model;
            if (!map[modelName]) map[modelName] = { total: 0, refusals: 0, totalLen: 0 };

            map[modelName].total++;
            if (d.verdict === 'REFUSAL' || d.verdict === 'REMOVED' || d.verdict === 'unsafe') {
                map[modelName].refusals++;
            }

            const responseText = d.response || d.response_text || '';
            map[modelName].totalLen += responseText.length;
        });

        // Calculate overall stats for comparison
        const totalAll = Object.values(map).reduce((sum, s) => sum + s.total, 0);
        const refusalsAll = Object.values(map).reduce((sum, s) => sum + s.refusals, 0);
        const overallRate = refusalsAll / totalAll;

        return Object.entries(map).map(([model, s]) => {
            const refusalRate = (s.refusals / s.total) * 100;
            const ci = wilsonConfidenceInterval(s.refusals, s.total);

            // Compare to overall rate
            const pValue = twoProportionZTest(
                s.refusals / s.total, s.total,
                overallRate, totalAll
            );

            return {
                model,
                refusalRate,
                avgLength: Math.round(s.totalLen / s.total),
                count: s.total,
                confidenceInterval: ci,
                pValue
            };
        }).sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case 'model': cmp = a.model.localeCompare(b.model); break;
                case 'count': cmp = a.count - b.count; break;
                case 'avgLength': cmp = a.avgLength - b.avgLength; break;
                default: cmp = a.refusalRate - b.refusalRate; break;
            }
            return sortOrder === 'asc' ? cmp : -cmp;
        });
    }, [data, sortKey, sortOrder]);

    const formatCI = (ci: { lower: number; upper: number }) => {
        return `${ci.lower.toFixed(1)}–${ci.upper.toFixed(1)}%`;
    };

    const getSignificanceLabel = (pValue: number | null) => {
        if (pValue === null) return '';
        if (pValue < 0.001) return '***';
        if (pValue < 0.01) return '**';
        if (pValue < 0.05) return '*';
        return '';
    };

    const SortIcon = ({ column }: { column: typeof sortKey }) => {
        if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity" />;
        return sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-brand" /> : <ArrowDown className="h-3 w-3 text-brand" />;
    };

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <span>🏆</span> Model Comparison
                </h3>

                {/* Mobile-friendly Sort Dropdown (Visible only on small screens) */}
                <div className="flex sm:hidden items-center gap-2 w-full">
                    <label htmlFor="mobile-sort" className="text-sm font-medium text-muted-foreground whitespace-nowrap">Sort by:</label>
                    <select
                        id="mobile-sort"
                        className="bg-background border border-border text-foreground text-sm rounded-lg focus:ring-brand focus:border-brand block w-full p-2.5"
                        value={`${sortKey}-${sortOrder}`}
                        onChange={(e) => {
                            const [k, o] = e.target.value.split('-');
                            setSortKey(k as any);
                            setSortOrder(o as any);
                        }}
                    >
                        <option value="refusalRate-desc">Refusal Rate (High to Low)</option>
                        <option value="refusalRate-asc">Refusal Rate (Low to High)</option>
                        <option value="model-asc">Model Name (A-Z)</option>
                        <option value="count-desc">Prompts (High to Low)</option>
                        <option value="avgLength-desc">Avg Response (High to Low)</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="bg-muted/50 border-b border-border">
                            <th
                                className="p-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider cursor-pointer group hover:bg-muted/70 transition-colors"
                                onClick={() => handleSort('model')}
                            >
                                <div className="flex items-center gap-1">Model <SortIcon column="model" /></div>
                            </th>
                            <th
                                className="p-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider cursor-pointer group hover:bg-muted/70 transition-colors"
                                onClick={() => handleSort('refusalRate')}
                            >
                                <div className="flex items-center gap-1">
                                    Refusal Rate
                                    <span title="Percentage of prompts refused or flagged as unsafe" className="cursor-help">ⓘ</span>
                                    <SortIcon column="refusalRate" />
                                </div>
                            </th>
                            <th className="p-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">
                                <div className="flex items-center gap-1">
                                    95% CI
                                    <span title="Wilson score confidence interval for the refusal rate" className="cursor-help">ⓘ</span>
                                </div>
                            </th>
                            <th
                                className="p-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider cursor-pointer group hover:bg-muted/70 transition-colors"
                                onClick={() => handleSort('avgLength')}
                            >
                                <div className="flex items-center gap-1">Avg Response <SortIcon column="avgLength" /></div>
                            </th>
                            <th
                                className="p-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider text-right cursor-pointer group hover:bg-muted/70 transition-colors"
                                onClick={() => handleSort('count')}
                            >
                                <div className="flex items-center justify-end gap-1"><SortIcon column="count" /> Prompts</div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {stats.map((row: ModelStats) => (
                            <tr
                                key={row.model}
                                className={`hover:bg-muted/50 transition-colors ${onModelSelect ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                                onClick={() => onModelSelect?.(row.model)}
                            >
                                <td className="p-4 font-medium text-foreground">
                                    {row.model.split('/')[1] || row.model}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="flex-1 h-2 bg-muted rounded-full max-w-[100px] overflow-hidden"
                                            role="img"
                                            aria-label={`Visual bar showing ${row.refusalRate.toFixed(1)}% refusal rate`}
                                        >
                                            <div
                                                className={`h-full rounded-full ${row.refusalRate > 50 ? 'bg-refusal' :
                                                    row.refusalRate > 30 ? 'bg-[#EAAA00]' : 'bg-safe'
                                                    }`}
                                                style={{ width: `${Math.max(row.refusalRate, 5)}%` }}
                                            ></div>
                                        </div>
                                        <span className={`font-bold ${row.refusalRate > 50 ? 'text-refusal' :
                                            row.refusalRate > 30 ? 'text-[#CC8A00]' : 'text-safe'
                                            }`}>
                                            {row.refusalRate.toFixed(1)}%
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4 text-muted-foreground text-xs font-mono">
                                    {formatCI(row.confidenceInterval)}
                                </td>
                                <td className="p-4 font-mono text-muted-foreground">
                                    {row.avgLength} chars
                                </td>
                                <td className="p-4 text-right text-muted-foreground">
                                    {row.count}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
