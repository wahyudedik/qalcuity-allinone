'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function FinanceAccountsError({
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
            title={t('errors.financeAccounts.title') || 'Gagal Memuat Akun Keuangan'}
            description={t('errors.financeAccounts.description') || 'Terjadi kesalahan saat memuat data akun keuangan. Silakan coba lagi.'}
        />
    )
}
