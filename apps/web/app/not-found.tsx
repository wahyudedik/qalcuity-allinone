import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="text-center max-w-md">
                {/* Illustration */}
                <div className="mb-8">
                    <div className="relative inline-block">
                        <div className="text-9xl font-bold text-blue-600/20">404</div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <svg
                                className="w-24 h-24 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    Halaman Tidak Ditemukan
                </h1>
                <p className="text-gray-600 mb-8">
                    Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan.
                </p>

                <div className="flex items-center justify-center gap-4">
                    <Link
                        href="/"
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        Kembali ke Beranda
                    </Link>
                    <Link
                        href="/dashboard"
                        className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                        ke Dashboard
                    </Link>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                        Butuh bantuan?{' '}
                        <a
                            href="mailto:support@qalcuity.com"
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Hubungi Support
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}
