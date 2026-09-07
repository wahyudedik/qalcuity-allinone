'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function FinancePeriodsError({
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
            title={t('errors.financePeriods.title') || 'Gagal Memuat Periode Akuntansi'}
            description={t('errors.financePeriods.description') || 'Terjadi kesalahan saat memuat data periode akuntansi. Silakan coba lagi.'}
        />
    )
}
