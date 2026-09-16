export default function GeneralLedgerLoading() {
    return (
        <div className="space-y-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
            <div className="flex gap-4">
                <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="space-y-3">
                    <div className="grid grid-cols-8 gap-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
                        ))}
                    </div>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="grid grid-cols-8 gap-2">
                            {Array.from({ length: 8 }).map((_, j) => (
                                <div key={j} className="h-4 bg-gray-100 rounded animate-pulse" />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
