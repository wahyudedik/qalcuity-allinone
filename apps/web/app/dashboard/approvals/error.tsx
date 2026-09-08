'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function ApprovalsError({
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
            title={t('errors.approvals.title') || 'Gagal Memuat Persetujuan'}
            description={t('errors.approvals.description') || 'Terjadi kesalahan saat memuat data persetujuan. Silakan coba lagi.'}
        />
    )
}
