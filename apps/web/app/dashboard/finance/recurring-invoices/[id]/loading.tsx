export default function RecurringInvoiceDetailLoading() {
    return (
        <div className="space-y-6">
            {/* Header skeleton */}
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
                <div>
                    <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mt-2" />
                </div>
            </div>
            {/* Content skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
                    <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
                    <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
                </div>
                <div className="space-y-6">
                    <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
                    <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
                    <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
                </div>
            </div>
        </div>
    )
}
