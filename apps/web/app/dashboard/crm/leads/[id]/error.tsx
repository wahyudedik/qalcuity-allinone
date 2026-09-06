'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function LeadDetailError({
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
            title={t('errors.leadDetail.title') || 'Gagal Memuat Detail Lead'}
            description={t('errors.leadDetail.description') || 'Terjadi kesalahan saat memuat detail lead. Silakan coba lagi.'}
        />
    );
}
