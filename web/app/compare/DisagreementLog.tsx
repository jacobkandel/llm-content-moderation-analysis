import Image from 'next/image';
import { ExternalLink, CheckCircle } from 'lucide-react';
import { getPromptSource, getSourceBadgeClass } from '@/lib/prompt-source';

interface DisagreementLogProps {
    modelA: string;
    modelB: string;
    disagreements: any[];
    disagreementCount: number;
    fullData: any[] | null;
    fullDataLoading: boolean;
    visibleCount: number;
    setVisibleCount: (val: number | ((prev: number) => number)) => void;
    batchSize: number;
    setBatchSize: (val: number) => void;
    getProviderLogo: (model: string) => string;
    parseResponseText: (raw: string | null | undefined) => { verdict: string | null; reason: string };
    VerdictBadge: React.FC<{ verdict: string | null | undefined }>;
    disagreeRef: React.RefObject<HTMLDivElement | null>;
}

export function DisagreementLog({
    modelA,
    modelB,
    disagreements,
    disagreementCount,
    fullData,
    fullDataLoading,
    visibleCount,
    setVisibleCount,
    batchSize,
    setBatchSize,
    getProviderLogo,
    parseResponseText,
    VerdictBadge,
    disagreeRef
}: DisagreementLogProps) {
    return (
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

                    {disagreements.slice(0, visibleCount).map((diff, idx) => {
                        const diffId = `diff-${diff.rowA?.prompt_id || diff.rowB?.prompt_id || idx}`;
                        return (
                            <div id={diffId} key={idx} className="bg-card rounded-lg border border-border overflow-hidden hover:bg-muted/40 transition-colors scroll-mt-24 relative group">
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
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prompt</p>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    const url = new URL(window.location.href);
                                                    url.hash = diffId;
                                                    navigator.clipboard.writeText(url.toString());

                                                    // Show visual feedback
                                                    const btn = e.currentTarget;
                                                    const originalHtml = btn.innerHTML;
                                                    btn.innerHTML = '<span class="text-[10px] text-green-600 font-bold">Copied!</span>';
                                                    setTimeout(() => { btn.innerHTML = originalHtml; }, 2000);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                                title="Copy link to this disagreement"
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                                <span className="sr-only">Copy link</span>
                                            </button>
                                        </div>
                                        <div className="text-sm text-foreground font-mono bg-muted/50 p-3 rounded border border-border max-h-32 overflow-y-auto">
                                            {diff.prompt || <div className="h-4 w-3/4 bg-muted/50 rounded animate-pulse" />}
                                        </div>
                                    </div>

                                    {/* Side-by-Side Responses */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Model A Response */}
                                        <div className={`rounded-lg border group/resp ${diff.rowA.verdict === 'safe' || diff.rowA.verdict === 'ALLOWED' ? 'border-safe/30 bg-safe/5' : 'border-refusal/30 bg-refusal/5'}`}>
                                            <div className={`sticky top-14 z-10 px-3 py-2 flex justify-between items-center border-b rounded-t-lg backdrop-blur-md ${diff.rowA.verdict === 'safe' || diff.rowA.verdict === 'ALLOWED' ? 'border-safe/30 bg-safe/10/80 supports-[backdrop-filter]:bg-safe/5/80' : 'border-refusal/30 bg-refusal/10/80 supports-[backdrop-filter]:bg-refusal/5/80'}`}>
                                                <div className="flex items-center gap-2">
                                                    <Image
                                                        src={getProviderLogo(modelA)}
                                                        alt={`${modelA.split('/').pop() || modelA} logo`}
                                                        width={20}
                                                        height={20}
                                                        className="h-5 w-5 rounded object-contain"
                                                        onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                                                        unoptimized
                                                    />
                                                    <span className="font-bold text-sm text-foreground">{modelA?.split('/')[1] || modelA}</span>
                                                </div>
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${diff.rowA.verdict === 'safe' || diff.rowA.verdict === 'ALLOWED' ? 'bg-safe text-white' : 'bg-refusal text-white'}`}>
                                                    {diff.rowA.verdict === 'safe' || diff.rowA.verdict === 'ALLOWED' ? 'ALLOWED' : 'REMOVED'}
                                                </span>
                                            </div>
                                            <div className="p-3 space-y-2">
                                                {(() => { const p = parseResponseText(diff.rowA.response); return (<><VerdictBadge verdict={p.verdict} /><p className="text-sm text-foreground leading-relaxed max-h-36 overflow-y-auto">{p.reason}</p></>); })()}
                                            </div>
                                        </div>

                                        {/* Model B Response */}
                                        <div className={`rounded-lg border group/resp ${diff.rowB.verdict === 'safe' || diff.rowB.verdict === 'ALLOWED' ? 'border-safe/30 bg-safe/5' : 'border-refusal/30 bg-refusal/5'}`}>
                                            <div className={`sticky top-14 z-10 px-3 py-2 flex justify-between items-center border-b rounded-t-lg backdrop-blur-md ${diff.rowB.verdict === 'safe' || diff.rowB.verdict === 'ALLOWED' ? 'border-safe/30 bg-safe/10/80 supports-[backdrop-filter]:bg-safe/5/80' : 'border-refusal/30 bg-refusal/10/80 supports-[backdrop-filter]:bg-refusal/5/80'}`}>
                                                <div className="flex items-center gap-2">
                                                    <Image
                                                        src={getProviderLogo(modelB)}
                                                        alt={`${modelB.split('/').pop() || modelB} logo`}
                                                        width={20}
                                                        height={20}
                                                        className="h-5 w-5 rounded object-contain"
                                                        onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                                                        unoptimized
                                                    />
                                                    <span className="font-bold text-sm text-foreground">{modelB?.split('/')[1] || modelB}</span>
                                                </div>
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${diff.rowB.verdict === 'safe' || diff.rowB.verdict === 'ALLOWED' ? 'bg-safe text-white' : 'bg-refusal text-white'}`}>
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
                        );
                    })}
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
    );
}
