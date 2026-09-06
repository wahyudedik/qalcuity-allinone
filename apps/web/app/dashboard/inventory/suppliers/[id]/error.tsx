'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function SupplierDetailError({
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
            title={t('errors.supplierDetail.title') || 'Gagal Memuat Detail Supplier'}
            description={t('errors.supplierDetail.description') || 'Terjadi kesalahan saat memuat detail supplier. Silakan coba lagi.'}
        />
    );
}
