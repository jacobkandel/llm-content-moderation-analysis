import { Suspense } from 'react';
import CompareContent from './CompareContent';
import { RefreshCw } from 'lucide-react';

export default function ComparePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="h-8 w-8 animate-spin text-[#800000]" />
                    <p className="text-muted-foreground animate-pulse">Initializing comparison tool...</p>
                </div>
            </div>
        }>
            <CompareContent />
        </Suspense>
    );
}
