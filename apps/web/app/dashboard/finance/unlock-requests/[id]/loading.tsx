export default function UnlockRequestDetailLoading() {
    return (
        <div className="space-y-6 p-6">
            {/* Header skeleton */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                <div>
                    <div className="h-7 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="mt-1 h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                </div>
            </div>

            {/* Status + temporary unlock cards skeleton */}
            <div className="grid gap-4 md:grid-cols-2">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                        <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="mt-3 h-8 w-40 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
                        <div className="mt-4 space-y-2">
                            {[...Array(3)].map((_, j) => (
                                <div key={j} className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Target periods skeleton */}
            <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <div className="h-4 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/50">
                            <div className="h-4 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="mt-1 h-3 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Reason skeleton */}
            <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mt-3 space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    ))}
                </div>
            </div>
        </div>
    )
}
