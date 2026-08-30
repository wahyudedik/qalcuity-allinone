'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { getInitials } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useSearchParams } from 'next/navigation'
import { Check, X } from 'lucide-react'

export default function ProfileSettingsPage() {
    const { t } = useTranslation()
    const { update: updateSession } = useSession()
    const searchParams = useSearchParams()
    const [isSaving, setIsSaving] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [demoLoading, setDemoLoading] = useState(false)
    const [demoStatus, setDemoStatus] = useState<string | null>(null)
    const [showDemoConfirm, setShowDemoConfirm] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
    })

    // Auto-open demo section if navigated from onboarding
    useEffect(() => {
        if (searchParams?.get('demo') === 'true') {
            setShowDemoConfirm(true)
        }
    }, [searchParams])

    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/settings/profile')
            const data = await response.json()
            if (data.success) {
                setFormData({
                    name: data.data.name || '',
                    email: data.data.email || '',
                    phone: data.data.company?.phone || '',
                })
            }
        } catch {
            // Fallback: use session data
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchProfile()
    }, [fetchProfile])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value,
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setSaveMessage(null)

        try {
            const response = await fetch('/api/settings/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                }),
            })

            const data = await response.json()

            if (data.success) {
                setSaveMessage({ type: 'success', text: `${t('common.success')}!` })
                await updateSession({ name: formData.name, email: formData.email })
            } else {
                setSaveMessage({ type: 'error', text: data.error || t('common.error') })
            }
        } catch {
            setSaveMessage({ type: 'error', text: t('common.error') })
        } finally {
            setIsSaving(false)
            setTimeout(() => setSaveMessage(null), 3000)
        }
    }

    const handleLoadDemoData = async () => {
        setDemoLoading(true)
        setDemoStatus(null)

        try {
            const res = await fetch('/api/demo/load', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force: false }),
            })

            const data = await res.json()

            if (data.success) {
                const counts = data.data
                const summary = [
                    counts.categories > 0 ? `${counts.categories} kategori` : '',
                    counts.suppliers > 0 ? `${counts.suppliers} supplier` : '',
                    counts.contacts > 0 ? `${counts.contacts} kontak` : '',
                    counts.products > 0 ? `${counts.products} produk` : '',
                    counts.invoices > 0 ? `${counts.invoices} invoice` : '',
                    counts.employees > 0 ? `${counts.employees} karyawan` : '',
                ].filter(Boolean).join(', ')
                setDemoStatus(`Berhasil! ${summary}`)
            } else if (data.skipped) {
                setDemoStatus('Data sudah ada. Gunakan "force: true" untuk memuat ulang.')
            } else {
                setDemoStatus('Gagal: ' + (data.error || 'Unknown error'))
            }
        } catch {
            setDemoStatus('Terjadi kesalahan. Silakan coba lagi.')
        } finally {
            setDemoLoading(false)
            setTimeout(() => setDemoStatus(null), 8000)
        }
    }

    const initials = formData.name ? getInitials(formData.name) : 'U'

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-40 bg-gray-200 rounded-xl mb-4"></div>
                    <div className="h-64 bg-gray-200 rounded-xl"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Save Message */}
            {saveMessage && (
                <div className={`rounded-lg px-4 py-3 text-sm font-medium ${saveMessage.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    <span className="inline-flex items-center gap-1.5">
                        {saveMessage.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        {saveMessage.text}
                    </span>
                </div>
            )}

            {/* Profile Picture */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.profilePicture') || 'Foto Profil'}</h2>
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {initials}
                    </div>
                    <div>
                        <button
                            type="button"
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            {t('settings.uploadPhoto') || 'Ubah Foto'}
                        </button>
                        <p className="text-xs text-gray-500 mt-2">
                            JPG, PNG atau GIF. Maksimal 2MB.
                        </p>
                    </div>
                </div>
            </div>

            {/* Basic Info */}
            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.basicInfo') || 'Informasi Dasar'}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                            {t('settings.fullName') || 'Nama Lengkap'}
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                            {t('settings.emailAddress') || 'Email'}
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
                        />
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                            {t('settings.phoneNumber') || 'Nomor Telepon'}
                        </label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            readOnly
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 mt-1">Telepon diatur di pengaturan perusahaan</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            {t('settings.languageLabel') || 'Bahasa'}
                        </label>
                        <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 bg-white">
                            <option value="id">Bahasa Indonesia</option>
                            <option value="en">English</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            {t('settings.timezoneLabel') || 'Zona Waktu'}
                        </label>
                        <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 bg-white">
                            <option value="WIB">WIB (UTC+7)</option>
                            <option value="WITA">WITA (UTC+8)</option>
                            <option value="WIT">WIT (UTC+9)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            {t('settings.currencyLabel') || 'Mata Uang'}
                        </label>
                        <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 bg-white">
                            <option value="IDR">Rupiah (IDR)</option>
                            <option value="USD">US Dollar (USD)</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={fetchProfile}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        {t('common.cancel') || 'Batal'}
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? (t('settings.saving') || 'Menyimpan...') : (t('settings.saveProfile') || 'Simpan Perubahan')}
                    </button>
                </div>
            </form>

            {/* Demo Data Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Data Demo</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Muat data demo untuk menjelajahi fitur Qalcuity. Data termasuk produk, kontak, invoice, karyawan, dan lainnya.
                </p>

                {demoStatus && (
                    <div className={`rounded-lg px-4 py-3 text-sm font-medium mb-4 ${demoStatus.startsWith('Berhasil')
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        }`}>
                        {demoStatus}
                    </div>
                )}

                {!showDemoConfirm ? (
                    <button
                        onClick={() => setShowDemoConfirm(true)}
                        className="px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                        Muat Data Demo
                    </button>
                ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800 mb-3">
                            <strong>Perhatian:</strong> Data demo hanya akan dimuat jika workspace Anda masih kosong.
                            Jika sudah ada data, muatan demo akan dilewati.
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleLoadDemoData}
                                disabled={demoLoading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {demoLoading ? 'Memuat...' : 'Ya, Muat Data Demo'}
                            </button>
                            <button
                                onClick={() => setShowDemoConfirm(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-xl border border-red-200 p-6">
                <h2 className="text-lg font-semibold text-red-600 mb-2">{t('settings.dangerZone') || 'Zona Bahaya'}</h2>
                <p className="text-sm text-gray-600 mb-4">
                    {t('settings.deleteAccountDesc') || 'Tindakan berikut tidak dapat dibatalkan. Pastikan Anda sudah yakin.'}
                </p>
                <div className="flex items-center gap-4">
                    <button className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        Unduh Data Saya
                    </button>
                    <button className="px-4 py-2.5 border border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                        {t('settings.deleteAccount') || 'Hapus Akun'}
                    </button>
                </div>
            </div>
        </div>
    )
}
