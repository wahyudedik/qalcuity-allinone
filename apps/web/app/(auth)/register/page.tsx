'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useTranslation } from '@/lib/i18n'
import { Eye, EyeOff } from 'lucide-react'

interface Providers {
    credentials: boolean;
    google: boolean;
}

/**
 * Direct fetch login — bypasses next-auth/react signIn() which sends
 * `json: true` in the POST body. That causes NextAuth to return HTTP 200
 * JSON instead of HTTP 302 redirect with Set-Cookie, so the session
 * cookie is never stored and login always fails in the browser.
 *
 * This function instead:
 * 1. Fetches a fresh CSRF token from /api/auth/csrf
 * 2. POSTs to /api/auth/callback/credentials WITHOUT json:true
 * 3. Uses redirect:'follow' + credentials:'include' so the browser
 *    follows the 302 redirect and processes the Set-Cookie header
 * 4. Returns the final URL after redirect chain completes
 */
async function loginWithCredentials(
    email: string,
    password: string,
    callbackUrl: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
    try {
        // Step 1: Get fresh CSRF token
        const csrfRes = await fetch('/api/auth/csrf', {
            credentials: 'include',
        })
        if (!csrfRes.ok) {
            return { ok: false, error: 'Failed to get CSRF token' }
        }
        const { csrfToken } = await csrfRes.json()

        // Step 2: POST credentials WITHOUT json:true
        // This causes the server to return 302 redirect with Set-Cookie
        const res = await fetch('/api/auth/callback/credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                email,
                password,
                csrfToken,
                callbackUrl,
                // Intentionally OMITTING `json: true` — this is the fix.
                // signIn() from next-auth/react sends json:true which causes
                // the server to return 200 JSON without Set-Cookie.
            }),
            redirect: 'follow',   // Follow 302 → processes Set-Cookie
            credentials: 'include', // Include/send cookies
        })

        if (!res.ok) {
            return { ok: false, error: `HTTP ${res.status}` }
        }

        // Step 3: After redirect chain, navigate to callback URL
        // The session cookie has been set by the 302 redirect response
        return { ok: true, url: callbackUrl }
    } catch (err) {
        console.error('[Auth] loginWithCredentials error:', err)
        return { ok: false, error: String(err) }
    }
}

/**
 * Unregister any existing Service Workers and clear all caches.
 * This fixes issues where an old cached SW intercepts auth requests
 * and drops Set-Cookie headers, preventing login after registration.
 *
 * Returns a Promise that resolves when all SWs are unregistered.
 * Must be awaited before performing signIn() to ensure the browser
 * handles auth requests directly without SW interference.
 */
function unregisterOldServiceWorkers(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
        return Promise.resolve(true)
    }

    return navigator.serviceWorker.getRegistrations()
        .then(async (registrations) => {
            if (registrations.length === 0) {
                return true
            }

            for (const registration of registrations) {
                const success = await registration.unregister()
                void success
            }

            if ('caches' in window) {
                const cacheNames = await caches.keys()
                await Promise.all(
                    cacheNames.map((name) => {
                        return caches.delete(name)
                    })
                )
            }

            return true
        })
        .catch(() => {
            return false
        })
}

export default function RegisterPage() {
    const { t } = useTranslation()
    const [formData, setFormData] = useState({
        companyName: '',
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
    })
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [agreed, setAgreed] = useState(false)
    const [providers, setProviders] = useState<Providers>({ credentials: true, google: false })
    const [swReady, setSwReady] = useState(false)

    // Unregister old Service Workers on register page load.
    // Old cached SWs can intercept /api/auth/ requests and drop Set-Cookie headers,
    // which breaks the auto-login flow after registration.
    useEffect(() => {
        unregisterOldServiceWorkers().then((success) => {
            setSwReady(true)
        })
    }, [])

    // Fetch available auth providers from server
    // Replaces static NEXT_PUBLIC_GOOGLE_CLIENT_ID check with dynamic
    // server-side validation of Google OAuth reachability.
    useEffect(() => {
        fetch('/api/auth/providers')
            .then(res => res.json())
            .then((data: Providers) => setProviders(data))
            .catch(() => {
                setProviders({ credentials: true, google: false })
            })
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value,
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (formData.password !== formData.confirmPassword) {
            setError(t('auth.confirmPassword') + '!')
            return
        }

        if (!agreed) {
            setError('Anda harus menyetujui Syarat & Ketentuan')
            return
        }

        setIsLoading(true)

        try {
            // Register user
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyName: formData.companyName,
                    fullName: formData.fullName,
                    email: formData.email,
                    password: formData.password,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || t('common.error'))
                return
            }

            // Wait for SW unregistration to complete before auto-login.
            // An active SW can intercept the POST /api/auth/callback/credentials request
            // and drop the Set-Cookie header, breaking the entire login flow.
            if (!swReady) {
                await unregisterOldServiceWorkers()
            }

            // Check if any SW is still active
            const swStillActive = 'serviceWorker' in navigator && !!navigator.serviceWorker.controller

            if (swStillActive) {
                const reg = await navigator.serviceWorker.getRegistration('/')
                if (reg?.waiting) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' })
                }
            }

            // Auto login setelah register
            // FIX: Use direct fetch instead of signIn() from next-auth/react.
            // signIn() internally sends `json: true` which causes NextAuth to return
            // HTTP 200 JSON without Set-Cookie. The session cookie is never stored,
            // and the user is redirected back to /login by middleware.
            const callbackUrl = '/dashboard?onboard=true'
            const result = await loginWithCredentials(
                formData.email,
                formData.password,
                callbackUrl
            )

            if (result.ok) {
                // Session cookie is now set — navigate to dashboard
                window.location.href = result.url || callbackUrl
            } else {
                // Auto-login failed after registration
                console.error('[Register] Auto-login failed:', result.error)
                // Registration succeeded but login failed — redirect to login page
                // so user can manually login
                window.location.href = '/login?email=' + encodeURIComponent(formData.email)
            }
        } catch (err) {
            setError(t('common.error'))
        } finally {
            setIsLoading(false)
        }
    }

    const passwordStrength = (password: string): { level: number; label: string; color: string } => {
        let level = 0
        if (password.length >= 6) level++
        if (password.length >= 8) level++
        if (/[A-Z]/.test(password)) level++
        if (/[0-9]/.test(password)) level++
        if (/[^A-Za-z0-9]/.test(password)) level++

        if (level <= 1) return { level, label: 'Lemah', color: 'bg-red-500' }
        if (level <= 2) return { level, label: 'Sedang', color: 'bg-yellow-500' }
        if (level <= 3) return { level, label: 'Kuat', color: 'bg-blue-500' }
        return { level, label: 'Sangat Kuat', color: 'bg-green-500' }
    }

    const strength = passwordStrength(formData.password)

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
                <h2 className="text-2xl font-bold text-gray-900">{t('auth.registerTitle')}</h2>
                <p className="text-gray-600 mt-2">
                    {t('auth.registerSubtitle')}
                </p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('settings.companyName')}
                    </label>
                    <input
                        id="companyName"
                        name="companyName"
                        type="text"
                        value={formData.companyName}
                        onChange={handleChange}
                        placeholder="PT Maju Bersama"
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder:text-gray-400"
                    />
                </div>

                <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('common.name')}
                    </label>
                    <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="Budi Santoso"
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder:text-gray-400"
                    />
                </div>

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('auth.email')}
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="budi@majubersama.com"
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
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Minimal 8 karakter"
                            required
                            minLength={8}
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
                    {formData.password && (
                        <div className="mt-2">
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div
                                        key={i}
                                        className={`h-1 flex-1 rounded-full ${i <= strength.level ? strength.color : 'bg-gray-200'}`}
                                    />
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Kekuatan: {strength.label}</p>
                        </div>
                    )}
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('auth.confirmPassword')}
                    </label>
                    <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Ulangi password"
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder:text-gray-400"
                    />
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                        <p className="text-xs text-red-500 mt-1">{t('auth.confirmPassword')}!</p>
                    )}
                </div>

                <div className="flex items-start gap-3">
                    <input
                        type="checkbox"
                        id="agreed"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="agreed" className="text-sm text-gray-600">
                        Saya setuju dengan{' '}
                        <Link href="/terms" className="text-blue-600 hover:text-blue-700 font-medium">
                            Syarat & Ketentuan
                        </Link>{' '}
                        dan{' '}
                        <Link href="/privacy" className="text-blue-600 hover:text-blue-700 font-medium">
                            Kebijakan Privasi
                        </Link>
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={isLoading || !agreed}
                    className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            {t('auth.registering')}
                        </span>
                    ) : (
                        t('auth.register')
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
                    onClick={() => signIn('google', { callbackUrl: '/dashboard?onboard=true' })}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-50 transition-all"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {t('auth.register')} Google
                </button>
            )}

            <p className="text-center text-gray-600">
                {t('auth.hasAccount')}{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                    {t('auth.login')}
                </Link>
            </p>
        </div>
    )
}
