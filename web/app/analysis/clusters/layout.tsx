import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Behavior Clusters — Moderation Bias',
    description: 'Cluster analysis grouping LLMs by similar content moderation behavior. Reveals which models share censorship strategies and policy approaches.',
    openGraph: {
        title: 'Behavior Clusters — Moderation Bias',
        description: 'Cluster analysis grouping LLMs by similar moderation behavior.',
    },
};

export default function ClustersLayout({ children }: { children: React.ReactNode }) {
    return children;
}
