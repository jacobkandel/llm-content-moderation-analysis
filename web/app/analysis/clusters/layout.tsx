import type { Metadata } from 'next';

export const metadata: Metadata = {
    alternates: {
        canonical: '/analysis/clusters',
    },
    twitter: {
        card: 'summary_large_image',
    },
    title: 'Behavior Clusters | Moderation Bias',
    description: 'Cluster analysis grouping LLMs by similar content moderation behavior. Reveals which models share censorship strategies and policy approaches.',
    openGraph: {
        title: 'Behavior Clusters | Moderation Bias',
        description: 'Cluster analysis grouping LLMs by similar moderation behavior.',
            images: ['/assets/clusters.png'],
    },
};

export default function ClustersLayout({ children }: { children: React.ReactNode }) {
    return children;
}
