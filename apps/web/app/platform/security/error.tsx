'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function SecurityError({
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
            title={t('errors.security.title') || 'Security Error'}
            description={t('errors.security.description') || 'Terjadi kesalahan pada modul keamanan. Silakan coba lagi.'}
        />
    )
}
