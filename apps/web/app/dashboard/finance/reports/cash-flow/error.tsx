'use client'

export default function CashFlowError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cash Flow Statement</h1>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
                <div className="flex items-center gap-3">
                    <div className="h-5 w-5 text-red-600 dark:text-red-400">⚠</div>
                    <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">
                            {error.message || 'An error occurred while loading the cash flow statement.'}
                        </p>
                        <button
                            onClick={reset}
                            className="mt-2 text-sm text-red-600 hover:text-red-800 underline dark:text-red-400"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
