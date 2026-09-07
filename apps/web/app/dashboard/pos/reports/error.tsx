'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function POSReportsError({
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
            title={t('errors.posReports.title') || 'Gagal Memuat Laporan POS'}
            description={t('errors.posReports.description') || 'Terjadi kesalahan saat memuat data laporan POS. Silakan coba lagi.'}
        />
    )
}
