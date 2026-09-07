'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function FinanceTaxRatesError({
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
            title={t('errors.financeTaxRates.title') || 'Gagal Memuat Tarif Pajak'}
            description={t('errors.financeTaxRates.description') || 'Terjadi kesalahan saat memuat data tarif pajak. Silakan coba lagi.'}
        />
    )
}
