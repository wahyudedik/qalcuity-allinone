export default function CommunityEventDetailLoading() {
    return (
        <div className="space-y-6 p-6" aria-busy="true" aria-label="Loading">
            <div className="flex items-center gap-3">
                <div className="h-9 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-1">
                    <div className="h-3 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-6 w-56 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-4 h-5 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                            <div className="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-4 h-5 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                    ))}
                </div>
            </div>
            <div className="h-40 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
        </div>
    )
}
