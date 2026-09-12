'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function EmployeesError({
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
            title={t('errors.hr.title') || 'Gagal Memuat Karyawan'}
            description={t('errors.hr.description') || 'Terjadi kesalahan saat memuat data karyawan. Silakan coba lagi.'}
        />
    );
}
