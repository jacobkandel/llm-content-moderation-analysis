'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function AnalysisError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Analysis page error:', error);
    }, [error]);

    return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center px-6 text-center">
            <div className="h-12 w-12 rounded-xl bg-brand/10 flex items-center justify-center mb-5">
                <AlertTriangle className="h-6 w-6 text-brand" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Analysis failed to load</h2>
            <p className="text-muted-foreground text-sm max-w-sm mb-6 leading-relaxed">
                There was a problem loading the analysis data. The underlying data may be updating — try again in a moment.
            </p>
            <div className="flex gap-3">
                <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 bg-brand text-white font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-brand-dark transition-all"
                >
                    <RefreshCw className="h-4 w-4" />
                    Try again
                </button>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 border border-border text-foreground font-medium text-sm px-5 py-2.5 rounded-lg hover:bg-muted/40 transition-all"
                >
                    Go home
                </Link>
            </div>
            {error.digest && (
                <p className="mt-5 text-xs text-muted-foreground font-mono">Error ID: {error.digest}</p>
            )}
        </div>
    );
}
