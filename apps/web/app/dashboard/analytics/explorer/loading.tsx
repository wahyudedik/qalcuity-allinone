import { PageHeaderSkeleton } from '@/components/ui/loading-skeleton'

export default function ExplorerLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                <div className="lg:col-span-1 space-y-4">
                    <div className="h-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                    <div className="h-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                    <div className="h-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="lg:col-span-3">
                    <div className="h-96 animate-pulse rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
                </div>
            </div>
        </div>
    )
}
