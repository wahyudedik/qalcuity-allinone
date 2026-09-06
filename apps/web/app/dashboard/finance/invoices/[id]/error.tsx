'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function InvoiceDetailError({
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
            title={t('errors.invoiceDetail.title') || 'Gagal Memuat Detail Invoice'}
            description={t('errors.invoiceDetail.description') || 'Terjadi kesalahan saat memuat detail invoice. Silakan coba lagi.'}
        />
    );
}
