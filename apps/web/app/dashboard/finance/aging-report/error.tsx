'use client';

import { useEffect } from 'react';
import { Clock, RefreshCw } from 'lucide-react';

export default function AgingReportError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Aging Report error:', error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
            <Clock className="mb-4 h-12 w-12 text-red-400" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
                Gagal Memuat Laporan Umur Piutang & Utang
            </h3>
            <p className="mb-4 max-w-md text-sm text-gray-500">
                {error.message || 'Terjadi kesalahan saat memuat data aging report.'}
            </p>
            <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
                <RefreshCw className="h-4 w-4" />
                Coba Lagi
            </button>
        </div>
    );
}
