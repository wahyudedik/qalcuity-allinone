'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function AIError({
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
            title={t('errors.ai.title') || 'AI Error'}
            description={t('errors.ai.description') || 'Terjadi kesalahan pada layanan AI. Silakan coba lagi.'}
        />
    )
}
