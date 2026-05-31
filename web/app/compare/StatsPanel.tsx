import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, Info, ExternalLink } from 'lucide-react';
import { TooltipHover } from '@/components/ui/TooltipHover';

/** Safely call .toFixed() — returns '0' if the value is not a finite number. */
const safeFixed = (n: number | null | undefined, d = 1): string =>
    (typeof n === 'number' && isFinite(n) ? n : 0).toFixed(d);

interface StatsPanelProps {
    modelA: string;
    modelB: string;
    statsA: any;
    statsB: any;
    showStats: boolean;
    setShowStats: (show: boolean | ((prev: boolean) => boolean)) => void;
    pairResult: any;
    getProviderLogo: (model: string) => string;
}

export function StatsPanel({
    modelA,
    modelB,
    statsA,
    statsB,
    showStats,
    setShowStats,
    pairResult,
    getProviderLogo,
}: StatsPanelProps) {
    return (
        <>
            {/* Advanced Stats (collapsed by default) */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
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
                                ? 'bg-safe/10 text-safe'
                                : 'bg-muted text-muted-foreground'
                                }`}>
                                {pairResult['Significant'] === 'YES' ? 'Significant' : 'Not Significant'}
                            </span>
                        )}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showStats ? 'rotate-180' : ''}`} />
                </button>

                {showStats && (
                    <div className="px-5 pb-5 pt-1 border-t border-border">
                        {pairResult ? (
                            <div className="flex flex-wrap items-start gap-8 mt-3">
                                <div>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">P-Value (McNemar's)</span>
                                    <div className="text-2xl font-black font-mono text-foreground mt-1">
                                        {parseFloat(String(pairResult['P-Value'])).toExponential(2)}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Result</span>
                                    <div className="mt-2">
                                        {pairResult['Significant'] === 'YES'
                                            ? <span className="text-sm bg-safe/10 text-safe dark:text-[#9CAF88] px-3 py-1.5 rounded-full font-bold">✓ Statistically Significant</span>
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

            {/* Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card A */}
                <div className="bg-card rounded-xl border border-border p-6 border-t border-t-brand relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Image src={getProviderLogo(modelA)} alt={`${modelA.split('/').pop() || modelA} logo`} width={128} height={128} className="h-32 w-32 object-contain" unoptimized />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <Image
                            src={getProviderLogo(modelA)}
                            alt={`${modelA.split('/').pop() || modelA} logo`}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-lg object-contain bg-card border border-border"
                            onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                            unoptimized
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
                                <TooltipHover
                                    label={<div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Refusal Rate</div>}
                                    tooltipText="Percentage of prompts in our dataset that this model refused to answer. Higher = more restrictive."
                                />
                                <div className={`text-2xl font-bold ${(statsA.refusalRate ?? 0) > 50 ? 'text-refusal' : 'text-safe'}`}>
                                    {safeFixed(statsA.refusalRate)}%
                                </div>
                            </div>
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <TooltipHover
                                    label={<div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Avg Verbosity</div>}
                                    tooltipText="The average length of the model's response in characters. A higher verbosity generally indicates a more detailed (and helpful) response."
                                />
                                <div className="text-2xl font-bold text-foreground">
                                    {statsA.avgVerbosity} <span className="text-sm font-normal text-muted-foreground">chars</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Card B */}
                <div className="bg-card rounded-xl border border-border p-6 border-t border-t-safe relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Image src={getProviderLogo(modelB)} alt={`${modelB.split('/').pop() || modelB} logo`} width={128} height={128} className="h-32 w-32 object-contain" unoptimized />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <Image
                            src={getProviderLogo(modelB)}
                            alt={`${modelB.split('/').pop() || modelB} logo`}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-lg object-contain bg-card border border-border"
                            onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                            unoptimized
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
                                <TooltipHover
                                    label={<div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Refusal Rate</div>}
                                    tooltipText="Percentage of prompts in our dataset that this model refused to answer. Higher = more restrictive."
                                />
                                <div className={`text-2xl font-bold ${(statsB.refusalRate ?? 0) > 50 ? 'text-refusal' : 'text-safe'}`}>
                                    {safeFixed(statsB.refusalRate)}%
                                </div>
                            </div>
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <TooltipHover
                                    label={<div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Avg Verbosity</div>}
                                    tooltipText="The average length of the model's response in characters. A higher verbosity generally indicates a more detailed (and helpful) response."
                                />
                                <div className="text-2xl font-bold text-foreground">
                                    {statsB.avgVerbosity} <span className="text-sm font-normal text-muted-foreground">chars</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
