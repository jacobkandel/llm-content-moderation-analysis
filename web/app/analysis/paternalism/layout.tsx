import type { Metadata } from 'next';

export const metadata: Metadata = {
    twitter: {
        card: 'summary_large_image',
    },
    title: 'Paternalism Index | Moderation Bias',
    description: 'Measures how paternalistically each LLM moderates content. Quantifies over-censorship of borderline or ambiguous prompts.',
    openGraph: {
        title: 'Paternalism Index | Moderation Bias',
        description: 'Measures how paternalistically each LLM moderates content.',
    },
};

export default function PaternalismLayout({ children }: { children: React.ReactNode }) {
    return children;
}
