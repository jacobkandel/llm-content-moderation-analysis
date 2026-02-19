import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Behavioral Drift — Moderation Bias',
    description: 'Track how LLM content moderation behavior changes over time. Detect model updates, policy shifts, and behavioral drift across audit runs.',
    openGraph: {
        title: 'Behavioral Drift — Moderation Bias',
        description: 'Track how LLM content moderation behavior changes over time.',
    },
};

export default function DriftLayout({ children }: { children: React.ReactNode }) {
    return children;
}
