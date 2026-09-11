import { PageHeaderSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton'

export default function BalanceSheetLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" />
                    <TableSkeleton rows={3} cols={3} />
                </div>
            ))}
        </div>
    )
}
