import { PageHeaderSkeleton, LoadingSkeleton } from '@/components/ui/loading-skeleton';

export default function NewRecurringInvoiceLoading() {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />

            {/* Form skeleton - basic info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <div className="h-5 bg-gray-200 rounded w-48 animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                        <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-28 animate-pulse" />
                        <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                        <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
                        <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                        <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                </div>
            </div>

            {/* Items skeleton */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <div className="h-5 bg-gray-200 rounded w-32 animate-pulse" />
                <LoadingSkeleton lines={3} />
            </div>

            {/* Notes skeleton */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <div className="h-5 bg-gray-200 rounded w-20 animate-pulse" />
                <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
            </div>
        </div>
    );
}
