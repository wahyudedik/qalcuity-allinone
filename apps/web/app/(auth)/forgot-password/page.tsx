'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })
            const data = await res.json()
            if (res.ok && data.success) {
                setSubmitted(true)
            } else {
                setError(data.error || 'Terjadi kesalahan. Silakan coba lagi.')
            }
        } catch {
            setError('Terjadi kesalahan. Silakan coba lagi.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Logo mobile */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                <img src="/logo.png" alt="Qalcuity" className="h-12 w-12 object-contain" />
            </div>

            {/* Logo desktop */}
            <div className="hidden lg:flex items-center justify-center gap-3 mb-4">
                <img src="/logo.png" alt="Qalcuity" className="h-12 w-12 object-contain" />
            </div>

            <div>
                <h2 className="text-2xl font-bold text-gray-900">Lupa Password</h2>
                <p className="text-gray-600 mt-2">
                    Masukkan email Anda dan kami akan mengirimkan tautan untuk mereset password.
                </p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {submitted ? (
                <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                        <p className="text-sm text-green-700">
                            Tautan reset password telah dikirim ke <strong>{email}</strong>. Silakan cek email Anda.
                        </p>
                    </div>
                    <p className="text-sm text-gray-500">
                        Tidak menerima email? Periksa folder spam atau{' '}
                        <button
                            onClick={() => setSubmitted(false)}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            kirim ulang
                        </button>
                    </p>
                    <Link
                        href="/login"
                        className="block w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all text-center"
                    >
                        Kembali ke Login
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="nama@perusahaan.com"
                            required
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder:text-gray-400"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Mengirim...
                            </span>
                        ) : (
                            'Kirim Tautan Reset'
                        )}
                    </button>

                    <p className="text-center text-gray-600">
                        <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                            ← Kembali ke Login
                        </Link>
                    </p>
                </form>
            )}
        </div>
    )
}
