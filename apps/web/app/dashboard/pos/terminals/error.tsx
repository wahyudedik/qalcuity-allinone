'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function POSTerminalsError({
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
            title={t('errors.posTerminals.title') || 'Gagal Memuat Terminal POS'}
            description={t('errors.posTerminals.description') || 'Terjadi kesalahan saat memuat data terminal POS. Silakan coba lagi.'}
        />
    );
}
