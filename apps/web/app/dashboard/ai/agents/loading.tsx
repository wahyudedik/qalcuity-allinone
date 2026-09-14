import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

export default function AgentsLoading() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <LoadingSkeleton lines={1} />
                <LoadingSkeleton lines={1} />
            </div>

            {/* Agent Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        <div className="mb-4 flex items-center gap-3">
                            <LoadingSkeleton lines={1} />
                            <div>
                                <LoadingSkeleton lines={1} />
                                <LoadingSkeleton lines={1} />
                            </div>
                        </div>
                        <LoadingSkeleton lines={1} />
                        <div className="flex gap-2">
                            <LoadingSkeleton lines={1} />
                            <LoadingSkeleton lines={1} />
                            <LoadingSkeleton lines={1} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Query Input */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <LoadingSkeleton lines={1} />
                <div className="flex gap-3">
                    <LoadingSkeleton lines={1} />
                    <LoadingSkeleton lines={1} />
                </div>
            </div>
        </div>
    );
}
