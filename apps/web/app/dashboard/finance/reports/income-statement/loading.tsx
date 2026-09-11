import { PageHeaderSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton'

export default function IncomeStatementLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="space-y-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i}>
                            <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-3" />
                            <TableSkeleton rows={3} cols={3} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
