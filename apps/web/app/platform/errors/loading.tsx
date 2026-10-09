import { PageHeaderSkeleton, StatsCardsSkeleton } from '@/components/ui/loading-skeleton'

export default function ErrorLogsLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <StatsCardsSkeleton />
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
    )
}
