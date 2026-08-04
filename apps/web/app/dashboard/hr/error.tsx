'use client'

import { ModuleError } from '@/components/ui/error-boundary'

export default function HrError({
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
            title="Kesalahan Modul HR"
            description="Terjadi kesalahan saat memuat data HR. Silakan coba lagi."
        />
    )
}
