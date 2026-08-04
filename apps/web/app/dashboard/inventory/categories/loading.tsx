import { PageHeaderSkeleton, CardGridSkeleton } from '@/components/ui/loading-skeleton'

export default function CategoriesLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />
            <CardGridSkeleton count={8} cols={4} />
        </div>
    )
}
