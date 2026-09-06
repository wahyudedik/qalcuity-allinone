import { PageHeaderSkeleton } from '@/components/ui/loading-skeleton';

export default function FieldChecklistsLoading() {
    return (
        <div className="space-y-6 p-6">
            <PageHeaderSkeleton />
            <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 w-20 bg-gray-200 rounded-md animate-pulse" />
                ))}
            </div>
            <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
                ))}
            </div>
        </div>
    );
}
