'use client'

import { useEffect } from 'react'

interface ErrorBoundaryProps {
    error: Error & { digest?: string }
    reset: () => void
    title?: string
    description?: string
}

export function ModuleError({ error, reset, title, description }: ErrorBoundaryProps) {
    useEffect(() => {
        console.error('Module error:', error)
    }, [error])

    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">
                {title || 'Terjadi Kesalahan'}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-500">
                {description || 'Maaf, terjadi kesalahan saat memuat data. Silakan coba lagi.'}
            </p>
            {error.digest && (
                <p className="mt-2 text-xs text-gray-400">Error ID: {error.digest}</p>
            )}
            <button
                onClick={reset}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Coba Lagi
            </button>
        </div>
    )
}
