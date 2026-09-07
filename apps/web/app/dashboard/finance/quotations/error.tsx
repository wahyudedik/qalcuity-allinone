'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function FinanceQuotationsError({
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
            title={t('errors.financeQuotations.title') || 'Gagal Memuat Quotation'}
            description={t('errors.financeQuotations.description') || 'Terjadi kesalahan saat memuat data quotation. Silakan coba lagi.'}
        />
    )
}
