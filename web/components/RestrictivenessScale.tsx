'use client';

import { getLogoUrl, getProviderName } from '@/lib/provider-logos';
import Link from 'next/link';
import Image from 'next/image';

interface ModelData {
    name: string;
    refusalRate: number;
    cost: number;
    total?: number;
    displayName?: string;
}

interface RestrictivenessScaleProps {
    models: ModelData[];
    onModelClick?: (model: ModelData) => void;
}

/**
 * Wilson score confidence interval for a proportion.
 * Returns [lower, upper] as percentages (0–100).
 * Uses z=1.96 for 95% confidence.
 */
function wilsonCI(pPct: number, n: number): [number, number] {
    if (n === 0) return [0, 100];
    const z = 1.96;
    const phat = pPct / 100;
    const center = (phat + z * z / (2 * n)) / (1 + z * z / n);
    const spread = (z / (1 + z * z / n)) * Math.sqrt(phat * (1 - phat) / n + z * z / (4 * n * n));
    return [Math.max(0, (center - spread) * 100), Math.min(100, (center + spread) * 100)];
}

export default function RestrictivenessScale({ models, onModelClick }: RestrictivenessScaleProps) {
    const sortedModels = [...models].sort((a, b) => a.refusalRate - b.refusalRate);

    return (
        <div className="bg-card rounded-xl p-6 border border-border mb-8">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold text-foreground">
                        Restrictiveness Spectrum
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Models ranked by refusal rate — least to most restrictive.{' '}
                        <span className="italic">±CI shows the 95% confidence interval based on sample size.</span>
                    </p>
                </div>
            </div>

            {/* Model Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sortedModels.map((model) => {
                    const pct = (model.refusalRate * 100).toFixed(0);
                    const totalN = model.total ?? 0;
                    const [ciLo, ciHi] = wilsonCI(model.refusalRate * 100, totalN);
                    const ciMargin = ((ciHi - ciLo) / 2).toFixed(1);

                    const CardElement = (
                        <div
                            key={model.name}
                            className={`flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors ${onModelClick || !model.name ? 'cursor-pointer' : ''}`}
                            onClick={onModelClick ? () => onModelClick(model) : undefined}
                        >
                            {/* Provider Logo */}
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted/30 border border-border flex items-center justify-center overflow-hidden">
                                <Image
                                    src={getLogoUrl(model.name)}
                                    alt={getProviderName(model.name)}
                                    width={24}
                                    height={24}
                                    className="object-contain"
                                    unoptimized
                                />
                            </div>

                            {/* Model info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm text-foreground truncate">
                                    {model.displayName || model.name}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    {getProviderName(model.name)}
                                </p>
                            </div>

                            {/* Percentage + CI */}
                            <div className="flex-shrink-0 text-right">
                                <span className="text-lg font-black text-foreground">
                                    {pct}%
                                </span>
                                {totalN > 0 && (
                                    <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                                        ±{ciMargin}%
                                    </p>
                                )}
                            </div>
                        </div>
                    );

                    if (onModelClick) {
                        return CardElement;
                    }

                    return (
                        <Link key={model.name} href={`/models/${model.name}`} className="block">
                            {CardElement}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
