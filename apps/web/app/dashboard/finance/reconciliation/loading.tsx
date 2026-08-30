export default function ReconciliationLoading() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="mt-2 h-4 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="flex gap-2">
                    <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                    <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                </div>
            </div>

            {/* Bank Account Selection */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="h-5 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mt-4 h-12 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="mt-3 h-7 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="mt-2 h-3 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                ))}
            </div>

            {/* Status Overview */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                        <div className="h-5 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="mt-3 h-8 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                ))}
            </div>

            {/* Transaction Table */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                    <div className="h-10 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="space-y-4 p-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-4 flex-1 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-6 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
