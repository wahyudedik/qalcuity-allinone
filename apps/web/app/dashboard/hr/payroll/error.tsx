'use client'

import { ModuleError } from '@/components/ui/error-boundary'
import { useTranslation } from '@/lib/i18n'

export default function PayrollError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const { t } = useTranslation()
    return (
        <ModuleError
            error={error}
            reset={reset}
            title={t('errors.hrPayroll.title') || 'Gagal Memuat Payroll'}
            description={t('errors.hrPayroll.description') || 'Terjadi kesalahan saat memuat data payroll. Silakan coba lagi.'}
        />
    )
}
