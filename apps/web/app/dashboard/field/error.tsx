'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function FieldServiceError({
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
            title={t('errors.fieldService.title') || 'Gagal Memuat Field Service'}
            description={t('errors.fieldService.description') || 'Terjadi kesalahan saat memuat data layanan lapangan. Silakan coba lagi.'}
        />
    )
}
