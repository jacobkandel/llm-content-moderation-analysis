import type { Metadata } from 'next';

export const metadata: Metadata = {
    twitter: {
        card: 'summary_large_image',
    },
    title: 'Longitudinal Trends | Moderation Bias',
    description: 'Longitudinal tracking of LLM moderation behavior over time. Charts showing how each model\'s refusal rates evolve across audit runs.',
    openGraph: {
        title: 'Longitudinal Trends | Moderation Bias',
        description: 'Longitudinal tracking of LLM moderation behavior over time.',
    },
};

export default function LongitudinalLayout({ children }: { children: React.ReactNode }) {
    return children;
}
