'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function ProjectNewError({
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
            title={t('errors.projects.title') || 'Gagal Memuat Form Proyek Baru'}
            description={t('errors.projects.description') || 'Terjadi kesalahan saat memuat form proyek baru. Silakan coba lagi.'}
        />
    );
}
