export default function DepartmentDetailLoading() {
    return (
        <div className="space-y-6 p-6">
            {/* Back button skeleton */}
            <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse" />

            {/* Header skeleton */}
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                        <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
                    </div>
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
            </div>

            {/* Content skeleton */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4" />
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex justify-between">
                                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="h-4 flex-1 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4" />
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex justify-between">
                                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
