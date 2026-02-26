import type { Metadata } from 'next';

export const metadata: Metadata = {
    twitter: {
        card: 'summary_large_image',
    },
    title: 'Model Consensus | Moderation Bias',
    description: 'Consensus analysis showing agreement rates between LLMs on content moderation. Highlights universal vs. controversial content decisions.',
    openGraph: {
        title: 'Model Consensus | Moderation Bias',
        description: 'Consensus analysis showing agreement rates between LLMs on moderation.',
    },
};

export default function ConsensusLayout({ children }: { children: React.ReactNode }) {
    return children;
}
