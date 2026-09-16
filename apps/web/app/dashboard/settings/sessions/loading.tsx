'use client'

import { Loader2 } from 'lucide-react'

export default function SessionsLoading() {
    return (
        <div className="space-y-6">
            <div>
                <div className="h-7 bg-gray-200 rounded w-48 mb-2 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-80 animate-pulse" />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 animate-pulse">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-40" />
                            <div className="h-3 bg-gray-200 rounded w-60" />
                        </div>
                        <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    )
}
