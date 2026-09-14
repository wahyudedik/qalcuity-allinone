import { Loader2 } from 'lucide-react'

export default function IndustrySettingsLoading() {
    return (
        <div className="space-y-6">
            {/* Header skeleton */}
            <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-96"></div>
            </div>

            {/* Stats skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                        <div className="flex items-center gap-3">
                            <div className="h-5 w-5 bg-gray-200 rounded"></div>
                            <div>
                                <div className="h-7 w-12 bg-gray-200 rounded mb-1"></div>
                                <div className="h-3 w-20 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pack grid skeleton */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="animate-pulse mb-4">
                    <div className="h-5 bg-gray-200 rounded w-48 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-80"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                        <div key={i} className="p-5 rounded-xl border-2 border-gray-200 animate-pulse">
                            <div className="flex items-start justify-between mb-3">
                                <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                            </div>
                            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-3/4 mb-3"></div>
                            <div className="flex gap-3">
                                <div className="h-3 bg-gray-200 rounded w-16"></div>
                                <div className="h-3 bg-gray-200 rounded w-20"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Loading indicator */}
            <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-gray-500">Memuat konfigurasi industri...</span>
            </div>
        </div>
    )
}
