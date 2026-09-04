'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function SupportError({
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
            title={t('errors.support.title') || 'Support Error'}
            description={t('errors.support.description') || 'Terjadi kesalahan pada modul support. Silakan coba lagi.'}
        />
    )
}
