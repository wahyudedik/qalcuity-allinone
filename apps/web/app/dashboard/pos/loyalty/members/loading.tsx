import { PageHeaderSkeleton, FilterBarSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton'

export default function LoyaltyMembersLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <FilterBarSkeleton />
            <TableSkeleton rows={10} cols={7} />
        </div>
    )
}
