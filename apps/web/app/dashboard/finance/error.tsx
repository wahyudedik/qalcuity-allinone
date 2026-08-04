'use client'

import { ModuleError } from '@/components/ui/error-boundary'

export default function FinanceError({
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
            title="Kesalahan Modul Finance"
            description="Terjadi kesalahan saat memuat data keuangan. Silakan coba lagi."
        />
    )
}
