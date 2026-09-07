'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function POSTerminalsMonitorError({
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
            title={t('errors.posTerminalsMonitor.title') || 'Gagal Memuat Monitor Terminal POS'}
            description={t('errors.posTerminalsMonitor.description') || 'Terjadi kesalahan saat memuat data monitor terminal POS. Silakan coba lagi.'}
        />
    )
}
