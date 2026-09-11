'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function IncomeStatementError({
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
            title={t('errors.incomeStatement.title') || 'Failed to Load Income Statement'}
            description={t('errors.incomeStatement.description') || 'An error occurred while loading the income statement. Please try again.'}
        />
    )
}
