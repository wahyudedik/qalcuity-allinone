'use client';

import { ModuleError } from '@/components/ui/error-boundary';
import { useTranslation } from '@/lib/i18n';

export default function FieldChecklistsError({
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
            title={t('errors.fieldChecklists.title') || 'Gagal Memuat Template Checklist'}
            description={t('errors.fieldChecklists.description') || 'Terjadi kesalahan saat memuat data template checklist. Silakan coba lagi.'}
        />
    );
}
