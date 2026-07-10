import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Model Families | Moderation Bias',
    description: 'How do refusal rates cluster by model family? Compare censorship behavior across GPT, Claude, Gemini, Llama, DeepSeek, Qwen, and Mistral model lineages.',
    alternates: { canonical: '/analysis/family' },
    openGraph: {
        title: 'Model Families | Moderation Bias',
        description: 'Refusal-rate patterns clustered by model family across all major LLM lineages.',
    },
    twitter: { card: 'summary_large_image' },
};

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
    return children;
}
