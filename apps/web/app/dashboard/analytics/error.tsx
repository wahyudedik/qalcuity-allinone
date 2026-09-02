'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function AnalyticsError({
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
            title={t('errors.analytics.title') || 'Analytics Error'}
            description={t('errors.analytics.description') || 'An error occurred while loading analytics data.'}
        />
    )
}
