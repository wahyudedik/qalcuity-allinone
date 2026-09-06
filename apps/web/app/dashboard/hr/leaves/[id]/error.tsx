'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function LeaveDetailError({
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
            title={t('errors.leaveDetail.title') || 'Gagal Memuat Detail Cuti'}
            description={t('errors.leaveDetail.description') || 'Terjadi kesalahan saat memuat detail cuti. Silakan coba lagi.'}
        />
    );
}
