'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function ErrorLogsError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const { t } = useTranslation()
    return (
        <ModuleError
            error={error}
            reset={reset}
            title={t('platform.errorLogsPage.errorTitle') || 'Error Logs Error'}
            description={t('platform.errorLogsPage.errorDescription') || 'Terjadi kesalahan memuat log error. Silakan coba lagi.'}
        />
    )
}
