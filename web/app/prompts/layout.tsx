import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Prompt Explorer | Moderation Bias',
    description: 'Browse the full benchmark corpus of 2,300+ moderation prompts across 16 harm categories, and see how each major LLM responded — allowed or removed.',
    alternates: { canonical: '/prompts' },
    openGraph: {
        title: 'Prompt Explorer | Moderation Bias',
        description: 'Browse the full benchmark corpus of moderation prompts and how each LLM responded.',
    },
    twitter: { card: 'summary_large_image' },
};

export default function PromptsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
