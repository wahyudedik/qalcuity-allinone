'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function ProjectsError({
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
            title={t('errors.projects.title') || 'Gagal Memuat Proyek'}
            description={t('errors.projects.description') || 'Terjadi kesalahan saat memuat data proyek. Silakan coba lagi.'}
        />
    );
}
