import { PageHeaderSkeleton, CardGridSkeleton } from '@/components/ui/loading-skeleton'

export default function ChartsLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            {/* Filter pills skeleton */}
            <div className="flex items-center gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"
                        style={{ width: `${60 + Math.random() * 40}px` }}
                    />
                ))}
            </div>
            {/* Chart cards skeleton */}
            <CardGridSkeleton count={6} />
        </div>
    )
}
