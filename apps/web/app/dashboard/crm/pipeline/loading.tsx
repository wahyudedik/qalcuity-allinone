import { PageHeaderSkeleton } from '@/components/ui/loading-skeleton'

export default function PipelineLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            {/* Kanban board skeleton */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {['Discovery', 'Proposal', 'Negosiasi', 'Closing'].map((stage) => (
                    <div key={stage} className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-4" />
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                                    <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-2" />
                                    <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
