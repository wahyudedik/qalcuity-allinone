'use client';

import { AlertTriangle } from 'lucide-react';

export default function AgentsError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="mb-4 h-12 w-12 text-red-500" />
            <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                Terjadi Kesalahan
            </h2>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                {error.message || 'Gagal memuat AI Agents. Silakan coba lagi.'}
            </p>
            <button
                onClick={reset}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
                Coba Lagi
            </button>
        </div>
    );
}
