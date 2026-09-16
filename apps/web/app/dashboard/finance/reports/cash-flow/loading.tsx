export default function CashFlowLoading() {
    return (
        <div className="space-y-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" />
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, j) => (
                            <div key={j} className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                        ))}
                    </div>
                </div>
            ))}
            <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-6 dark:border-gray-600 dark:bg-gray-800/50">
                <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-5 w-full bg-gray-200 rounded animate-pulse" />
                    ))}
                </div>
            </div>
        </div>
    )
}
