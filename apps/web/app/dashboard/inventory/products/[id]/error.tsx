'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function ProductDetailError({
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
            title={t('errors.productDetail.title') || 'Gagal Memuat Detail Produk'}
            description={t('errors.productDetail.description') || 'Terjadi kesalahan saat memuat detail produk. Silakan coba lagi.'}
        />
    );
}
