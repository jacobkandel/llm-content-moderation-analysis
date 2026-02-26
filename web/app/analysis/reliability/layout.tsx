import type { Metadata } from 'next';

export const metadata: Metadata = {
    twitter: {
        card: 'summary_large_image',
    },
    title: 'Reliability Scores | Moderation Bias',
    description: 'Reliability and consistency scores for each LLM. Measures how consistently models apply content moderation across repeated evaluations.',
    openGraph: {
        title: 'Reliability Scores | Moderation Bias',
        description: 'Reliability and consistency scores for each LLM in content moderation.',
    },
};

export default function ReliabilityLayout({ children }: { children: React.ReactNode }) {
    return children;
}
