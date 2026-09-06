'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function POSSessionsError({
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
            title={t('errors.posSessions.title') || 'Gagal Memuat Sesi POS'}
            description={t('errors.posSessions.description') || 'Terjadi kesalahan saat memuat data sesi POS. Silakan coba lagi.'}
        />
    );
}
