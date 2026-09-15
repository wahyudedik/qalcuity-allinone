'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function FinanceExpensesError({
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
            title={t('errors.financeExpenses.title') || 'Gagal Memuat Pengeluaran'}
            description={t('errors.financeExpenses.description') || 'Terjadi kesalahan saat memuat data pengeluaran. Silakan coba lagi.'}
        />
    )
}
