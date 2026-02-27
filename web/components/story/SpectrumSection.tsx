'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { getLogoUrl, getProviderName } from '@/lib/provider-logos';
import { TooltipHover } from '@/components/ui/TooltipHover';

interface ModelData {
    name: string;
    rate: number;
    displayName: string;
}

interface SpectrumSectionProps {
    modelData: ModelData[];
}

// Rate coloring - now using the new semantic variables
function getRateColor(rate: number): string {
    if (rate > 30) return 'hsl(var(--refusal))';
    return 'hsl(var(--safe))';
}

/**
 * SpectrumSection - Dashboard story component showing the restrictiveness spectrum
 */
export function SpectrumSection({ modelData }: SpectrumSectionProps) {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"]
    });

    const scaleX = useTransform(scrollYProgress, [0.1, 0.4], [0, 1]);
    const sortedModels = [...modelData].sort((a, b) => a.rate - b.rate);

    return (
        <section ref={ref} className="min-h-screen bg-background py-20 md:py-32">
            <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.8 }}
                    className="mb-20"
                >
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
                        The Restrictiveness Spectrum
                    </h2>
                    <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl">
                        From permissive to restrictive—where does each AI model draw the line?
                    </p>
                </motion.div>

                {/* Animated spectrum bar */}
                <div className="mb-20">
                    <div className="relative h-4 bg-muted rounded-full overflow-hidden border border-border shadow-inner">
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--safe))] to-[hsl(var(--refusal))] origin-left"
                            initial={{ scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                        />
                    </div>
                    <div className="flex justify-between mt-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[hsl(var(--safe))]" />
                            Most Permissive
                        </span>
                        <span className="flex items-center gap-2">
                            Most Restrictive
                            <div className="w-2 h-2 rounded-full bg-[hsl(var(--refusal))]" />
                        </span>
                    </div>
                </div>

                {/* Model cards */}
                <div className="space-y-4">
                    {sortedModels.map((model, idx) => (
                        <motion.div
                            key={model.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.8 }}
                            transition={{ duration: 0.4, delay: idx * 0.05 }}
                            className="flex items-center gap-spacing-s bg-card p-spacing-s rounded-2xl border border-border hover:bg-muted/50 transition-all hover-lift shadow-sm group"
                        >
                            {/* Provider Logo */}
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-muted/20 border border-border flex items-center justify-center overflow-hidden">
                                <img
                                    src={getLogoUrl(model.name)}
                                    alt={getProviderName(model.name)}
                                    width={32}
                                    height={32}
                                    className="object-contain opacity-90"
                                />
                            </div>

                            {/* Model info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-lg text-foreground truncate">
                                    {model.displayName}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {getProviderName(model.name)}
                                </p>
                            </div>

                            {/* Percentage */}
                            <div className="flex-shrink-0 text-right min-w-[100px]">
                                <span
                                    className="text-3xl font-black tabular-nums transition-colors duration-500"
                                    style={{ color: getRateColor(model.rate) }}
                                >
                                    {model.rate}%
                                </span>
                                <TooltipHover
                                    label={<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Refusal Rate</p>}
                                    tooltipText="Percentage of prompts in our dataset that this model refused to answer. Higher = more restrictive."
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
