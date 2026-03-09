
import React, { Suspense } from 'react';
import { AnalysisProvider } from './AnalysisContext';
import FilterBar from '@/components/FilterBar';
import { LastUpdatedBadge } from '@/components/ui/LastUpdatedBadge';

// Analysis layout provides context + global filter bar
export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
    // Determine today's cache version to match data-loading.ts
    const d = new Date();
    const cacheVersion = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const preloadUrl = `https://oeqbf51ent3zxva1.public.blob.vercel-storage.com/data/audit_log_lite.csv.gz?v=${cacheVersion}`;

    return (
        <Suspense>
            {/* Preload the lite CSV in the background as soon as this layout mounts */}
            <link rel="preload" href={preloadUrl} as="fetch" crossOrigin="anonymous" />
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
