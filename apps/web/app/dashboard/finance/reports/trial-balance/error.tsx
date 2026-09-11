'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function TrialBalanceError({
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
            title={t('errors.trialBalance.title') || 'Failed to Load Trial Balance'}
            description={t('errors.trialBalance.description') || 'An error occurred while loading the trial balance. Please try again.'}
        />
    )
}
