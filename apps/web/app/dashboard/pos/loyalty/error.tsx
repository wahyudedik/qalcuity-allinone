'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function POSLoyaltyError({
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
            title={t('errors.posLoyalty.title') || 'Gagal Memuat Loyalitas POS'}
            description={t('errors.posLoyalty.description') || 'Terjadi kesalahan saat memuat data loyalitas POS. Silakan coba lagi.'}
        />
    );
}
