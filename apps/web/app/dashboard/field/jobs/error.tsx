'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function FieldJobsError({
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
            title={t('errors.fieldJobs.title') || 'Gagal Memuat Pekerjaan Lapangan'}
            description={t('errors.fieldJobs.description') || 'Terjadi kesalahan saat memuat data pekerjaan lapangan. Silakan coba lagi.'}
        />
    );
}
