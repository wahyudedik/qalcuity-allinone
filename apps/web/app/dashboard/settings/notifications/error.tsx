'use client'

import { AlertTriangle } from 'lucide-react'

export default function NotificationsError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="flex flex-col items-center text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Gagal Memuat Notifikasi
                </h3>
                <p className="text-gray-600 mb-4">
                    {error.message || 'Terjadi kesalahan saat memuat pengaturan notifikasi.'}
                </p>
                <button
                    onClick={reset}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Coba Lagi
                </button>
            </div>
        </div>
    )
}
