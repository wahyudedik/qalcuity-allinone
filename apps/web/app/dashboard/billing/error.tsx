'use client'

import { ModuleError } from '@/components/ui/error-boundary'

export default function BillingError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <ModuleError
            error={error}
            reset={reset}
            title="Kesalahan Modul Billing"
            description="Terjadi kesalahan saat memuat data billing. Silakan coba lagi."
        />
    )
}
