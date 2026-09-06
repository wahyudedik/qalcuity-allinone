/**
 * Skeleton loading untuk POS Analytics page.
 * Stats cards + chart skeletons + heatmap skeleton.
 */
import { PageHeaderSkeleton, StatsCardsSkeleton } from '@/components/ui/loading-skeleton'

export default function POSAnalyticsLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />

            {/* Date range skeleton */}
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="flex gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-6 w-16 bg-gray-200 rounded-lg animate-pulse" />
                    ))}
                </div>
                <div className="flex gap-2">
                    <div className="h-8 w-28 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 w-28 bg-gray-200 rounded animate-pulse" />
                </div>
            </div>

            {/* Chart skeletons */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Sales chart — full width */}
                <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 space-y-4">
                    <div className="flex justify-between">
                        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                        <div className="flex gap-2">
                            <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" />
                            <div className="h-7 w-20 bg-gray-200 rounded animate-pulse" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="h-20 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="h-20 bg-gray-200 rounded-lg animate-pulse" />
                    </div>
                    <div className="h-56 bg-gray-200 rounded-xl animate-pulse" />
                </div>

                {/* Top products */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 space-y-3">
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="h-5 w-6 bg-gray-200 rounded animate-pulse" />
                            <div className="h-5 flex-1 bg-gray-200 rounded animate-pulse" />
                            <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
                        </div>
                    ))}
                </div>

                {/* Customer insights */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 space-y-3">
                    <div className="h-5 w-36 bg-gray-200 rounded animate-pulse" />
                    <div className="grid grid-cols-2 gap-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
                        ))}
                    </div>
                    <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
                </div>

                {/* Heatmap — full width */}
                <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 space-y-3">
                    <div className="flex justify-between">
                        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                        <div className="h-6 w-28 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="flex gap-3">
                        <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
                    </div>
                    <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
                </div>
            </div>
        </div>
    )
}
