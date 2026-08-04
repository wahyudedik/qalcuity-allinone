'use client'

import { ModuleError } from '@/components/ui/error-boundary'

export default function SettingsError({
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
            title="Kesalahan Modul Settings"
            description="Terjadi kesalahan saat memuat pengaturan. Silakan coba lagi."
        />
    )
}
