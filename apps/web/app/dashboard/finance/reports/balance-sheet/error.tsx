'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function BalanceSheetError({
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
            title={t('errors.balanceSheet.title') || 'Failed to Load Balance Sheet'}
            description={t('errors.balanceSheet.description') || 'An error occurred while loading the balance sheet. Please try again.'}
        />
    )
}
