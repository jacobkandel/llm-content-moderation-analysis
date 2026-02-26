import type { Metadata } from 'next';

export const metadata: Metadata = {
    twitter: {
        card: 'summary_large_image',
    },
    title: 'Audit Log | Moderation Bias',
    description: 'Full searchable audit log of every LLM evaluation. Browse prompts, responses, and verdicts across all models and categories.',
    openGraph: {
        title: 'Audit Log | Moderation Bias',
        description: 'Full searchable audit log of every LLM evaluation.',
    },
};

export default function AuditLayout({ children }: { children: React.ReactNode }) {
    return children;
}
