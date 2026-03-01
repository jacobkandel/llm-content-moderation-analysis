import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';

export const metadata: Metadata = {
    alternates: {
        canonical: '/audit',
    },
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
    let seoText = '';
    try {
        const promptsPath = path.join(process.cwd(), 'public', 'prompts_list.json');
        const prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));
        // SSR the first 200 prompts for Googlebot to index
        const sample = prompts.slice(0, 200);
        seoText = sample.map((p: any) => p.text).join(' ');
    } catch {
        // Fallback silently if JSON missing during build
    }

    return (
        <>
            {seoText && (
                <div className="sr-only" aria-hidden="true">
                    <h2>Sample Validated Prompts for LLM Content Moderation</h2>
                    <p>{seoText}</p>
                </div>
            )}
            {children}
        </>
    );
}
