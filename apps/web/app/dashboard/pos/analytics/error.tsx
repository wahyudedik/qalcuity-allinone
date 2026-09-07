'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function POSAnalyticsError({
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
            title={t('errors.posAnalytics.title') || 'Gagal Memuat Analitik POS'}
            description={t('errors.posAnalytics.description') || 'Terjadi kesalahan saat memuat data analitik POS. Silakan coba lagi.'}
        />
    )
}
