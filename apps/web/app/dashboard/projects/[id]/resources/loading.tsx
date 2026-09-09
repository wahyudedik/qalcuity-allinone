export default function ProjectResourcesLoading() {
    return (
        <div className="space-y-6">
            {/* Back button skeleton */}
            <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse" />

            {/* Header skeleton */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-8 w-56 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="flex gap-3">
                    <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
                </div>
            </div>

            {/* Stats cards skeleton */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse mt-2" />
                        <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mt-2" />
                    </div>
                ))}
            </div>

            {/* Resource list skeleton */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="divide-y divide-gray-100">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-4 px-4 py-3">
                            <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
                            <div className="flex-1 space-y-1">
                                <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
                                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                            </div>
                            <div className="h-8 w-20 bg-gray-200 rounded-full animate-pulse" />
                            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
