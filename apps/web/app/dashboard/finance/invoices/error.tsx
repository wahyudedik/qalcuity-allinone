'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function FinanceInvoicesError({
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
            title={t('errors.financeInvoices.title') || 'Gagal Memuat Invoice'}
            description={t('errors.financeInvoices.description') || 'Terjadi kesalahan saat memuat data invoice. Silakan coba lagi.'}
        />
    )
}
