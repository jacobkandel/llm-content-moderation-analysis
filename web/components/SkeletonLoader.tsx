'use client';

/**
 * SkeletonLoader — full-page loading state for analysis pages.
 * Renders a realistic card/chart layout structure while data is loading.
 *
 * For inline / ad-hoc skeleton primitives, use `@/components/ui/Skeleton` instead.
 */
export default function SkeletonLoader() {
    return (
        <div className="animate-pulse space-y-6">
            {/* Header skeleton */}
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-2/3" />

            {/* Metrics cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-card rounded-xl p-6 border border-border">
                        <div className="h-3 bg-muted rounded w-20 mb-4" />
                        <div className="h-8 bg-muted/70 rounded w-16 mb-2" />
                        <div className="h-3 bg-muted/50 rounded w-full" />
                    </div>
                ))}
            </div>

            {/* Spectrum skeleton */}
            <div className="bg-card rounded-xl p-6 border border-border mt-8">
                <div className="h-6 bg-muted rounded w-1/4 mb-4" />
                <div className="h-2 bg-muted rounded-full mb-8" />
                <div className="flex justify-between">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="w-12 h-12 bg-muted rounded-full" />
                    ))}
                </div>
            </div>

            {/* Content skeleton */}
            <div className="bg-card rounded-xl p-8 border border-border mt-8">
                <div className="space-y-4">
                    <div className="h-6 bg-muted rounded w-1/4" />
                    <div className="h-4 bg-muted/70 rounded w-full" />
                    <div className="h-4 bg-muted/70 rounded w-5/6" />
                    <div className="h-4 bg-muted/70 rounded w-4/6" />
                </div>

                <div className="mt-8 space-y-3">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="flex gap-2">
                        <div className="h-3 w-2 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded flex-1" />
                    </div>
                    <div className="flex gap-2">
                        <div className="h-3 w-2 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded flex-1" />
                    </div>
                    <div className="flex gap-2">
                        <div className="h-3 w-2 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded flex-1" />
                    </div>
                </div>
            </div>
        </div>
    );
}
