'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import {
    Shield,
    Lock,
    Key,
    Clock,
    AlertTriangle,
    Loader2,
    CheckCircle,
    X,
    Save,
    Eye,
    EyeOff,
    History,
    RefreshCw,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PasswordPolicyData {
    id: string
    tenantId: string
    minLength: number
    maxLength: number
    requireUppercase: boolean
    requireLowercase: boolean
    requireNumbers: boolean
    requireSpecialChars: boolean
    specialChars: string
    preventReuse: number
    expiryDays: number
    warnBeforeExpiryDays: number
    maxFailedAttempts: number
    lockoutDurationMinutes: number
    createdAt: string
    updatedAt: string
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PasswordPolicyPage() {
    const { t } = useTranslation()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showPreview, setShowPreview] = useState(true)

    const [formData, setFormData] = useState({
        minLength: 8,
        maxLength: 128,
        requireUppercase: false,
        requireLowercase: false,
        requireNumbers: false,
        requireSpecialChars: false,
        specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        preventReuse: 0,
        expiryDays: 0,
        warnBeforeExpiryDays: 7,
        maxFailedAttempts: 5,
        lockoutDurationMinutes: 30,
    })

    // ─── Fetch Policy ────────────────────────────────────────────────────────

    useEffect(() => {
        fetchPolicy()
    }, [])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchPolicy = async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/settings/password-policy')
            const data = await res.json()
            if (data.success && data.data) {
                const d = data.data as PasswordPolicyData
                setFormData({
                    minLength: d.minLength,
                    maxLength: d.maxLength,
                    requireUppercase: d.requireUppercase,
                    requireLowercase: d.requireLowercase,
                    requireNumbers: d.requireNumbers,
                    requireSpecialChars: d.requireSpecialChars,
                    specialChars: d.specialChars,
                    preventReuse: d.preventReuse,
                    expiryDays: d.expiryDays,
                    warnBeforeExpiryDays: d.warnBeforeExpiryDays,
                    maxFailedAttempts: d.maxFailedAttempts,
                    lockoutDurationMinutes: d.lockoutDurationMinutes,
                })
            } else {
                setError(data.error || t('settings.passwordPolicy.errorLoad') || 'Gagal memuat kebijakan sandi')
            }
        } catch {
            setError(t('settings.passwordPolicy.errorConnect') || 'Gagal terhubung ke server')
        } finally {
            setLoading(false)
        }
    }

    // ─── Handle Changes ──────────────────────────────────────────────────────

    const handleNumberChange = (field: string, value: string) => {
        const num = parseInt(value, 10)
        if (!isNaN(num)) {
            setFormData(prev => ({ ...prev, [field]: num }))
        } else if (value === '') {
            setFormData(prev => ({ ...prev, [field]: 0 }))
        }
    }

    const handleToggle = (field: string) => {
        setFormData(prev => ({ ...prev, [field]: !prev[field as keyof typeof prev] }))
    }

    // ─── Save Policy ─────────────────────────────────────────────────────────

    const handleSave = async () => {
        try {
            setSaving(true)
            setError(null)

            const res = await fetch('/api/settings/password-policy', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            const data = await res.json()

            if (data.success) {
                setToast({
                    message: t('settings.passwordPolicy.saved') || 'Kebijakan sandi berhasil disimpan',
                    type: 'success',
                })
            } else {
                setToast({
                    message: data.error || t('settings.passwordPolicy.errorSave') || 'Gagal menyimpan kebijakan sandi',
                    type: 'error',
                })
            }
        } catch {
            setToast({
                message: t('settings.passwordPolicy.errorConnect') || 'Gagal terhubung ke server',
                type: 'error',
            })
        } finally {
            setSaving(false)
        }
    }

    // ─── Active Rules Preview ────────────────────────────────────────────────

    const getActiveRules = () => {
        const rules: string[] = []
        rules.push(`${t('settings.passwordPolicy.minLength') || 'Panjang minimum'}: ${formData.minLength} karakter`)
        rules.push(`${t('settings.passwordPolicy.maxLength') || 'Panjang maksimum'}: ${formData.maxLength} karakter`)
        if (formData.requireUppercase) rules.push(t('settings.passwordPolicy.requireUppercase') || 'Harus ada huruf besar')
        if (formData.requireLowercase) rules.push(t('settings.passwordPolicy.requireLowercase') || 'Harus ada huruf kecil')
        if (formData.requireNumbers) rules.push(t('settings.passwordPolicy.requireNumbers') || 'Harus ada angka')
        if (formData.requireSpecialChars) rules.push(t('settings.passwordPolicy.requireSpecialChars') || 'Harus ada karakter spesial')
        if (formData.preventReuse > 0) rules.push(`${t('settings.passwordPolicy.preventReuse') || 'Cegah penggunaan ulang'}: ${formData.preventReuse} sandi terakhir`)
        if (formData.expiryDays > 0) {
            rules.push(`${t('settings.passwordPolicy.expiryDays') || 'Kedaluwarsa'}: ${formData.expiryDays} hari`)
        } else {
            rules.push(t('settings.passwordPolicy.noExpiry') || 'Sandi tidak kedaluwarsa')
        }
        if (formData.maxFailedAttempts > 0) {
            rules.push(`${t('settings.passwordPolicy.maxFailedAttempts') || 'Batas percobaan gagal'}: ${formData.maxFailedAttempts} kali → ${formData.lockoutDurationMinutes} menit`)
        }
        return rules
    }

    // ─── Render ──────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-64"></div>
                    <div className="h-4 bg-gray-200 rounded w-96"></div>
                    <div className="h-64 bg-gray-200 rounded-xl"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-4xl">
            {/* Toast */}
            {toast && (
                <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    <span className="text-sm font-medium">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-auto">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="mb-4 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-sm">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Shield className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {t('settings.passwordPolicy.title') || 'Kebijakan Sandi'}
                        </h1>
                        <p className="text-gray-500 text-sm">
                            {t('settings.passwordPolicy.description') || 'Konfigurasi aturan keamanan sandi untuk tenant ini'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* ─── Complexity Rules ─────────────────────────────────────── */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Key className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            {t('settings.passwordPolicy.complexity') || 'Aturan Kompleksitas'}
                        </h2>
                    </div>

                    {/* Length */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.passwordPolicy.minLength') || 'Panjang Minimum'}
                            </label>
                            <input
                                type="number"
                                min={4}
                                max={64}
                                value={formData.minLength}
                                onChange={(e) => handleNumberChange('minLength', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.passwordPolicy.maxLength') || 'Panjang Maksimum'}
                            </label>
                            <input
                                type="number"
                                min={8}
                                max={256}
                                value={formData.maxLength}
                                onChange={(e) => handleNumberChange('maxLength', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="space-y-3">
                        <ToggleRow
                            label={t('settings.passwordPolicy.requireUppercase') || 'Harus ada huruf besar (A-Z)'}
                            checked={formData.requireUppercase}
                            onToggle={() => handleToggle('requireUppercase')}
                        />
                        <ToggleRow
                            label={t('settings.passwordPolicy.requireLowercase') || 'Harus ada huruf kecil (a-z)'}
                            checked={formData.requireLowercase}
                            onToggle={() => handleToggle('requireLowercase')}
                        />
                        <ToggleRow
                            label={t('settings.passwordPolicy.requireNumbers') || 'Harus ada angka (0-9)'}
                            checked={formData.requireNumbers}
                            onToggle={() => handleToggle('requireNumbers')}
                        />
                        <ToggleRow
                            label={t('settings.passwordPolicy.requireSpecialChars') || 'Harus ada karakter spesial'}
                            checked={formData.requireSpecialChars}
                            onToggle={() => handleToggle('requireSpecialChars')}
                        />
                        {formData.requireSpecialChars && (
                            <div className="ml-8 mt-2">
                                <label className="block text-xs text-gray-500 mb-1">
                                    {t('settings.passwordPolicy.specialChars') || 'Karakter spesial yang diizinkan'}
                                </label>
                                <input
                                    type="text"
                                    value={formData.specialChars}
                                    onChange={(e) => setFormData(prev => ({ ...prev, specialChars: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── History & Expiry ─────────────────────────────────────── */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <History className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            {t('settings.passwordPolicy.historyExpiry') || 'Riwayat & Kedaluwarsa'}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.passwordPolicy.preventReuse') || 'Cegah Penggunaan Ulang'}
                            </label>
                            <p className="text-xs text-gray-500 mb-1">
                                {t('settings.passwordPolicy.preventReuseDesc') || 'Jumlah sandi sebelumnya yang tidak boleh digunakan kembali (0 = nonaktif)'}
                            </p>
                            <input
                                type="number"
                                min={0}
                                max={24}
                                value={formData.preventReuse}
                                onChange={(e) => handleNumberChange('preventReuse', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.passwordPolicy.expiryDays') || 'Kedaluwarsa (Hari)'}
                            </label>
                            <p className="text-xs text-gray-500 mb-1">
                                {t('settings.passwordPolicy.noExpiry') || '0 = tidak pernah kedaluwarsa'}
                            </p>
                            <input
                                type="number"
                                min={0}
                                max={365}
                                value={formData.expiryDays}
                                onChange={(e) => handleNumberChange('expiryDays', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>
                        {formData.expiryDays > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('settings.passwordPolicy.warnBeforeExpiryDays') || 'Peringatan Sebelum Kedaluwarsa (Hari)'}
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    max={90}
                                    value={formData.warnBeforeExpiryDays}
                                    onChange={(e) => handleNumberChange('warnBeforeExpiryDays', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Lockout ─────────────────────────────────────────────── */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Lock className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            {t('settings.passwordPolicy.lockout') || 'Penguncian Akun'}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.passwordPolicy.maxFailedAttempts') || 'Maks. Percobaan Gagal'}
                            </label>
                            <p className="text-xs text-gray-500 mb-1">
                                {t('settings.passwordPolicy.maxFailedAttemptsDesc') || '0 = nonaktif penguncian'}
                            </p>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={formData.maxFailedAttempts}
                                onChange={(e) => handleNumberChange('maxFailedAttempts', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.passwordPolicy.lockoutDurationMinutes') || 'Durasi Penguncian (Menit)'}
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={1440}
                                value={formData.lockoutDurationMinutes}
                                onChange={(e) => handleNumberChange('lockoutDurationMinutes', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* ─── Preview ─────────────────────────────────────────────── */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="flex items-center gap-2 w-full text-left"
                    >
                        {showPreview ? <EyeOff className="w-5 h-5 text-gray-600" /> : <Eye className="w-5 h-5 text-gray-600" />}
                        <h2 className="text-lg font-semibold text-gray-900">
                            {t('settings.passwordPolicy.preview') || 'Pratinjau Aturan Aktif'}
                        </h2>
                    </button>

                    {showPreview && (
                        <div className="mt-4 space-y-2">
                            {getActiveRules().map((rule, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    <span>{rule}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ─── Save Button ─────────────────────────────────────────── */}
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {t('settings.saving') || 'Menyimpan...'}
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {t('settings.passwordPolicy.save') || 'Simpan Kebijakan'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Toggle Row Component ────────────────────────────────────────────────────

function ToggleRow({
    label,
    checked,
    onToggle,
}: {
    label: string
    checked: boolean
    onToggle: () => void
}) {
    return (
        <button
            onClick={onToggle}
            className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
            <span className="text-sm text-gray-700">{label}</span>
            <div className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
            </div>
        </button>
    )
}
