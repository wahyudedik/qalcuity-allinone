export default function AgingReportLoading() {
    return (
        <div className="p-6">
            <div className="animate-pulse space-y-6">
                {/* Header skeleton */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="h-8 w-72 rounded bg-gray-200" />
                        <div className="mt-2 h-4 w-48 rounded bg-gray-100" />
                    </div>
                </div>

                {/* Summary cards skeleton — AR */}
                <div>
                    <div className="mb-3 h-6 w-56 rounded bg-gray-200" />
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-24 rounded-lg bg-gray-100" />
                        ))}
                    </div>
                </div>

                {/* Summary cards skeleton — AP */}
                <div>
                    <div className="mb-3 h-6 w-56 rounded bg-gray-200" />
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-24 rounded-lg bg-gray-100" />
                        ))}
                    </div>
                </div>

                {/* Table skeleton */}
                <div className="h-64 rounded-lg bg-gray-100" />
                <div className="h-64 rounded-lg bg-gray-100" />
            </div>
        </div>
    );
}
