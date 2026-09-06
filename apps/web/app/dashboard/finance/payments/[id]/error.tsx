'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function PaymentDetailError({
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
            title={t('errors.paymentDetail.title') || 'Gagal Memuat Detail Pembayaran'}
            description={t('errors.paymentDetail.description') || 'Terjadi kesalahan saat memuat detail pembayaran. Silakan coba lagi.'}
        />
    );
}
