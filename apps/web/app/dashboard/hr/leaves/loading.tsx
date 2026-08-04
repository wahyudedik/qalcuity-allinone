import { PageHeaderSkeleton, FilterBarSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton'

export default function LeavesLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <FilterBarSkeleton />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <TableSkeleton rows={6} cols={5} />
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4" />
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: 35 }).map((_, i) => (
                            <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
