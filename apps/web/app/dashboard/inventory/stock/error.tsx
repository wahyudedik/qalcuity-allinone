'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function StockError({
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
            title={t('errors.inventoryStock.title') || 'Gagal Memuat Stok'}
            description={t('errors.inventoryStock.description') || 'Terjadi kesalahan saat memuat data stok. Silakan coba lagi.'}
        />
    )
}
