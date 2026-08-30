import { PageHeaderSkeleton, StatsCardsSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton';

export default function CrmLoading() {
    return (
        <div className="space-y-6 p-6">
            <PageHeaderSkeleton />
            <StatsCardsSkeleton count={4} />
            <TableSkeleton rows={5} cols={6} />
        </div>
    );
}
