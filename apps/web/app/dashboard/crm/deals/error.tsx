'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function DealsError({
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
            title={t('errors.crmDeals.title') || 'Gagal Memuat Deal'}
            description={t('errors.crmDeals.description') || 'Terjadi kesalahan saat memuat data deal. Silakan coba lagi.'}
        />
    )
}
