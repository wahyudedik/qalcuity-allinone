'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function POSRefundsError({
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
            title={t('errors.posRefunds.title') || 'Gagal Memuat Refund POS'}
            description={t('errors.posRefunds.description') || 'Terjadi kesalahan saat memuat data refund POS. Silakan coba lagi.'}
        />
    );
}
