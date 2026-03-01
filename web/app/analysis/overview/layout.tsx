import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'AI Overview | Moderation Bias',
    description: 'Weekly automated AI Analyst report synthesizing the latest findings, reliability scores, and safety anomalies across all tested LLMs.',
    openGraph: {
        title: 'AI Overview | Moderation Bias',
        description: 'Weekly automated AI Analyst report synthesizing the latest findings, reliability scores, and safety anomalies across all tested LLMs.',
        url: 'https://moderationbias.com/analysis/overview',
    },
};

export default function OverviewLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
