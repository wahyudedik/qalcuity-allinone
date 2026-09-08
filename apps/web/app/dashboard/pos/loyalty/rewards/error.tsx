'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function POSLoyaltyRewardsError({
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
            title={t('errors.pos.title') || 'Gagal Memuat Hadiah Loyalitas'}
            description={t('errors.pos.description') || 'Terjadi kesalahan saat memuat data hadiah loyalitas. Silakan coba lagi.'}
        />
    );
}
