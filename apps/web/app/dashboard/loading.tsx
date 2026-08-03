export default function DashboardLoading() {
    return (
        <div className="p-6 space-y-6">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
                </div>
                <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
            </div>

            {/* Stats grid skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-3 flex-1">
                                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                                <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
                                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                            </div>
                            <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Content grid skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart skeleton */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                    <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-6" />
                    <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
                </div>

                {/* Activity skeleton */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="h-6 w-36 bg-gray-200 rounded animate-pulse mb-6" />
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                                    <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick actions skeleton */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-6" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col items-center p-4 border border-gray-200 rounded-xl">
                            <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse mb-3" />
                            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
