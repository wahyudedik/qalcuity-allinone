import { PageHeaderSkeleton, StatsCardsSkeleton, FilterBarSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton'

export default function EmployeesLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <StatsCardsSkeleton count={4} />
            <FilterBarSkeleton />
            <TableSkeleton rows={10} cols={7} />
        </div>
    )
}
