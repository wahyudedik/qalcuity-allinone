/**
 * Kitchen Display System — Loading State
 *
 * Skeleton loading untuk kitchen display page.
 * Grid 6 cards dengan shimmer effect.
 *
 * Ref: plans/pos-kitchen-display-architecture.md Section 5.3
 */

export default function KitchenLoading() {
    return (
        <div className="space-y-4">
            {/* Header skeleton */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-200 rounded-xl animate-pulse" />
                    <div>
                        <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-9 w-24 bg-gray-200 rounded-lg animate-pulse" />
                </div>
            </div>

            {/* Stats bar skeleton */}
            <div className="flex gap-3">
                <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-8 w-20 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-8 w-20 bg-gray-200 rounded-lg animate-pulse" />
            </div>

            {/* Filter bar skeleton */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-9 w-20 bg-gray-200 rounded-md animate-pulse" />
                    ))}
                </div>
                <div className="h-9 w-40 bg-gray-200 rounded-lg animate-pulse" />
            </div>

            {/* Card grid skeleton */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-xl border-2 border-gray-200 bg-white p-4 animate-pulse"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="space-y-2">
                                <div className="h-6 w-24 bg-gray-200 rounded" />
                                <div className="h-3 w-32 bg-gray-200 rounded" />
                            </div>
                            <div className="h-6 w-20 bg-gray-200 rounded-full" />
                        </div>

                        {/* Items */}
                        <div className="space-y-2 mb-3">
                            <div className="h-4 w-full bg-gray-200 rounded" />
                            <div className="h-4 w-3/4 bg-gray-200 rounded" />
                            <div className="h-4 w-1/2 bg-gray-200 rounded" />
                        </div>

                        {/* Timer */}
                        <div className="h-8 w-24 bg-gray-200 rounded mb-3" />

                        {/* Button */}
                        <div className="h-10 w-full bg-gray-200 rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    );
}
