import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Over-Refusal | Moderation Bias',
    description: 'Which models refuse benign prompts? Over-refusal (false-positive) rates measured against the benchmark’s False Positive Control prompts across every major LLM.',
    alternates: { canonical: '/analysis/overrefusal' },
    openGraph: {
        title: 'Over-Refusal | Moderation Bias',
        description: 'Over-refusal (false-positive) rates on benign prompts across every major LLM.',
    },
    twitter: { card: 'summary_large_image' },
};

export default function OverrefusalLayout({ children }: { children: React.ReactNode }) {
    return children;
}
