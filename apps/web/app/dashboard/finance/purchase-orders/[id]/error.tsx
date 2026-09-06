'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function PurchaseOrderDetailError({
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
            title={t('errors.purchaseOrderDetail.title') || 'Gagal Memuat Detail Purchase Order'}
            description={t('errors.purchaseOrderDetail.description') || 'Terjadi kesalahan saat memuat detail purchase order. Silakan coba lagi.'}
        />
    );
}
