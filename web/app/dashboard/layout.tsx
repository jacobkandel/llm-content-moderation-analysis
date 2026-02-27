import type { Metadata } from 'next';

export const metadata: Metadata = {
    alternates: {
        canonical: '/dashboard',
    },
    twitter: {
        card: 'summary_large_image',
    },
    title: 'Dashboard | Moderation Bias',
    description: 'Live overview of LLM content moderation behavior across models. View refusal rates, category breakdowns, and trend data at a glance.',
    openGraph: {
        title: 'Dashboard | Moderation Bias',
        description: 'Live overview of LLM content moderation behavior across models.',
    },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return children;
}
