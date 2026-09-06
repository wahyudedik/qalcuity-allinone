'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function StockOpnameDetailError({
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
            title={t('errors.stockOpnameDetail.title') || 'Gagal Memuat Detail Stock Opname'}
            description={t('errors.stockOpnameDetail.description') || 'Terjadi kesalahan saat memuat detail stock opname. Silakan coba lagi.'}
        />
    );
}
