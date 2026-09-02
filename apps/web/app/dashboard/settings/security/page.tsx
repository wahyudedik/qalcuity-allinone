'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { formatDateTime } from '@/lib/utils'
import { Key, Shield, Monitor, AlertTriangle, Loader2, CheckCircle, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

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

    // 2FA state
    const [twoFaEnabled, setTwoFaEnabled] = useState(false)
    const [showTwoFaModal, setShowTwoFaModal] = useState(false)
    const [twoFaStep, setTwoFaStep] = useState<'setup' | 'verify'>('setup')
    const [twoFaCode, setTwoFaCode] = useState('')
    const [twoFaLoading, setTwoFaLoading] = useState(false)
    const [twoFaError, setTwoFaError] = useState<string | null>(null)
    const [showTwoFaDisableConfirm, setShowTwoFaDisableConfirm] = useState(false)

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

    const handleTwoFaToggle = () => {
        if (twoFaEnabled) {
            // Show disable 2FA confirmation
            setShowTwoFaDisableConfirm(true)
        } else {
            // Start 2FA setup
            setTwoFaStep('setup')
            setTwoFaCode('')
            setTwoFaError(null)
            setShowTwoFaModal(true)
        }
    }

    const handleTwoFaSetup = () => {
        setTwoFaStep('verify')
    }

    const handleTwoFaVerify = async () => {
        if (twoFaCode.length !== 6) {
            setTwoFaError(t('settings.twoFaInvalidCode') || 'Kode harus 6 digit')
            return
        }
        setTwoFaLoading(true)
        setTwoFaError(null)
        try {
            const res = await fetch('/api/settings/security', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'enable2fa', code: twoFaCode }),
            })
            const data = await res.json()
            if (data.success) {
                setTwoFaEnabled(true)
                setShowTwoFaModal(false)
                setToast({ message: t('settings.twoFaEnabled') || '2FA berhasil diaktifkan', type: 'success' })
            } else {
                setTwoFaError(data.error || t('settings.twoFaVerifyFailed') || 'Kode verifikasi salah')
            }
        } catch {
            setTwoFaError(t('settings.errorConnectServer'))
        } finally {
            setTwoFaLoading(false)
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
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${twoFaEnabled ? 'bg-green-100' : 'bg-yellow-100'}`}>
                            <Shield className={`w-5 h-5 ${twoFaEnabled ? 'text-green-600' : 'text-yellow-600'}`} />
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900">{t('settings.twoFactor') || 'Two-Factor Authentication (2FA)'}</h3>
                            <p className="text-sm text-gray-500">{t('settings.twoFactorDesc') || 'Tambahkan lapisan keamanan ekstra ke akun Anda'}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleTwoFaToggle}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${twoFaEnabled
                            ? 'border border-red-300 text-red-700 hover:bg-red-50'
                            : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                    >
                        {twoFaEnabled ? (t('settings.disable2fa') || 'Nonaktifkan 2FA') : (t('settings.enable2fa') || 'Aktifkan 2FA')}
                    </button>
                </div>
                {twoFaEnabled ? (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm text-green-800 font-medium">{t('settings.twoFactorActive') || '2FA aktif'}</p>
                                <p className="text-sm text-green-700 mt-1">
                                    {t('settings.twoFactorActiveDesc') || 'Akun Anda dilindungi dengan Two-Factor Authentication.'}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
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
                )}
            </div>

            {/* 2FA Setup Modal */}
            {showTwoFaModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {twoFaStep === 'setup' ? (t('settings.twoFaSetupTitle') || 'Aktifkan 2FA') : (t('settings.twoFaVerifyTitle') || 'Verifikasi Kode')}
                            </h3>
                            <button onClick={() => setShowTwoFaModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {twoFaError && (
                            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm text-red-700">{twoFaError}</p>
                            </div>
                        )}

                        {twoFaStep === 'setup' ? (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600">
                                    {t('settings.twoFaSetupDesc') || 'Gunakan aplikasi authenticator seperti Google Authenticator atau Authy untuk memindai kode QR berikut.'}
                                </p>
                                <div className="flex justify-center py-4">
                                    <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                                        <div className="text-center">
                                            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                            <p className="text-xs text-gray-500">{t('settings.twoFaQrPlaceholder') || 'QR Code akan muncul di sini'}</p>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 text-center">
                                    {t('settings.twoFaManualEntry') || 'Atau masukkan kode manual: '}<span className="font-mono font-medium text-gray-700">JBSWY3DPEHPK3PXP</span>
                                </p>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button onClick={() => setShowTwoFaModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                        {t('common.cancel') || 'Batal'}
                                    </button>
                                    <button onClick={handleTwoFaSetup} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                                        {t('settings.next') || 'Selanjutnya'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600">
                                    {t('settings.twoFaVerifyDesc') || 'Masukkan 6 digit kode dari aplikasi authenticator Anda.'}
                                </p>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        {t('settings.twoFaCode') || 'Kode Verifikasi'}
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={twoFaCode}
                                        onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-[0.5em] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="000000"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button onClick={() => setTwoFaStep('setup')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                        {t('common.back') || 'Kembali'}
                                    </button>
                                    <button
                                        onClick={handleTwoFaVerify}
                                        disabled={twoFaLoading || twoFaCode.length !== 6}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {twoFaLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {t('settings.verifyAndEnable') || 'Verifikasi & Aktifkan'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

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

            {/* Disable 2FA Confirm Dialog */}
            <ConfirmDialog
                isOpen={showTwoFaDisableConfirm}
                onClose={() => setShowTwoFaDisableConfirm(false)}
                onConfirm={() => {
                    setShowTwoFaDisableConfirm(false)
                    setTwoFaEnabled(false)
                    setToast({ message: t('settings.twoFaDisabled') || '2FA telah dinonaktifkan', type: 'success' })
                }}
                title="Nonaktifkan 2FA"
                message={t('settings.confirmDisable2fa') || 'Apakah Anda yakin ingin menonaktifkan 2FA?'}
                confirmText="Nonaktifkan"
                variant="warning"
            />

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.message}
                </div>
            )}
        </div>
    )
}
