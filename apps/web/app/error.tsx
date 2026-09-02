'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log error to monitoring service
        console.error('Application error:', error)
    }, [error])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="text-center max-w-md">
                {/* Illustration */}
                <div className="mb-8">
                    <div className="relative inline-block">
                        <div className="text-9xl font-bold text-red-600/20">500</div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <AlertTriangle className="w-24 h-24 text-red-600" />
                        </div>
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    Terjadi Kesalahan
                </h1>
                <p className="text-gray-600 mb-8">
                    Maaf, terjadi kesalahan yang tidak terduga. Tim kami telah diberitahu dan sedang menangani masalah ini.
                </p>

                {error.digest && (
                    <div className="mb-6 p-4 bg-gray-100 rounded-lg">
                        <p className="text-sm text-gray-600">
                            Error ID: <code className="font-mono text-gray-800">{error.digest}</code>
                        </p>
                    </div>
                )}

                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={reset}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        Coba Lagi
                    </button>
                    <a
                        href="/"
                        className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                        Kembali ke Beranda
                    </a>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                        Masalah berlanjut?{' '}
                        <a
                            href="mailto:support@qalcuity.com"
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Hubungi Support
                        </a>
                        {' '}atau kunjungi{' '}
                        <a
                            href="https://status.qalcuity.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Status Page
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}
