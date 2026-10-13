'use client'

import { useEffect } from 'react'

export default function CommunityLoading() {
    useEffect(() => {
        // noop — loading fallback
    }, [])

    return (
        <div className="space-y-6 p-6" role="status" aria-live="polite">
            <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                    />
                ))}
            </div>
            <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
        </div>
    )
}
