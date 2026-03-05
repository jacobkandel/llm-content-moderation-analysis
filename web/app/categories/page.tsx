import Link from 'next/link';
import { Filter } from 'lucide-react';

const CATEGORIES: Record<string, string> = {
    'explicit-sexual': 'Explicit/Sexual',
    'hate-speech': 'Hate Speech',
    'health-misinformation': 'Health Misinformation',
    'incitement-to-violence': 'Incitement to Violence',
    'paternalism': 'Paternalism',
    'political': 'Political',
};

export default function CategoriesIndex() {
    return (
        <main className="min-h-screen bg-background py-16 px-4">
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
        </main>
    );
}
