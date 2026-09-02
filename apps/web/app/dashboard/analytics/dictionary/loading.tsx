import { PageHeaderSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton'

export default function DictionaryLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
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
            {/* Search bar skeleton */}
            <div className="h-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            {/* Dictionary entries skeleton */}
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className="animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-5 w-5 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="ml-auto h-5 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                        <div className="mt-2 h-3 w-72 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="mt-2 flex gap-4">
                            <div className="h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
