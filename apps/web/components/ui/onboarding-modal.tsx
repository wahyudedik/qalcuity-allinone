'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function OnboardingModal() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const showOnboarding = searchParams?.get('onboard') === 'true'
    const [isLoading, setIsLoading] = useState(false)
    const [loadingStep, setLoadingStep] = useState('')

    if (!showOnboarding) return null

    const handleLoadDemo = async () => {
        setIsLoading(true)
        setLoadingStep('Menyiapkan data demo...')

        try {
            setLoadingStep('Memuat kategori & produk...')
            const res = await fetch('/api/demo/load', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force: false }),
            })

            const data = await res.json()

            if (data.success) {
                setLoadingStep('Data demo berhasil dimuat!')
                // Remove onboard param and refresh
                const url = new URL(window.location.href)
                url.searchParams.delete('onboard')
                router.push(url.pathname)
                router.refresh()
            } else {
                setLoadingStep('Gagal memuat data: ' + (data.error || 'Unknown error'))
                setTimeout(() => {
                    const url = new URL(window.location.href)
                    url.searchParams.delete('onboard')
                    router.push(url.pathname)
                }, 2000)
            }
        } catch {
            setLoadingStep('Terjadi kesalahan. Silakan coba lagi.')
            setTimeout(() => {
                const url = new URL(window.location.href)
                url.searchParams.delete('onboard')
                router.push(url.pathname)
            }, 2000)
        }
    }

    const handleStartFresh = () => {
        const url = new URL(window.location.href)
        url.searchParams.delete('onboard')
        router.push(url.pathname)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
                {isLoading ? (
                    /* Loading State */
                    <div className="text-center">
                        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                            <svg className="h-8 w-8 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Memuat Data Demo</h3>
                        <p className="mt-2 text-sm text-gray-500">{loadingStep}</p>
                    </div>
                ) : (
                    /* Choice State */
                    <>
                        <div className="mb-6 text-center">
                            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                                <span className="text-3xl">👋</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Selamat Datang di Qalcuity!</h3>
                            <p className="mt-2 text-sm text-gray-500">
                                Mulai dengan data demo untuk menjelajahi semua fitur, atau mulai dari nol dengan data Anda sendiri.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={handleLoadDemo}
                                className="w-full rounded-xl border-2 border-blue-200 bg-blue-50 px-6 py-4 text-left transition hover:border-blue-300 hover:bg-blue-100"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🧪</span>
                                    <div>
                                        <p className="font-semibold text-blue-900">Muat Data Demo</p>
                                        <p className="text-xs text-blue-600">
                                            15 produk, 20 kontak, 10 invoice, 12 karyawan, dan lainnya
                                        </p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={handleStartFresh}
                                className="w-full rounded-xl border-2 border-gray-200 px-6 py-4 text-left transition hover:border-gray-300 hover:bg-gray-50"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">✨</span>
                                    <div>
                                        <p className="font-semibold text-gray-900">Mulai dari Nol</p>
                                        <p className="text-xs text-gray-500">
                                            Kosongkan workspace dan tambahkan data Anda sendiri
                                        </p>
                                    </div>
                                </div>
                            </button>
                        </div>

                        <p className="mt-4 text-center text-xs text-gray-400">
                            Anda selalu bisa memuat data demo nanti dari menu Settings.
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}
