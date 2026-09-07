'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function FinanceJournalEntriesError({
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
            title={t('errors.financeJournalEntries.title') || 'Gagal Memuat Jurnal Umum'}
            description={t('errors.financeJournalEntries.description') || 'Terjadi kesalahan saat memuat data jurnal umum. Silakan coba lagi.'}
        />
    )
}
