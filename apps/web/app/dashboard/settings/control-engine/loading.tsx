export default function ControlEngineLoading() {
    return (
        <div className="space-y-6">
            {/* Header skeleton */}
            <div>
                <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-96 mt-2 animate-pulse"></div>
            </div>

            {/* Tabs skeleton */}
            <div className="flex gap-2 border-b border-gray-200 pb-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
                ))}
            </div>

            {/* Content skeleton */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                                <div className="h-5 bg-gray-200 rounded w-48 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 rounded w-72 mt-2 animate-pulse"></div>
                            </div>
                            <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
