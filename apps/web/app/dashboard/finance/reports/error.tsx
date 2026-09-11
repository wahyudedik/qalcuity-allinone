'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function FinanceReportsError({
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
            title={t('errors.financeReports.title') || 'Failed to Load Financial Reports'}
            description={t('errors.financeReports.description') || 'An error occurred while loading financial reports. Please try again.'}
        />
    )
}
