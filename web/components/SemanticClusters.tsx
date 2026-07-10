'use client';

import React from 'react';
import type { Cluster } from '@/app/analysis/AnalysisContext';

// Monochrome shades for clusters
// UChicago Palette: Maroon, Dark Greystone, Goldenrod, Brick, Lake, Forest
const UCHICAGO_PALETTE = [
    '#800000', // Maroon
    '#737373', // Dark Greystone
    '#EAAA00', // Goldenrod
    '#A4343A', // Brick
    '#007396', // Lake
    '#275D38', // Forest
];

export function SemanticClustersView({ clusters }: { clusters: Cluster[] }) {
    if (clusters.length === 0) return <div className="p-8 text-center text-muted-foreground">No cluster data available.</div>;
    return (
        <div className="space-y-6">
            <div className="bg-muted border-l-4 border-foreground p-4 rounded-r-lg shadow-sm text-sm text-foreground leading-relaxed">
                <strong>Semantic Clusters.</strong> Groups common refusal themes.
            </div>
            <div className="space-y-4">
                {clusters.map((c, idx) => {
                    // Handle RetryError gracefully
                    const isError = c.exemplar && c.exemplar.includes('RetryError');
                    const displayExemplar = isError
                        ? `Example: ${c.keywords[0]} related content`
                        : c.exemplar;

                    // Title capitalization
                    const firstKeyword = c.keywords[0] ? c.keywords[0].charAt(0).toUpperCase() + c.keywords[0].slice(1) : '';
                    const remainingKeywords = c.keywords.slice(1, 5);
                    const titleParts = [firstKeyword, ...remainingKeywords].filter(Boolean);
                    const clusterTitle = titleParts.join(', ');

                    return (
                        <div key={idx} className="bg-card p-4 rounded-xl border border-border flex gap-4 hover:bg-accent/50 transition-colors">
                            <div className="w-2 rounded-full shrink-0" style={{ backgroundColor: UCHICAGO_PALETTE[idx % UCHICAGO_PALETTE.length] }}></div>
                            <div>
                                <h3 className="font-bold text-foreground text-lg mb-2">{clusterTitle} ({c.size} cases)</h3>
                                <p className="text-sm italic text-muted-foreground bg-muted/30 p-2 rounded">
                                    &quot;{displayExemplar}&quot;
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
