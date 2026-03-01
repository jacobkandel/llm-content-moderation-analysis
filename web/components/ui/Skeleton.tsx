import { clsx } from 'clsx';
import { CSSProperties } from 'react';

interface SkeletonProps {
    className?: string;
    style?: CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
    return (
        <div
            className={clsx(
                'animate-pulse rounded-md bg-muted dark:bg-muted',
                className
            )}
            style={style}
        />
    );
}

export function SkeletonCard() {
    return (
        <div className="rounded-lg border border-border dark:border-border bg-card dark:bg-card p-6 space-y-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-3 w-1/4" />
        </div>
    );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
    return (
        <div className="rounded-lg border border-border dark:border-border overflow-hidden">
            {/* Header */}
            <div className="bg-muted/30 dark:bg-card p-4 flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 flex-1" />
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="p-4 flex gap-4 border-t border-border/50 dark:border-border">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 flex-1" />
                </div>
            ))}
        </div>
    );
}

export function SkeletonChart() {
    return (
        <div className="rounded-lg border border-border dark:border-border bg-card dark:bg-card p-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="flex items-end gap-2 h-48">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton
                        key={i}
                        className="flex-1"
                        style={{ height: `${Math.random() * 60 + 40}%` }}
                    />
                ))}
            </div>
        </div>
    );
}
