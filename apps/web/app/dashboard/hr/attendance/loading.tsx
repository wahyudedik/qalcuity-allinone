import { PageHeaderSkeleton, StatsCardsSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton'

export default function AttendanceLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <StatsCardsSkeleton count={4} />
            <div className="space-y-6">
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
                    <TableSkeleton rows={8} cols={5} />
                </div>
            </div>
        </div>
    )
}
