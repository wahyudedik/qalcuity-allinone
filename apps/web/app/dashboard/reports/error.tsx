'use client'

import { ModuleError } from '@/components/ui/error-boundary'

export default function ReportsError({
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
            title="Kesalahan Modul Reports"
            description="Terjadi kesalahan saat memuat data laporan. Silakan coba lagi."
        />
    )
}
