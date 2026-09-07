'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function POSTerminalError({
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
            title={t('errors.posTerminal.title') || 'Gagal Memuat Terminal POS'}
            description={t('errors.posTerminal.description') || 'Terjadi kesalahan saat memuat data terminal POS. Silakan coba lagi.'}
        />
    )
}
