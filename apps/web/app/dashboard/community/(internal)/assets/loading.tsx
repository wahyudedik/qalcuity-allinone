export default function CommunityAssetsLoading() {
    return (
        <div className="space-y-6 p-6" aria-busy="true" aria-label="Loading">
            {/* Header */}
            <div>
                <div className="h-7 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mt-2 h-4 w-72 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                    >
                        <div className="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="mt-2 h-6 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                ))}
            </div>

            {/* Filter bar */}
            <div className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />

            {/* List rows */}
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"
                    />
                ))}
            </div>
        </div>
    )
}
