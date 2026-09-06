'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function POSTransactionsError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const { t } = useTranslation();
    return (
        <ModuleError
            error={error}
            reset={reset}
            title={t('errors.posTransactions.title') || 'Gagal Memuat Transaksi POS'}
            description={t('errors.posTransactions.description') || 'Terjadi kesalahan saat memuat data transaksi POS. Silakan coba lagi.'}
        />
    );
}
