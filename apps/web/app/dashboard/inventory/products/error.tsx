'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function ProductsError({
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
            title={t('errors.inventory.title') || 'Gagal Memuat Produk'}
            description={t('errors.inventory.description') || 'Terjadi kesalahan saat memuat data produk. Silakan coba lagi.'}
        />
    );
}
