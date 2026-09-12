import { PageHeaderSkeleton, StatsCardsSkeleton } from '@/components/ui/loading-skeleton'

export default function RateLimitsLoading() {
    return (
        <div className="space-y-6">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                    <div>
                        <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2" />
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                    <div className="h-10 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                    <div className="h-10 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                </div>
            </div>

            {/* Stats cards skeleton */}
            <StatsCardsSkeleton count={4} />

            {/* Redis & realtime status skeleton */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            </div>

            {/* Recent hits table skeleton */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                    <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2" />
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-6 px-6 py-4">
                            <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Top offenders & routes skeleton */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                        <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between px-6 py-3">
                                <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between px-6 py-3">
                                <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Config table skeleton */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                    <div className="h-5 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2" />
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-6 px-6 py-3">
                            <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
