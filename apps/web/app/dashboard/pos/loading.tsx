import { PageHeaderSkeleton, StatsCardsSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton';

export default function PosLoading() {
    return (
        <div className="space-y-6 p-6">
            <PageHeaderSkeleton />

            {/* Stats cards — revenue, transactions, average order, pending */}
            <StatsCardsSkeleton count={4} />

            {/* Quick action cards — Terminal, Kitchen, Tables, Reports */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-24 animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                <div className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent transactions table */}
            <TableSkeleton rows={5} cols={6} />
        </div>
    );
}
