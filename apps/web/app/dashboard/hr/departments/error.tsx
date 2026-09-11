'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function DepartmentsError({
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
            title={t('errors.departments.title') || 'Gagal Memuat Departemen'}
            description={t('errors.departments.description') || 'Terjadi kesalahan saat memuat daftar departemen. Silakan coba lagi.'}
        />
    );
}
