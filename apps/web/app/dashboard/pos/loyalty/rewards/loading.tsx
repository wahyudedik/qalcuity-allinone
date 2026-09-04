import { PageHeaderSkeleton } from '@/components/ui/loading-skeleton'

export default function LoyaltyRewardsLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="flex items-start gap-3">
                            <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
                            <div className="flex-1">
                                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                                <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mt-1" />
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-gray-50 p-3">
                                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse mt-1" />
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3">
                                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse mt-1" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
