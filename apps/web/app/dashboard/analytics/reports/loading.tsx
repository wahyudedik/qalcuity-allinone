import { PageHeaderSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton'

export default function ReportsLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-8 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"
                    />
                ))}
            </div>
            <TableSkeleton rows={4} cols={5} />
        </div>
    )
}
