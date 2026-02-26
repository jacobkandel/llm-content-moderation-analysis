import type { Metadata } from 'next';

export const metadata: Metadata = {
    twitter: {
        card: 'summary_large_image',
    },
    title: 'Statistical Significance | Moderation Bias',
    description: 'Pairwise statistical significance tests between LLM moderation behaviors. Fisher exact tests and p-value matrices for rigorous model comparison.',
    openGraph: {
        title: 'Statistical Significance | Moderation Bias',
        description: 'Pairwise statistical significance tests between LLM moderation behaviors.',
    },
};

export default function SignificanceLayout({ children }: { children: React.ReactNode }) {
    return children;
}
