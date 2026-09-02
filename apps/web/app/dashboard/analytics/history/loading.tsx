import { PageHeaderSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton'

export default function HistoryLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            {/* Stats cards skeleton */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-20 animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                    >
                        <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="mt-2 h-6 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                ))}
            </div>
            {/* Filter pills skeleton */}
            <div className="flex items-center gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"
                        style={{ width: `${60 + Math.random() * 40}px` }}
                    />
                ))}
            </div>
            {/* Table skeleton */}
            <TableSkeleton rows={6} cols={5} />
            {/* Pagination skeleton */}
            <div className="flex items-center justify-between">
                <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="flex gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="h-8 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
