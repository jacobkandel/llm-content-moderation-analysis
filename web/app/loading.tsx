import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Page title skeleton */}
            <div className="space-y-3">
                <Skeleton className="h-9 w-64 rounded-lg" />
                <Skeleton className="h-5 w-96 rounded-md" />
            </div>

            {/* Content cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-32 rounded-2xl" />
                <Skeleton className="h-32 rounded-2xl" />
                <Skeleton className="h-32 rounded-2xl" />
            </div>

            {/* Main content skeleton */}
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
        </div>
    );
}
