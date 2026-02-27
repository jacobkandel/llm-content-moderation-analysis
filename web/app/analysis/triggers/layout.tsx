import type { Metadata } from 'next';

export const metadata: Metadata = {
    alternates: {
        canonical: '/analysis/triggers',
    },
    twitter: {
        card: 'summary_large_image',
    },
    title: 'Trigger Words | Moderation Bias',
    description: 'Analysis of which words and phrases most frequently trigger LLM content moderation. Identifies sensitive vocabulary patterns across models.',
    openGraph: {
        title: 'Trigger Words | Moderation Bias',
        description: 'Analysis of which words most frequently trigger LLM content moderation.',
    },
};

export default function TriggersLayout({ children }: { children: React.ReactNode }) {
    return children;
}
