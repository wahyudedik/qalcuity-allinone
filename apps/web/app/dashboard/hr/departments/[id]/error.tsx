'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function DepartmentDetailError({
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
            title={t('errors.departmentDetail.title') || 'Gagal Memuat Detail Departemen'}
            description={t('errors.departmentDetail.description') || 'Terjadi kesalahan saat memuat detail departemen. Silakan coba lagi.'}
        />
    );
}
