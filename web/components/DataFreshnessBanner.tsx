'use client';

import { AlertTriangle } from 'lucide-react';

interface DataFreshnessBannerProps {
    lastUpdated: string | null;
    staleThresholdDays?: number;
}

/**
 * Shows a warning banner when data hasn't been updated within staleThresholdDays.
 * Used to surface audit pipeline failures transparently to users.
 */
export default function DataFreshnessBanner({ lastUpdated, staleThresholdDays = 30 }: DataFreshnessBannerProps) {
    if (!lastUpdated) return null;

    const lastDate = new Date(lastUpdated);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < staleThresholdDays) return null;

    return (
        <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 dark:text-amber-400 mb-6"
        >
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
                <span className="font-semibold">Data may be stale.</span>{' '}
                Last audit run was <strong>{diffDays} days ago</strong> ({lastUpdated}).
                Models update silently — results may not reflect current behavior.
                Fresh audits are scheduled for the 1st and 15th of each month.
            </p>
        </div>
    );
}
