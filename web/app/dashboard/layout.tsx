import type { Metadata } from 'next';

export const metadata: Metadata = {
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
