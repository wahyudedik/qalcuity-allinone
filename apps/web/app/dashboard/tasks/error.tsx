'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function TasksError({
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
            title={t('errors.tasks.title') || 'Gagal Memuat Tugas'}
            description={t('errors.tasks.description') || 'Terjadi kesalahan saat memuat data tugas. Silakan coba lagi.'}
        />
    );
}
