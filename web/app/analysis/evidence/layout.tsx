import type { Metadata } from 'next';

export const metadata: Metadata = {
    alternates: {
        canonical: '/analysis/evidence',
    },
    twitter: {
        card: 'summary_large_image',
    },
    title: 'Evidence Explorer | Moderation Bias',
    description: 'Explore the raw evidence behind LLM content moderation evaluations. View detailed prompt-response pairs with model verdicts.',
    openGraph: {
        title: 'Evidence Explorer | Moderation Bias',
        description: 'Explore the raw evidence behind LLM content moderation evaluations.',
    },
};

export default function EvidenceLayout({ children }: { children: React.ReactNode }) {
    return children;
}
