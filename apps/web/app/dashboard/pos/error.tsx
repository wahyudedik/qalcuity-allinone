'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function POSError({
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
            title={t('errors.pos.title') || 'POS Error'}
            description={t('errors.pos.description') || 'Terjadi kesalahan pada sistem Point of Sale. Silakan coba lagi.'}
        />
    )
}
