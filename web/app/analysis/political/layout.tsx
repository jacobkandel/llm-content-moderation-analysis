import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Political Bias — Moderation Bias',
    description: 'Political compass analysis of LLM content moderation. Maps model censorship patterns along political dimensions to reveal ideological biases.',
    openGraph: {
        title: 'Political Bias — Moderation Bias',
        description: 'Political compass analysis of LLM content moderation patterns.',
    },
};

export default function PoliticalLayout({ children }: { children: React.ReactNode }) {
    return children;
}
