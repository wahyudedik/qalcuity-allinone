'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function RecurringInvoicesError({
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
            title={t('errors.recurringInvoices.title') || 'Failed to Load Recurring Invoices'}
            description={t('errors.recurringInvoices.description') || 'An error occurred while loading recurring invoices. Please try again.'}
        />
    )
}
