'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { formatDateTime } from '@/lib/utils'
import { Key, Shield, Monitor, AlertTriangle, Loader2, CheckCircle, X } from 'lucide-react'

type LoginHistoryEntry = {
    id: string
    success: boolean
    device: string
    ip: string
    location: string
    createdAt: string
}

export default function SecuritySettingsPage() {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [lastPasswordChange, setLastPasswordChange] = useState<string>('')
    const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([])

    const [showChangePassword, setShowChangePassword] = useState(false)
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    })
    const [passwordLoading, setPasswordLoading] = useState(false)
    const [passwordSuccess, setPasswordSuccess] = useState(false)
    const [passwordError, setPasswordError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        fetchSecurityData()
    }, [])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    useEffect(() => {
        if (passwordSuccess) {
            const timer = setTimeout(() => setPasswordSuccess(false), 3000)
            return () => clearTimeout(timer)
        }
    }, [passwordSuccess])

    const fetchSecurityData = async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/settings/security')
            const data = await res.json()
            if (data.success) {
                setLastPasswordChange(data.data.user.lastPasswordChange)
                setLoginHistory(data.data.loginHistory || [])
            } else {
                setError(data.error || t('settings.errorLoadSecurity'))
            }
        } catch {
            setError(t('settings.errorConnectServer'))
        } finally {
            setLoading(false)
        }
    }

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()
        setPasswordError(null)

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError(t('settings.passwordMismatch'))
            return
        }

        try {
            setPasswordLoading(true)
            const res = await fetch('/api/settings/security', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword,
                }),
            })
            const data = await res.json()
            if (data.success) {
                setShowChangePassword(false)
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                setPasswordSuccess(true)
                setToast({ message: t('settings.passwordChanged'), type: 'success' })
                fetchSecurityData()
            } else {
                setPasswordError(data.error || t('settings.errorChangePassword'))
            }
        } catch {
            setPasswordError(t('settings.errorConnectServer'))
        } finally {
            setPasswordLoading(false)
        }
    }


    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">{t('settings.securityTitle') || 'Keamanan'}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {t('settings.securitySubtitle') || 'Kelola password dan keamanan akun Anda'}
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                    <p className="text-sm text-gray-500">{t('settings.loadingSecurity')}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('settings.securityTitle') || 'Keamanan'}</h2>
                <p className="text-sm text-gray-600 mt-1">
                    {t('settings.securitySubtitle') || 'Kelola password dan keamanan akun Anda'}
                </p>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <p className="text-sm text-red-700 flex-1">{error}</p>
                    <button onClick={() => setError(null)} className="text-sm text-red-600 hover:text-red-800 font-medium"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Password */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Key className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900">{t('settings.changePassword') || 'Password'}</h3>
                            <p className="text-sm text-gray-500">
                                {t('settings.lastChanged') || 'Terakhir diubah'}: {lastPasswordChange ? formatDateTime(lastPasswordChange) : 'N/A'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {passwordSuccess && (
                            <span className="text-sm text-green-600 flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                {t('settings.saved')}
                            </span>
                        )}
                        <button
                            onClick={() => setShowChangePassword(!showChangePassword)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            {t('settings.changePassword') || 'Ubah Password'}
                        </button>
                    </div>
                </div>

                {showChangePassword && (
                    <form onSubmit={handlePasswordChange} className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                        {passwordError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm text-red-700">{passwordError}</p>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                {t('settings.currentPassword') || 'Password Saat Ini'}
                            </label>
                            <input
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                                className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                {t('settings.newPassword') || 'Password Baru'}
                            </label>
                            <input
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                                required
                                minLength={8}
                            />
                            <p className="text-xs text-gray-500 mt-1">{t('settings.passwordMinLength')}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                {t('settings.confirmNewPassword') || 'Konfirmasi Password Baru'}
                            </label>
                            <input
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowChangePassword(false)
                                    setPasswordError(null)
                                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                {t('common.cancel') || 'Batal'}
                            </button>
                            <button
                                type="submit"
                                disabled={passwordLoading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {passwordLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('settings.savePassword') || 'Simpan Password'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Two-Factor Authentication */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Shield className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900">{t('settings.twoFactor') || 'Two-Factor Authentication (2FA)'}</h3>
                            <p className="text-sm text-gray-500">{t('settings.twoFactorDesc') || 'Tambahkan lapisan keamanan ekstra ke akun Anda'}</p>
                        </div>
                    </div>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                        {t('settings.enable2fa') || 'Aktifkan 2FA'}
                    </button>
                </div>
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm text-yellow-800 font-medium">{t('settings.twoFactorNotActive') || '2FA belum aktif'}</p>
                            <p className="text-sm text-yellow-700 mt-1">
                                {t('settings.twoFactorWarning') || 'Kami sangat menyarankan untuk mengaktifkan 2FA untuk keamanan akun yang lebih baik.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Sessions - Current Session Only */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-medium text-gray-900">{t('settings.activeSessions') || 'Sesi Aktif'}</h3>
                        <p className="text-sm text-gray-500">{t('settings.activeSessionsDesc') || 'Perangkat yang sedang login ke akun Anda'}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-lg border border-green-200 bg-green-50">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Monitor className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">{t('settings.currentSessionLabel')}</span>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                        {t('settings.currentSession') || 'Sesi ini'}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-500 mt-0.5">
                                    {t('settings.browserLocation')}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-500">{t('settings.now')}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Login History */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-medium text-gray-900 mb-4">{t('settings.loginHistory') || 'Riwayat Login'}</h3>
                <div className="space-y-3">
                    {loginHistory.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">{t('settings.noLoginHistory')}</p>
                    ) : (
                        loginHistory.map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${entry.success ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <div>
                                        <div className="text-sm text-gray-900">
                                            {entry.success
                                                ? (t('settings.loginSuccess') || 'Login berhasil')
                                                : (t('settings.loginFailed') || 'Login gagal')
                                            }
                                        </div>
                                        <div className="text-xs text-gray-500">{entry.device} • {entry.ip}</div>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500">{formatDateTime(entry.createdAt)}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.message}
                </div>
            )}
        </div>
    )
}
