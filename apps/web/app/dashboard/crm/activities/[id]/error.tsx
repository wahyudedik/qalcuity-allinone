'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function ActivityDetailError({
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
            title={t('errors.activityDetail.title') || 'Gagal Memuat Detail Aktivitas'}
            description={t('errors.activityDetail.description') || 'Terjadi kesalahan saat memuat detail aktivitas. Silakan coba lagi.'}
        />
    );
}
