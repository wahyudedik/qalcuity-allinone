'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function PipelineError({
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
            title={t('errors.crm.title') || 'Gagal Memuat Pipeline'}
            description={t('errors.crm.description') || 'Terjadi kesalahan saat memuat data pipeline. Silakan coba lagi.'}
        />
    );
}
