'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function DealDetailError({
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
            title={t('errors.dealDetail.title') || 'Gagal Memuat Detail Deal'}
            description={t('errors.dealDetail.description') || 'Terjadi kesalahan saat memuat detail deal. Silakan coba lagi.'}
        />
    );
}
