'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function CommunityAssetsError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // eslint-disable-next-line no-console
        console.error('[community-assets]', error)
    }, [error])

    return (
        <div className="p-6">
            <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20">
                <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Terjadi kesalahan</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Gagal memuat data aset komunitas. Silakan coba lagi.
                </p>
                <button
                    type="button"
                    onClick={reset}
                    className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                    Coba Lagi
                </button>
            </div>
        </div>
    )
}
