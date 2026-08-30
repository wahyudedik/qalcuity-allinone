'use client'

import { ModuleError } from '@/components/ui/error-boundary'

export default function AuditError({
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
            title="Kesalahan Modul Audit"
            description="Terjadi kesalahan saat memuat data audit trail. Silakan coba lagi."
        />
    )
}
