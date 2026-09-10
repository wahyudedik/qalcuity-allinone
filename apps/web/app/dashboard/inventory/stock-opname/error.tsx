'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function StockOpnameError({
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
            title={t('errors.inventoryStockOpname.title') || 'Gagal Memuat Stock Opname'}
            description={t('errors.inventoryStockOpname.description') || 'Terjadi kesalahan saat memuat data stock opname. Silakan coba lagi.'}
        />
    )
}
