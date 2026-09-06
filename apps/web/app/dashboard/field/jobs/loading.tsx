import { PageHeaderSkeleton, CardGridSkeleton } from '@/components/ui/loading-skeleton';

export default function FieldJobsLoading() {
    return (
        <div className="space-y-6 p-6">
            <PageHeaderSkeleton />
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 w-24 bg-gray-200 rounded-md animate-pulse" />
                ))}
            </div>
            <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
            <CardGridSkeleton count={6} cols={3} />
        </div>
    );
}
