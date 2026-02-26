import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Model Alignment | Moderation Bias',
    description: 'Cross-model alignment analysis showing where LLMs agree and disagree on content moderation decisions. Identifies consensus and outlier behaviors.',
    openGraph: {
        title: 'Model Alignment | Moderation Bias',
        description: 'Cross-model alignment analysis showing where LLMs agree and disagree.',
    },
};

export default function AlignmentLayout({ children }: { children: React.ReactNode }) {
    return children;
}
