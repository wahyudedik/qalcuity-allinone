import { RefreshCw } from "lucide-react";

export default function TenantDetailLoading() {
    return (
        <div className="space-y-6">
            {/* Back Link Skeleton */}
            <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />

            {/* Header Skeleton */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="h-7 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
                        </div>
                        <div className="mt-1 h-4 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="h-10 w-36 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                    <div className="h-10 w-28 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                    <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                </div>
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                            <div>
                                <div className="h-3 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                <div className="mt-1 h-5 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Two Column Layout Skeleton */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Tenant Info Skeleton */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <div className="h-5 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="flex items-center gap-4 px-6 py-3">
                                <div className="h-4 w-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                <div className="flex-1">
                                    <div className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                    <div className="mt-1 h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column Skeleton */}
                <div className="space-y-6">
                    {/* Users List Skeleton */}
                    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <div className="h-5 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center justify-between px-6 py-3">
                                    <div>
                                        <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                        <div className="mt-1 h-3 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                    </div>
                                    <div className="h-5 w-14 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Subscriptions Skeleton */}
                    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <div className="h-5 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                        <div className="p-6">
                            <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
