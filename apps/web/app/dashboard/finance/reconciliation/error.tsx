'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function FinanceReconciliationError({
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
            title={t('errors.financeReconciliation.title') || 'Gagal Memuat Rekonsiliasi'}
            description={t('errors.financeReconciliation.description') || 'Terjadi kesalahan saat memuat data rekonsiliasi keuangan. Silakan coba lagi.'}
        />
    )
}
