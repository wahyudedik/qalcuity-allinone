'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function ExplorerError({
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
            title={t('errors.analytics.title') || 'Explorer Error'}
            description={t('errors.analytics.description') || 'An error occurred while loading the data explorer.'}
        />
    )
}
