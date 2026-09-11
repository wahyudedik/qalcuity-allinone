import { PageHeaderSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton'

export default function TrialBalanceLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <TableSkeleton rows={10} cols={6} />
            </div>
        </div>
    )
}
