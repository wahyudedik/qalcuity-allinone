import { PageHeaderSkeleton, StatsCardsSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton'

export default function KpiLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <StatsCardsSkeleton count={4} />
            <TableSkeleton rows={4} cols={5} />
        </div>
    )
}
