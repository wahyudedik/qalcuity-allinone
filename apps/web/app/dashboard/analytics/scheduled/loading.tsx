import { PageHeaderSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton'

export default function ScheduledLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            {/* Stats cards skeleton */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-24 animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                    >
                        <div className="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="mt-2 h-7 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                ))}
            </div>
            {/* Filter pills skeleton */}
            <div className="flex items-center gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"
                        style={{ width: `${60 + Math.random() * 40}px` }}
                    />
                ))}
            </div>
            {/* Table skeleton */}
            <TableSkeleton rows={4} cols={5} />
        </div>
    )
}
