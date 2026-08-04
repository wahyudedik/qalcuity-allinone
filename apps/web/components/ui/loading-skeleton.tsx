/**
 * Reusable loading skeleton components for all pages
 */

export function PageHeaderSkeleton() {
    return (
        <div className="flex items-center justify-between">
            <div>
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
            </div>
            <div className="flex gap-3">
                <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
            </div>
        </div>
    )
}

export function StatsCardsSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className={`grid grid-cols-1 gap-4 md:grid-cols-${count}`}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mt-2" />
                    <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mt-2" />
                </div>
            ))}
        </div>
    )
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            {Array.from({ length: cols }).map((_, i) => (
                                <th key={i} className="px-6 py-3">
                                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {Array.from({ length: rows }).map((_, i) => (
                            <tr key={i}>
                                {Array.from({ length: cols }).map((_, j) => (
                                    <td key={j} className="px-6 py-4">
                                        <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export function FilterBarSkeleton() {
    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="h-10 w-64 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
        </div>
    )
}

export function CardGridSkeleton({ count = 6, cols = 3 }: { count?: number; cols?: number }) {
    return (
        <div className={`grid grid-cols-1 gap-4 md:grid-cols-${cols}`}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2 flex-1">
                            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                        </div>
                        <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    )
}

export function PageLoadingSkeleton() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <StatsCardsSkeleton />
            <FilterBarSkeleton />
            <TableSkeleton />
        </div>
    )
}

export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-gray-200" style={{ width: `${70 + Math.random() * 30}%` }} />
            ))}
        </div>
    )
}
