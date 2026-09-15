'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function InboxError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Inbox page error:', error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-800">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100">
                Gagal Memuat Inbox
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                Terjadi kesalahan saat memuat data inbox. Silakan coba lagi.
            </p>
            <button
                onClick={reset}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                Coba Lagi
            </button>
        </div>
    );
}
