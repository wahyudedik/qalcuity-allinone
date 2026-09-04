'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Terjadi Kesalahan</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4 text-center">Gagal memuat halaman billing. Silakan coba lagi.</p>
      <button onClick={reset} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        Coba Lagi
      </button>
    </div>
  );
}
