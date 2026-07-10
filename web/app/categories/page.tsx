import type { Metadata } from 'next';
import Link from 'next/link';
import { Filter } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';

export const metadata: Metadata = {
    title: 'Content Categories — ModerationBias',
    description: 'Browse the Moderation Bias benchmark by topic: hate speech, political content, weapons, self-harm, explicit content, and more. See how AI models handle each category.',
    alternates: { canonical: '/categories' },
    openGraph: {
        title: 'Content Categories — ModerationBias',
        description: 'Explore AI moderation rates by category: political, hate speech, self-harm, weapons, and more.',
        url: '/categories',
    },
    twitter: { card: 'summary_large_image', title: 'Content Categories — ModerationBias' },
};

export default function CategoriesIndex() {
    return (
        <div className="min-h-screen bg-background py-16 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-4xl font-bold mb-4 text-foreground flex items-center gap-3">
                        <Filter className="w-8 h-8 text-primary" />
                        Prompt Categories
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Browse our content moderation testing dataset by topic. Select a theme to view how different AI models handle these sensitive topics.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(CATEGORIES).map(([slug, label]) => (
                        <Link
                            key={slug}
                            href={`/categories/${slug}`}
                            className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/50 hover-lift transition-all group"
                        >
                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {label}
                            </span>
                            <span className="text-muted-foreground group-hover:translate-x-1 transition-transform">
                                →
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
