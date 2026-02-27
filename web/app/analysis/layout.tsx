
import React, { Suspense } from 'react';
import { AnalysisProvider } from './AnalysisContext';
import FilterBar from '@/components/FilterBar';
import { LastUpdatedBadge } from '@/components/ui/LastUpdatedBadge';

// Analysis layout provides context + global filter bar
export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense>
            <AnalysisProvider>
                <div className="w-full">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-1 sticky top-14 z-30 bg-background/95 backdrop-blur shrink-0 py-2 border-b border-border shadow-sm">
                        <FilterBar />
                        <LastUpdatedBadge />
                    </div>
                    {children}
                </div>
            </AnalysisProvider>
        </Suspense>
    );
}
