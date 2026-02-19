import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Compare Models — Moderation Bias',
    description: 'Compare content moderation behavior between any two LLMs side-by-side. View disagreements, refusal rate differences, and response comparisons.',
    openGraph: {
        title: 'Compare Models — Moderation Bias',
        description: 'Compare content moderation behavior between any two LLMs side-by-side.',
    },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
    return children;
}
