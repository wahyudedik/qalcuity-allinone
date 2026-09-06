'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function FieldJobDetailError({
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
            title={t('errors.fieldJobDetail.title') || 'Gagal Memuat Detail Pekerjaan'}
            description={t('errors.fieldJobDetail.description') || 'Terjadi kesalahan saat memuat detail pekerjaan lapangan. Silakan coba lagi.'}
        />
    );
}
