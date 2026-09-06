'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function QuotationDetailError({
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
            title={t('errors.quotationDetail.title') || 'Gagal Memuat Detail Quotation'}
            description={t('errors.quotationDetail.description') || 'Terjadi kesalahan saat memuat detail quotation. Silakan coba lagi.'}
        />
    );
}
