import { PageHeaderSkeleton } from '@/components/ui/loading-skeleton'

export default function FinanceReportsLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mt-4" />
                        <div className="h-4 w-56 bg-gray-200 rounded animate-pulse mt-2" />
                    </div>
                ))}
            </div>
        </div>
    )
}
