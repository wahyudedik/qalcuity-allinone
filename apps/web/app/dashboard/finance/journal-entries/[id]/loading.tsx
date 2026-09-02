export default function JournalEntryDetailLoading() {
    return (
        <div className="space-y-6 p-6">
            {/* Back button skeleton */}
            <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse" />

            {/* Header skeleton */}
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                        <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                    </div>
                    <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="flex gap-3">
                    <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
                </div>
            </div>

            {/* Entry info skeleton */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4" />
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="space-y-1">
                            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Items table skeleton */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4" />
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="h-4 flex-1 bg-gray-200 rounded animate-pulse" />
                            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
