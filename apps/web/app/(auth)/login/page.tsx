'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { FlaskConical, Eye, EyeOff } from 'lucide-react'

interface Providers {
    credentials: boolean;
    google: boolean;
}

export default function LoginPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { t } = useTranslation()
    const [email, setEmail] = useState(searchParams?.get('email') || '')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [providers, setProviders] = useState<Providers>({ credentials: true, google: false })
    const isDemoLogin = searchParams?.get('email') === 'demo@qalcuity.com'

    // Fetch available auth providers from server
    // This replaces the static NEXT_PUBLIC_GOOGLE_CLIENT_ID check with a
    // dynamic check that validates Google OAuth reachability on the server.
    useEffect(() => {
        fetch('/api/auth/providers')
            .then(res => res.json())
            .then((data: Providers) => setProviders(data))
            .catch(() => {
                // If fetch fails, default to credentials-only (safe fallback)
                setProviders({ credentials: true, google: false })
            })
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            })

            if (result?.error) {
                setError(result.error)
            } else {
                // rememberMe: NextAuth JWT sudah punya expiry default.
                // Jika rememberMe = false, redirect ke dashboard (session expiry default).
                // Jika rememberMe = true, tetap redirect ke dashboard (session lebih lama).
                router.push('/dashboard')
                router.refresh()
            }
        } catch (err) {
            setError(t('common.error'))
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
                <h2 className="text-2xl font-bold text-gray-900">{t('auth.loginTitle')}</h2>
                <p className="text-gray-600 mt-2">
                    {t('auth.loginSubtitle')}
                </p>
            </div>

            {isDemoLogin && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                    <div className="flex items-start gap-3">
                        <FlaskConical className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-blue-800">Mode Demo Aktif</p>
                            <p className="text-xs text-blue-600 mt-1">
                                Akun demo sudah terisi. Klik "Masuk" untuk menjelajahi fitur Qalcuity dengan data contoh.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('auth.email')}
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

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('auth.password')}
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder:text-gray-400 pr-12"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.value === 'on')}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">{t('auth.rememberMe')}</span>
                    </label>
                    <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        {t('auth.forgotPassword')}
                    </Link>
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
                            {t('auth.loggingIn')}
                        </span>
                    ) : (
                        t('auth.login')
                    )}
                </button>
            </form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-50 text-gray-500">/</span>
                </div>
            </div>

            {providers.google && (
                <button
                    type="button"
                    onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-50 transition-all"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {t('auth.login')} Google
                </button>
            )}

            <p className="text-center text-gray-600">
                {t('auth.noAccount')}{' '}
                <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                    {t('auth.register')}
                </Link>
            </p>
        </div>
    )
}
