export default function PurchaseOrderDetailLoading() {
    return (
        <div className="space-y-6">
            {/* Back button skeleton */}
            <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse" />

            {/* Header skeleton */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-8 w-56 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="flex gap-3">
                        <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
                    </div>
                </div>
            </div>

            {/* Info grid skeleton */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    {/* Supplier & order info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4" />
                        <div className="grid grid-cols-2 gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
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
                        <div className="overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <th key={i} className="px-4 py-3">
                                                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {[1, 2, 3].map((i) => (
                                        <tr key={i}>
                                            {[1, 2, 3, 4, 5].map((j) => (
                                                <td key={j} className="px-4 py-3">
                                                    <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${60 + (i * j * 7) % 40}%` }} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Totals section */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-4" />
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex justify-between">
                                    <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                                </div>
                            ))}
                            <div className="border-t border-gray-200 pt-3">
                                <div className="flex justify-between">
                                    <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status & notes */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <div className="h-5 w-20 bg-gray-200 rounded animate-pulse mb-4" />
                        <div className="space-y-2">
                            <div className="h-8 w-32 bg-gray-200 rounded-full animate-pulse" />
                            <div className="h-4 w-full bg-gray-200 rounded animate-pulse mt-3" />
                            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <div className="h-5 w-20 bg-gray-200 rounded animate-pulse mb-4" />
                        <div className="space-y-2">
                            {[1, 2].map((i) => (
                                <div key={i} className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
