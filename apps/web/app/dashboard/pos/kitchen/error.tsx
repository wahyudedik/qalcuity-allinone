'use client';

/**
 * Kitchen Display System — Error State
 *
 * Error boundary untuk kitchen display page.
 *
 * Ref: AGENT.md Section 6.9 (Error Handling Pattern)
 */

import { ModuleError } from '@/components/ui/error-boundary';

interface KitchenErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function KitchenError({ error, reset }: KitchenErrorProps) {
    return (
        <ModuleError
            error={error}
            reset={reset}
            title="Gagal Memuat Kitchen Display"
            description="Terjadi kesalahan saat memuat data pesanan dapur. Silakan coba lagi."
        />
    );
}
