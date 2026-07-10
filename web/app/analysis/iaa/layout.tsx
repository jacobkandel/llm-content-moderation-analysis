import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Inter-Annotator Agreement | Moderation Bias',
    description: 'How much do human annotators agree with each other — and with the models — on moderation verdicts? Krippendorff’s Alpha, Cohen’s Kappa, and per-category agreement.',
    alternates: { canonical: '/analysis/iaa' },
    openGraph: {
        title: 'Inter-Annotator Agreement | Moderation Bias',
        description: 'Human inter-annotator agreement (Krippendorff’s Alpha, Cohen’s Kappa) on moderation verdicts.',
    },
    twitter: { card: 'summary_large_image' },
};

export default function IaaLayout({ children }: { children: React.ReactNode }) {
    return children;
}
