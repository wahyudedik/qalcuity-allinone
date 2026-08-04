import { PageHeaderSkeleton, FilterBarSkeleton, CardGridSkeleton } from '@/components/ui/loading-skeleton'

export default function QuotationsLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <FilterBarSkeleton />
            <CardGridSkeleton count={6} cols={3} />
        </div>
    )
}
