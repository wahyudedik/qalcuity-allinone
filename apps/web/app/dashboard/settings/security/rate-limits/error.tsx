'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        logger.error('[ErrorBoundary] Rate Limits page error', error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
            <h2 className="text-lg font-semibold text-gray-900">Terjadi Kesalahan</h2>
            <p className="mt-2 text-sm text-gray-600">Terjadi kesalahan yang tidak terduga. Silakan coba lagi.</p>
            <button onClick={reset} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                Coba Lagi
            </button>
        </div>
    );
}
