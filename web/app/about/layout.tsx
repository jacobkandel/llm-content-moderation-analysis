import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'About — Moderation Bias',
    description: 'Learn about the methodology behind Moderation Bias, how prompts were selected, and why this platform exists.',
    openGraph: {
        title: 'About — Moderation Bias',
        description: 'Learn about the methodology behind Moderation Bias.',
    },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
    return children;
}
