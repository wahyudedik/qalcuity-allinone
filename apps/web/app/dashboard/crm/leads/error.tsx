'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function LeadsError({
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
            title={t('errors.crmLeads.title') || 'Gagal Memuat Prospek'}
            description={t('errors.crmLeads.description') || 'Terjadi kesalahan saat memuat data prospek. Silakan coba lagi.'}
        />
    )
}
