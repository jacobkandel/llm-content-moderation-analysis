import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Annotate – Help Validate AI Moderation | Moderation Bias',
    description: 'Contribute to AI safety research by labeling content moderation decisions. Your human annotations help validate whether AI models align with human judgment on what content should be allowed or removed.',
    openGraph: {
        title: 'Help Validate AI Moderation Decisions',
        description: 'Contribute to AI safety research by labeling AI content moderation decisions. Your annotations help us measure how well AI aligns with human judgment.',
        url: 'https://moderationbias.com/annotate',
    },
};

export default function AnnotateLayout({ children }: { children: React.ReactNode }) {
    return children;
}
