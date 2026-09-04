import { PageHeaderSkeleton, FilterBarSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton'

export default function POSTerminalsLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <FilterBarSkeleton />
            <TableSkeleton rows={8} cols={5} />
        </div>
    )
}
