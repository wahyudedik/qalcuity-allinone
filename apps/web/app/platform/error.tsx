'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function PlatformError({
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
            title={t('errors.platform.title') || 'Platform Error'}
            description={t('errors.platform.description') || 'Terjadi kesalahan pada platform. Silakan coba lagi.'}
        />
    )
}
