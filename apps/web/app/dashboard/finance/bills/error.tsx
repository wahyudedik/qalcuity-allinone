'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function FinanceBillsError({
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
            title={t('errors.financeBills.title') || 'Gagal Memuat Tagihan'}
            description={t('errors.financeBills.description') || 'Terjadi kesalahan saat memuat data tagihan. Silakan coba lagi.'}
        />
    )
}
