import { PageHeaderSkeleton, StatsCardsSkeleton } from '@/components/ui/loading-skeleton';

export default function TimesheetLoading() {
    return (
        <div className="space-y-6 p-6">
            <PageHeaderSkeleton />

            {/* View mode + navigation skeleton */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                    <div className="h-10 w-24 bg-gray-200 rounded-md animate-pulse" />
                    <div className="h-10 w-24 bg-gray-200 rounded-md animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-6 w-64 bg-gray-200 rounded animate-pulse" />
                    <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse" />
                </div>
            </div>

            {/* Summary cards skeleton */}
            <StatsCardsSkeleton count={4} />

            {/* Timesheet grid skeleton */}
            <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
        </div>
    );
}
