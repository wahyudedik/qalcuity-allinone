'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function SessionsError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">Sesi Perangkat</h2>
                <p className="text-sm text-gray-600 mt-1">Kelola sesi login aktif di berbagai perangkat</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">Terjadi kesalahan</h3>
                <p className="text-sm text-gray-500 mb-4 text-center max-w-md">
                    {error.message || 'Gagal memuat data sesi. Silakan coba lagi.'}
                </p>
                <button
                    onClick={reset}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Coba Lagi
                </button>
            </div>
        </div>
    )
}
