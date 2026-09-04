'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function MonitoringError({
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
            title={t('errors.monitoring.title') || 'Monitoring Error'}
            description={t('errors.monitoring.description') || 'Terjadi kesalahan pada sistem monitoring. Silakan coba lagi.'}
        />
    )
}
