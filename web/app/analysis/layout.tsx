'use client';

import React, { Suspense } from 'react';
import { AnalysisProvider } from './AnalysisContext';
import FilterBar from '@/components/FilterBar';

// Analysis layout provides context + global filter bar
export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense>
            <AnalysisProvider>
                <div className="w-full">
                    <FilterBar />
                    {children}
                </div>
            </AnalysisProvider>
        </Suspense>
    );
}
