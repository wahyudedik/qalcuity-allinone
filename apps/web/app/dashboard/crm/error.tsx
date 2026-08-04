'use client'

import { ModuleError } from '@/components/ui/error-boundary'

export default function CrmError({
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
            title="Kesalahan Modul CRM"
            description="Terjadi kesalahan saat memuat data CRM. Silakan coba lagi."
        />
    )
}
