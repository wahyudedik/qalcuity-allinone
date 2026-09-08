'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function POSLoyaltyMembersError({
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
            title={t('errors.pos.title') || 'Gagal Memuat Anggota Loyalitas'}
            description={t('errors.pos.description') || 'Terjadi kesalahan saat memuat data anggota loyalitas. Silakan coba lagi.'}
        />
    );
}
