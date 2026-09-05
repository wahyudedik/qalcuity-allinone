/**
 * POS Table Management — Loading State
 *
 * Skeleton loading untuk table management page.
 * Grid cards dengan shimmer effect.
 */

export default function TablesLoading() {
    return (
        <div className="space-y-4">
            {/* Header skeleton */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-9 w-24 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-9 w-9 bg-gray-200 rounded-lg animate-pulse" />
                </div>
            </div>

            {/* Stats bar skeleton */}
            <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-8 w-28 bg-gray-200 rounded-lg animate-pulse" />
                ))}
            </div>

            {/* Filter bar skeleton */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex gap-0.5 rounded-lg bg-gray-100 p-0.5">
                        <div className="h-8 w-16 bg-gray-200 rounded-md animate-pulse" />
                        <div className="h-8 w-14 bg-gray-200 rounded-md animate-pulse" />
                    </div>
                    <div className="h-9 w-32 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-9 w-32 bg-gray-200 rounded-lg animate-pulse" />
                </div>
                <div className="h-9 w-48 bg-gray-200 rounded-lg animate-pulse" />
            </div>

            {/* Card grid skeleton */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4 space-y-3 animate-pulse"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-12 bg-gray-200 rounded" />
                                <div className="h-4 w-16 bg-gray-200 rounded" />
                            </div>
                            <div className="h-4 w-4 bg-gray-200 rounded" />
                        </div>
                        <div className="h-5 w-20 bg-gray-200 rounded-full" />
                        <div className="flex items-center gap-3">
                            <div className="h-4 w-8 bg-gray-200 rounded" />
                            <div className="h-4 w-16 bg-gray-200 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
