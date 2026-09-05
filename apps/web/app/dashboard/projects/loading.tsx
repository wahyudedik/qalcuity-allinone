import { PageHeaderSkeleton, CardGridSkeleton } from '@/components/ui/loading-skeleton';

export default function ProjectsLoading() {
    return (
        <div className="space-y-6 p-6">
            <PageHeaderSkeleton />
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 w-24 bg-gray-200 rounded-md animate-pulse" />
                ))}
            </div>
            <CardGridSkeleton count={6} cols={3} />
        </div>
    );
}
