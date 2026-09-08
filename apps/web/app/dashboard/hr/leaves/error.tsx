'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function HRLeavesError({
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
            title={t('errors.hr.title') || 'Gagal Memuat Cuti'}
            description={t('errors.hr.description') || 'Terjadi kesalahan saat memuat data cuti. Silakan coba lagi.'}
        />
    );
}
