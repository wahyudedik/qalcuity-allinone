'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function FinancePurchaseOrdersError({
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
            title={t('errors.financePurchaseOrders.title') || 'Gagal Memuat Purchase Order'}
            description={t('errors.financePurchaseOrders.description') || 'Terjadi kesalahan saat memuat data purchase order. Silakan coba lagi.'}
        />
    )
}
