export default function InboxLoading() {
    return (
        <div className="space-y-6 p-6">
            {/* Header skeleton */}
            <div>
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
            </div>
            {/* Summary cards skeleton */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse" />
                            <div className="flex-1">
                                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-2" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {/* Sections skeleton */}
            {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4" />
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, j) => (
                            <div key={j} className="h-16 bg-gray-100 rounded-lg animate-pulse dark:bg-gray-700" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
