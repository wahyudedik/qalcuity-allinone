export default function DepartmentsLoading() {
    return (
        <div className="space-y-6 p-6">
            {/* Header skeleton */}
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse" />
            </div>

            {/* Stats skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
                            <div className="space-y-1">
                                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                                <div className="h-6 w-12 bg-gray-200 rounded animate-pulse" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search skeleton */}
            <div className="flex gap-4">
                <div className="h-10 flex-1 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
            </div>

            {/* Cards skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 animate-pulse">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 bg-gray-200 rounded-lg" />
                            <div className="h-5 w-32 bg-gray-200 rounded" />
                        </div>
                        <div className="h-3 w-48 bg-gray-200 rounded mb-3" />
                        <div className="flex justify-between pt-3 border-t border-gray-100">
                            <div className="h-4 w-20 bg-gray-200 rounded" />
                            <div className="h-4 w-16 bg-gray-200 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
