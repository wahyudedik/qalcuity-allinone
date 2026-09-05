export default function ProjectDetailLoading() {
    return (
        <div className="space-y-6 p-6">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
                    <div>
                        <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mt-2" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-10 w-16 bg-gray-200 rounded-lg animate-pulse" />
                </div>
            </div>

            {/* Tabs skeleton */}
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 w-28 bg-gray-200 rounded-md animate-pulse" />
                ))}
            </div>

            {/* Content skeleton */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
                <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
            </div>
        </div>
    );
}
