'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function EmployeeDetailError({
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
            title={t('errors.employeeDetail.title') || 'Gagal Memuat Detail Karyawan'}
            description={t('errors.employeeDetail.description') || 'Terjadi kesalahan saat memuat detail karyawan. Silakan coba lagi.'}
        />
    );
}
