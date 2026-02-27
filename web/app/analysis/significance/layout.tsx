import type { Metadata } from 'next';

export const metadata: Metadata = {
    alternates: {
        canonical: '/analysis/significance',
    },
    twitter: {
        card: 'summary_large_image',
    },
    title: 'Statistical Significance | Moderation Bias',
    description: 'Pairwise statistical significance tests between LLM moderation behaviors. Fisher exact tests and p-value matrices for rigorous model comparison.',
    openGraph: {
        title: 'Statistical Significance | Moderation Bias',
        description: 'Pairwise statistical significance tests between LLM moderation behaviors.',
            images: ['/assets/significance.png'],
    },
};

export default function SignificanceLayout({ children }: { children: React.ReactNode }) {
    return children;
}
