import { PageHeaderSkeleton, StatsCardsSkeleton } from '@/components/ui/loading-skeleton'

export default function POSReportsLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <StatsCardsSkeleton count={4} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
                <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
            </div>
        </div>
    )
}
