'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function TenantsError({
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
            title={t('errors.tenants.title') || 'Tenant Management Error'}
            description={t('errors.tenants.description') || 'Terjadi kesalahan pada manajemen tenant. Silakan coba lagi.'}
        />
    )
}
