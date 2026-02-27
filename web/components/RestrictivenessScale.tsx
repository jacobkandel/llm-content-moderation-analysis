'use client';

import { getLogoUrl, getProviderName } from '@/lib/provider-logos';
import Link from 'next/link';

interface ModelData {
    name: string;
    refusalRate: number;
    cost: number;
    displayName?: string;
}

interface RestrictivenessScaleProps {
    models: ModelData[];
    onModelClick?: (model: ModelData) => void;
}

function getRateColor(rate: number): string {
    return 'hsl(var(--foreground))';
}

export default function RestrictivenessScale({ models, onModelClick }: RestrictivenessScaleProps) {
    const sortedModels = [...models].sort((a, b) => a.refusalRate - b.refusalRate);

    return (
        <div className="bg-card rounded-xl p-6 border border-border mb-8">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        Restrictiveness Spectrum
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Models ranked by refusal rate — least to most restrictive
                    </p>
                </div>
            </div>



            {/* Model Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sortedModels.map((model) => {
                    const pct = (model.refusalRate * 100).toFixed(0);

                    const CardElement = (
                        <div
                            key={model.name}
                            className={`flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors ${onModelClick || !model.name ? 'cursor-pointer' : ''}`}
                            onClick={onModelClick ? () => onModelClick(model) : undefined}
                        >
                            {/* Provider Logo */}
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted/30 border border-border flex items-center justify-center overflow-hidden">
                                <img
                                    src={getLogoUrl(model.name)}
                                    alt={getProviderName(model.name)}
                                    width={24}
                                    height={24}
                                    className="object-contain"
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

                            {/* Percentage */}
                            <div className="flex-shrink-0">
                                <span
                                    className="text-lg font-black"
                                    style={{ color: getRateColor(model.refusalRate) }}
                                >
                                    {pct}%
                                </span>
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
