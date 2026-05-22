'use client';

import { AnimatedCounter } from '@/components/AnimatedCounter';
import { BarChart2, Zap, RefreshCw } from 'lucide-react';

interface StatsGridProps {
    modelsCount: number;
    totalCases: number;
}

export function StatsGrid({ modelsCount, totalCases }: StatsGridProps) {
    const stats = [
        {
            icon: BarChart2,
            value: modelsCount,
            suffix: '+',
            label: 'Models Audited',
            desc: "GPT-4, Claude, Llama, Gemini, Grok, and more",
        },
        {
            icon: Zap,
            value: totalCases,
            label: 'Prompts Tested',
            desc: "Grounded in Wikipedia's controversial issues list",
        },
        {
            icon: RefreshCw,
            value: 0,
            textValue: 'Biweekly',
            label: 'Auto-Updates',
            desc: 'Scheduled GitHub Actions keep data fresh',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {stats.map(({ icon: Icon, value, suffix, textValue, label, desc }) => (
                <div
                    key={label}
                    className="flex flex-col items-center text-center p-6 rounded-2xl border border-border bg-card hover:border-brand/30 hover:shadow-md transition-all"
                >
                    <div className="h-12 w-12 rounded-xl bg-brand/10 flex items-center justify-center mb-4">
                        <Icon className="h-6 w-6 text-brand" />
                    </div>
                    <div className="text-3xl font-black text-foreground mb-1">
                        {textValue ? textValue : (
                            <AnimatedCounter
                                value={value}
                                suffix={suffix}
                                duration={1500}
                            />
                        )}
                    </div>
                    <div className="text-sm font-bold text-foreground mb-1">{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
            ))}
        </div>
    );
}
