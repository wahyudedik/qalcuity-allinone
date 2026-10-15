'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTranslation } from '@/lib/i18n'

/**
 * localStorage key — saat "Mulai dari Nol" / "Lewati" dipilih, auto-show
 * tidak akan muncul lagi di visit berikutnya untuk tenant ini (per-browser).
 */
const DISMISS_KEY = 'qalcuity_onboarding_dismissed'

export default function OnboardingModal() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { data: session } = useSession()
    const { t } = useTranslation()

    const [isLoading, setIsLoading] = useState(false)
    const [loadingStep, setLoadingStep] = useState('')
    // Auto-show untuk tenant kosong (fallback: ?onboard=true eksplisit dari register)
    const [autoShow, setAutoShow] = useState(false)

    const role = session?.user?.role as string | undefined
    const explicitOnboard = searchParams?.get('onboard') === 'true'
    const showOnboarding = explicitOnboard || autoShow

    useEffect(() => {
        // Jalur eksplisit ?onboard=true (post-register) — selalu tampilkan.
        if (explicitOnboard) return

        // Auto-show hanya untuk ADMIN/SUPERADMIN (guard server juga ada,
        // tapi skip fetch sama sekali untuk role lain).
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') return

        // Sudah pernah dismiss / pilih jalur — jangan ganggu lagi.
        try {
            if (localStorage.getItem(DISMISS_KEY) === '1') return
        } catch {
            return // localStorage unavailable (private mode) — jangan auto-show
        }

        // Tunggu session benar-benar loaded agar role valid.
        if (!session?.user) return

        let cancelled = false
        const checkTenantEmpty = async () => {
            try {
                const res = await fetch('/api/demo/status')
                if (!res.ok) return
                const data = await res.json()
                if (cancelled) return
                if (data?.success && data?.data?.hasData === false) {
                    setAutoShow(true)
                }
            } catch {
                // Network/API error — jangan tampilkan modal, biarkan dashboard normal.
            }
        }
        void checkTenantEmpty()
        return () => {
            cancelled = true
        }
    }, [explicitOnboard, role, session?.user])

    if (!showOnboarding) return null

    const persistDismiss = () => {
        try {
            localStorage.setItem(DISMISS_KEY, '1')
        } catch {
            // Ignore — modal tetap tertutup untuk sesi ini via state.
        }
    }

    const stripOnboardParam = () => {
        const url = new URL(window.location.href)
        url.searchParams.delete('onboard')
        router.push(url.pathname)
    }

    const handleLoadDemo = async () => {
        setIsLoading(true)
        setLoadingStep(t('onboarding.preparingData') || 'Menyiapkan data demo...')

        try {
            setLoadingStep(t('onboarding.loadingCategories') || 'Memuat kategori & produk...')
            const res = await fetch('/api/demo/load', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force: false }),
            })

            const data = await res.json()

            if (data.success) {
                setLoadingStep(t('onboarding.demoLoaded') || 'Data demo berhasil dimuat!')
                // Data sudah ada → auto-show tidak akan muncul lagi (hasData=true),
                // tapi dismiss eksplisit agar tidak ada fetch status percuma.
                persistDismiss()
                // Remove onboard param and refresh
                const url = new URL(window.location.href)
                url.searchParams.delete('onboard')
                router.push(url.pathname)
                router.refresh()
            } else {
                setLoadingStep((t('onboarding.demoFailed') || 'Gagal memuat data: ') + (data.error || 'Unknown error'))
                setTimeout(() => {
                    const url = new URL(window.location.href)
                    url.searchParams.delete('onboard')
                    router.push(url.pathname)
                }, 2000)
            }
        } catch {
            setLoadingStep(t('onboarding.error') || 'Terjadi kesalahan. Silakan coba lagi.')
            setTimeout(() => {
                const url = new URL(window.location.href)
                url.searchParams.delete('onboard')
                router.push(url.pathname)
            }, 2000)
        }
    }

    const handleStartFresh = () => {
        persistDismiss()
        if (explicitOnboard) {
            stripOnboardParam()
        } else {
            setAutoShow(false)
        }
    }

    const handleDismiss = () => {
        persistDismiss()
        if (explicitOnboard) {
            stripOnboardParam()
        } else {
            setAutoShow(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl dark:bg-gray-800">
                {isLoading ? (
                    /* Loading State */
                    <div className="text-center">
                        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                            <svg className="h-8 w-8 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('onboarding.loadingDemo') || 'Memuat Data Demo'}</h3>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{loadingStep}</p>
                    </div>
                ) : (
                    /* Choice State */
                    <>
                        <div className="mb-6 text-center">
                            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                                <span className="text-3xl">👋</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('onboarding.welcome') || 'Selamat Datang di Qalcuity!'}</h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                {t('onboarding.description') || 'Mulai dengan data demo untuk menjelajahi semua fitur, atau mulai dari nol dengan data Anda sendiri.'}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={handleLoadDemo}
                                className="w-full rounded-xl border-2 border-blue-200 bg-blue-50 px-6 py-4 text-left transition hover:border-blue-300 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:hover:border-blue-700 dark:hover:bg-blue-900/30"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🧪</span>
                                    <div>
                                        <p className="font-semibold text-blue-900 dark:text-blue-100">{t('onboarding.loadDemo') || 'Muat Data Demo'}</p>
                                        <p className="text-xs text-blue-600 dark:text-blue-300">
                                            {t('onboarding.demoDescription') || '15 produk, 20 kontak, 10 invoice, 12 karyawan, dan lainnya'}
                                        </p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={handleStartFresh}
                                className="w-full rounded-xl border-2 border-gray-200 px-6 py-4 text-left transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-700/50"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">✨</span>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{t('onboarding.startFresh') || 'Mulai dari Nol'}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {t('onboarding.freshDescription') || 'Kosongkan workspace dan tambahkan data Anda sendiri'}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        </div>

                        <div className="mt-4 text-center">
                            <button
                                onClick={handleDismiss}
                                className="text-xs text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline dark:text-gray-500 dark:hover:text-gray-300"
                            >
                                {t('onboarding.dismiss') || 'Lewati untuk sekarang'}
                            </button>
                        </div>

                        <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
                            {t('onboarding.hint') || 'Anda selalu bisa memuat data demo nanti dari menu Pengaturan.'}
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}
