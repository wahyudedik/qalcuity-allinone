'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function ContactsError({
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
            title={t('errors.crmContacts.title') || 'Gagal Memuat Kontak'}
            description={t('errors.crmContacts.description') || 'Terjadi kesalahan saat memuat data kontak. Silakan coba lagi.'}
        />
    )
}
