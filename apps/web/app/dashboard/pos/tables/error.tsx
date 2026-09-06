'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function POSTablesError({
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
            title={t('errors.posTables.title') || 'Gagal Memuat Meja POS'}
            description={t('errors.posTables.description') || 'Terjadi kesalahan saat memuat data meja POS. Silakan coba lagi.'}
        />
    );
}
