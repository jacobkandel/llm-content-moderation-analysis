'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

export function LastUpdatedBadge() {
    const [date, setDate] = useState<string | null>(null);

    useEffect(() => {
        fetch('/summary_stats.json')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.lastUpdated) {
                    const d = new Date(data.lastUpdated);
                    setDate(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
                }
            })
            .catch(() => { });
    }, []);

    if (!date) return null;

    return (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 border border-border px-2.5 py-1 rounded-full">
            <Clock className="h-3 w-3" />
            Data updated {date}
        </span>
    );
}
