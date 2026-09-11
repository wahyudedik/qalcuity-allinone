'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function PayrollDetailError({
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
            title={t('errors.payrollDetail.title') || 'Gagal Memuat Detail Penggajian'}
            description={t('errors.payrollDetail.description') || 'Terjadi kesalahan saat memuat detail penggajian. Silakan coba lagi.'}
        />
    );
}
