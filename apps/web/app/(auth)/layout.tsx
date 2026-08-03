import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Masuk - Qalcuity',
    description: 'Masuk ke akun Qalcuity Anda',
}

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen flex">
            {/* Left side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 text-white p-12 flex-col justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-xl">Q</span>
                        </div>
                        <span className="text-2xl font-bold">Qalcuity</span>
                    </div>

                    <h1 className="text-4xl font-bold mb-4">
                        OS Bisnis All-in-One
                    </h1>
                    <p className="text-xl text-blue-100">
                        Kelola seluruh operasional bisnis Anda dalam satu platform.
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-blue-500/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span>📊</span>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-1">Finance & Accounting</h3>
                            <p className="text-blue-200 text-sm">Invoice, pembayaran, dan laporan keuangan otomatis</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-blue-500/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span>📈</span>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-1">Sales & CRM</h3>
                            <p className="text-blue-200 text-sm">Pipeline, leads, dan manajemen pelanggan</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-blue-500/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span>🤖</span>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-1">AI Built-in</h3>
                            <p className="text-blue-200 text-sm">Asisten AI untuk analisis dan otomatisasi</p>
                        </div>
                    </div>
                </div>

                <div className="text-blue-200 text-sm">
                    © 2026 Qalcuity. All rights reserved.
                </div>
            </div>

            {/* Right side - Auth form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-md">
                    {children}
                </div>
            </div>
        </div>
    )
}
