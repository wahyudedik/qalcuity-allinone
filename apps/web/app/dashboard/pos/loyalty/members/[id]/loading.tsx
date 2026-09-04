import { StatsCardsSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton'

export default function LoyaltyMemberDetailLoading() {
    return (
        <div className="space-y-6">
            <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-start gap-4">
                    <div className="h-16 w-16 bg-gray-200 rounded-full animate-pulse" />
                    <div>
                        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mt-2" />
                        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mt-1" />
                    </div>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-4">
                    <div className="rounded-lg bg-gray-50 p-4">
                        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                        <div className="h-7 w-24 bg-gray-200 rounded animate-pulse mt-2" />
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4">
                        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                        <div className="h-7 w-24 bg-gray-200 rounded animate-pulse mt-2" />
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4">
                        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                        <div className="h-7 w-24 bg-gray-200 rounded animate-pulse mt-2" />
                    </div>
                </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="mt-4">
                    <TableSkeleton rows={5} cols={4} />
                </div>
            </div>
        </div>
    )
}
