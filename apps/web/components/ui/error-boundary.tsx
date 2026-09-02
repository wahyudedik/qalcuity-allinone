'use client'

import { useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
    error: Error & { digest?: string }
    reset: () => void
    title?: string
    description?: string
}

export function ModuleError({ error, reset, title, description }: ErrorBoundaryProps) {
    const { t } = useTranslation()

    useEffect(() => {
        console.error('Module error:', error)
    }, [error])

    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
                <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title || t('common.errorOccurred')}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                {description || t('common.errorDefaultDescription')}
            </p>
            {error.digest && (
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">Error ID: {error.digest}</p>
            )}
            <button
                onClick={reset}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
                <RefreshCw className="h-4 w-4" />
                {t('common.tryAgain')}
            </button>
        </div>
    )
}
