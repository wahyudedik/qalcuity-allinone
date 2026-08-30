export default function EmployeeDetailLoading() {
    return (
        <div className="space-y-6">
            {/* Back button skeleton */}
            <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse" />

            {/* Header skeleton */}
            <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-gray-200 rounded-full animate-pulse" />
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                </div>
            </div>

            {/* Content skeleton */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    {/* Personal info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4" />
                        <div className="grid grid-cols-2 gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="space-y-1">
                                    <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Skills */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <div className="h-6 w-20 bg-gray-200 rounded animate-pulse mb-4" />
                        <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-8 w-24 bg-gray-200 rounded-full animate-pulse" />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    {/* Quick info sidebar */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-4" />
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="space-y-1">
                                    <div className="h-2 w-16 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Performance */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <div className="h-5 w-28 bg-gray-200 rounded animate-pulse mb-4" />
                        <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                            ))}
                        </div>
                    </div>
                    {/* Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <div className="h-5 w-20 bg-gray-200 rounded animate-pulse mb-4" />
                        <div className="space-y-2">
                            {[1, 2].map((i) => (
                                <div key={i} className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
