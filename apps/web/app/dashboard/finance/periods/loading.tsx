export default function PeriodsLoading() {
    return (
        <div className="space-y-6 p-6">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
                    <div className="mt-2 h-4 w-64 animate-pulse rounded bg-gray-200" />
                </div>
                <div className="h-10 w-36 animate-pulse rounded-lg bg-gray-200" />
            </div>

            {/* Stats skeleton */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                        <div className="mt-2 h-6 w-16 animate-pulse rounded bg-gray-200" />
                    </div>
                ))}
            </div>

            {/* Table skeleton */}
            <div className="rounded-lg border border-gray-200 bg-white">
                <div className="p-4">
                    <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-200" />
                </div>
                <div className="divide-y divide-gray-100">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-4 py-3">
                            <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
                            <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
                            <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
                            <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-gray-200" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
