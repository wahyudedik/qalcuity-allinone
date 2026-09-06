'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function TimesheetError({
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
            title={t('errors.timesheet.title') || 'Gagal Memuat Timesheet'}
            description={t('errors.timesheet.description') || 'Terjadi kesalahan saat memuat data timesheet. Silakan coba lagi.'}
        />
    );
}
