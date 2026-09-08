'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function ProjectDetailError({
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
            title={t('errors.projects.title') || 'Gagal Memuat Detail Proyek'}
            description={t('errors.projects.description') || 'Terjadi kesalahan saat memuat detail proyek. Silakan coba lagi.'}
        />
    );
}
