import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: '404 — Page Not Found | Moderation Bias',
    description: 'The page you are looking for does not exist.',
    robots: { index: false, follow: false },
};

export default function NotFound() {
    return (
        <main className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
            <div className="h-1.5 w-16 bg-brand rounded-full mb-8" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">404</p>
            <h1 className="text-3xl md:text-4xl font-black text-foreground mb-4">Page Not Found</h1>
            <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
                The page you&apos;re looking for doesn&apos;t exist or may have moved.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
                <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 bg-brand text-white font-bold text-sm px-6 py-3 rounded-lg hover:bg-brand-dark transition-all hover:scale-105 active:scale-95"
                >
                    Back to Home
                </Link>
                <Link
                    href="/compare"
                    className="inline-flex items-center justify-center gap-2 border border-border text-foreground font-medium text-sm px-6 py-3 rounded-lg hover:bg-muted/40 transition-all"
                >
                    Compare Models
                </Link>
            </div>
        </main>
    );
}
