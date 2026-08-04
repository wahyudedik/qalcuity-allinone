import { PageHeaderSkeleton, FilterBarSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton'

export default function PurchaseOrdersLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <FilterBarSkeleton />
            <TableSkeleton rows={6} cols={7} />
        </div>
    )
}
