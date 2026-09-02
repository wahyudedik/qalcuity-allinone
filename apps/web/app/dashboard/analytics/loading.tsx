import { PageHeaderSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton'

export default function AnalyticsLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-28 animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                    >
                        <div className="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="mt-2 h-7 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="mt-2 h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <TableSkeleton rows={4} cols={4} />
                </div>
                <div className="h-64 animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="mt-4 space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
