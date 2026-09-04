import { StatsCardsSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton'

export default function LoyaltyDashboardLoading() {
    return (
        <div className="space-y-6">
            <StatsCardsSkeleton count={4} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                    <div className="mt-4 space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i}>
                                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                                <div className="mt-1 h-2 w-full bg-gray-200 rounded-full animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                    <div className="mt-4 space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                                <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                                <div className="flex-1">
                                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mt-1" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
