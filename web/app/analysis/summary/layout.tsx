import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Summary — Moderation Bias',
    description: 'High-level summary of LLM censorship patterns. Key metrics, refusal heatmap, and prompt source distribution across all evaluated models.',
    openGraph: {
        title: 'Summary — Moderation Bias',
        description: 'High-level summary of LLM censorship patterns across all evaluated models.',
    },
};

export default function SummaryLayout({ children }: { children: React.ReactNode }) {
    return children;
}
