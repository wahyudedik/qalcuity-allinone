'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function ActivitiesError({
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
            title={t('errors.crmActivities.title') || 'Gagal Memuat Aktivitas'}
            description={t('errors.crmActivities.description') || 'Terjadi kesalahan saat memuat data aktivitas. Silakan coba lagi.'}
        />
    )
}
