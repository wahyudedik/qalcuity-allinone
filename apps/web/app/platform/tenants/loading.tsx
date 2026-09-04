import { PageHeaderSkeleton, StatsCardsSkeleton } from '@/components/ui/loading-skeleton'

export default function TenantsLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <StatsCardsSkeleton />
            <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                ))}
            </div>
        </div>
    )
}
