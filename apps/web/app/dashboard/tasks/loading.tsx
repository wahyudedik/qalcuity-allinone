import { PageHeaderSkeleton } from '@/components/ui/loading-skeleton';

export default function TasksLoading() {
    return (
        <div className="space-y-6 p-6">
            <PageHeaderSkeleton />

            {/* Filter tabs skeleton */}
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 w-32 bg-gray-200 rounded-md animate-pulse" />
                ))}
            </div>

            {/* Controls skeleton */}
            <div className="flex gap-3">
                <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse" />
            </div>

            {/* Task list skeleton */}
            <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
            </div>
        </div>
    );
}
