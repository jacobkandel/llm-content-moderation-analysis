
import React, { Suspense } from 'react';
import { AnalysisProvider } from './AnalysisContext';
import FilterBar from '@/components/FilterBar';
import { LastUpdatedBadge } from '@/components/ui/LastUpdatedBadge';

// Analysis layout provides context + global filter bar
export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
    // Preload the exact same-origin file that AnalysisContext/data-loading.ts actually
    // fetches, so the browser can warm the cache while React hydrates. Freshness is
    // handled by the file's Cache-Control header (see next.config.ts), so no cache-buster
    // query param is needed here — a build-time new Date() would freeze at deploy time
    // and defeat the purpose anyway.
    const preloadUrl = '/audit_log_lite.csv.gz';

    return (
        <Suspense>
            {/* Preload the lite CSV in the background as soon as this layout mounts */}
            <link rel="preload" href={preloadUrl} as="fetch" />
            <AnalysisProvider>
                <div className="w-full">
                    <div className="mb-8 sticky top-14 z-30 bg-card rounded-2xl border border-border shadow-sm px-4 py-3 flex items-start justify-between flex-col md:flex-row gap-4">
                        <div className="w-full md:w-auto flex-grow">
                            <FilterBar />
                        </div>
                        <div className="flex-shrink-0 self-start md:self-center">
                            <LastUpdatedBadge />
                        </div>
                    </div>
                    {children}
                </div>
            </AnalysisProvider>
        </Suspense>
    );
}
