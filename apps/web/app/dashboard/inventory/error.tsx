'use client'

import { ModuleError } from '@/components/ui/error-boundary'

export default function InventoryError({
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
            title="Kesalahan Modul Inventory"
            description="Terjadi kesalahan saat memuat data inventaris. Silakan coba lagi."
        />
    )
}
