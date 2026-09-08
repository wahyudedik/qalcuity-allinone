'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function ProjectGanttError({
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
            title={t('errors.projects.title') || 'Gagal Memuat Gantt Chart'}
            description={t('errors.projects.description') || 'Terjadi kesalahan saat memuat Gantt chart proyek. Silakan coba lagi.'}
        />
    );
}
