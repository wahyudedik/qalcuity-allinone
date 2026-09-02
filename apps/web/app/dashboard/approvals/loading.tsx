export default function ApprovalsLoading() {
    return (
        <div className="space-y-6">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-72 bg-gray-200 rounded animate-pulse" />
                </div>
            </div>

            {/* Tabs skeleton */}
            <div className="flex space-x-1 border-b border-gray-200">
                <div className="h-10 w-36 bg-gray-200 rounded-t animate-pulse" />
                <div className="h-10 w-40 bg-gray-200 rounded-t animate-pulse" />
            </div>

            {/* Filter skeleton */}
            <div className="flex gap-3">
                <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-10 w-36 bg-gray-200 rounded animate-pulse" />
            </div>

            {/* Table skeleton - desktop */}
            <div className="hidden md:block space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 bg-white rounded-lg border">
                        <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 flex-1 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                    </div>
                ))}
            </div>

            {/* Cards skeleton - mobile */}
            <div className="md:hidden space-y-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 bg-white rounded-lg border space-y-3">
                        <div className="flex justify-between">
                            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                            <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                        </div>
                        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
                        <div className="flex gap-2">
                            <div className="h-8 flex-1 bg-gray-200 rounded animate-pulse" />
                            <div className="h-8 flex-1 bg-gray-200 rounded animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
