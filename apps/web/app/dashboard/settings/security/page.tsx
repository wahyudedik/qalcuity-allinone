'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { formatDateTime } from '@/lib/utils'
import {
    Key, Shield, Monitor, AlertTriangle, Loader2, CheckCircle, X,
    LogOut, RefreshCw, Smartphone, Globe, Clock, Copy, Check,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// ─── Types ───────────────────────────────────────────────────────────────────

type SessionEntry = {
    id: string
    device: string
    ip: string
    userAgent: string
    isCurrent: boolean
    lastActiveAt: string
    expiresAt: string
    createdAt: string
}

type LoginHistoryEntry = {
    id: string
    email: string
    success: boolean
    device: string
    ip: string
    failureReason: string | null
    createdAt: string
}

type TwoFaStatus = {
    enabled: boolean
    backupCodesRemaining: number
}

type PaginationInfo = {
    page: number
    limit: number
    total: number
    totalPages: number
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SecuritySettingsPage() {
    const { t } = useTranslation()

    // Loading & error states
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Password change state
    const [showChangePassword, setShowChangePassword] = useState(false)
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    })
    const [passwordLoading, setPasswordLoading] = useState(false)
    const [passwordSuccess, setPasswordSuccess] = useState(false)
    const [passwordError, setPasswordError] = useState<string | null>(null)

    // 2FA state
    const [twoFaStatus, setTwoFaStatus] = useState<TwoFaStatus>({ enabled: false, backupCodesRemaining: 0 })
    const [showTwoFaModal, setShowTwoFaModal] = useState(false)
    const [twoFaStep, setTwoFaStep] = useState<'setup' | 'verify'>('setup')
    const [twoFaSecret, setTwoFaSecret] = useState('')
    const [twoFaOtpAuthUri, setTwoFaOtpAuthUri] = useState('')
    const [twoFaManualKey, setTwoFaManualKey] = useState('')
    const [twoFaCode, setTwoFaCode] = useState('')
    const [twoFaLoading, setTwoFaLoading] = useState(false)
    const [twoFaError, setTwoFaError] = useState<string | null>(null)
    const [showTwoFaDisableConfirm, setShowTwoFaDisableConfirm] = useState(false)
    const [twoFaDisablePassword, setTwoFaDisablePassword] = useState('')
    const [twoFaBackupCodes, setTwoFaBackupCodes] = useState<string[]>([])
    const [showBackupCodes, setShowBackupCodes] = useState(false)
    const [copiedKey, setCopiedKey] = useState(false)

    // Sessions state
    const [sessions, setSessions] = useState<SessionEntry[]>([])
    const [sessionsLoading, setSessionsLoading] = useState(true)
    const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false)

    // Login history state
    const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([])
    const [loginHistoryLoading, setLoginHistoryLoading] = useState(true)
    const [loginPagination, setLoginPagination] = useState<PaginationInfo>({
        page: 1, limit: 10, total: 0, totalPages: 0,
    })

    // ─── Toast auto-dismiss ───────────────────────────────────────────────────

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

    // ─── Data Fetching ────────────────────────────────────────────────────────

    const fetchTwoFaStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/settings/security/2fa')
            const data = await res.json()
            if (data.success) {
                setTwoFaStatus(data.data)
            }
        } catch {
            // Silent fail for status check
        }
    }, [])

    const fetchSessions = useCallback(async () => {
        try {
            setSessionsLoading(true)
            const res = await fetch('/api/settings/security/sessions')
            const data = await res.json()
            if (data.success) {
                setSessions(data.data)
            }
        } catch {
            // Silent fail
        } finally {
            setSessionsLoading(false)
        }
    }, [])

    const fetchLoginHistory = useCallback(async (page: number = 1) => {
        try {
            setLoginHistoryLoading(true)
            const res = await fetch(`/api/settings/security/login-history?page=${page}&limit=10`)
            const data = await res.json()
            if (data.success) {
                setLoginHistory(data.data)
                setLoginPagination(data.pagination)
            }
        } catch {
            // Silent fail
        } finally {
            setLoginHistoryLoading(false)
        }
    }, [])

    const fetchAllData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            await Promise.all([
                fetchTwoFaStatus(),
                fetchSessions(),
                fetchLoginHistory(1),
            ])
        } catch {
            setError(t('settings.errorConnectServer'))
        } finally {
            setLoading(false)
        }
    }, [fetchTwoFaStatus, fetchSessions, fetchLoginHistory, t])

    useEffect(() => {
        fetchAllData()
    }, [fetchAllData])

    // ─── Password Change Handler ──────────────────────────────────────────────

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()
        setPasswordError(null)

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError(t('settings.passwordMismatch') || 'Password baru dan konfirmasi tidak cocok')
            return
        }

        if (passwordData.newPassword.length < 8) {
            setPasswordError(t('settings.passwordMinLength') || 'Password minimal 8 karakter')
            return
        }

        try {
            setPasswordLoading(true)
            const res = await fetch('/api/settings/security/password', {
                method: 'POST',
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
                setToast({ message: t('settings.passwordChanged') || 'Password berhasil diubah', type: 'success' })
            } else {
                setPasswordError(data.error || t('settings.errorChangePassword'))
            }
        } catch {
            setPasswordError(t('settings.errorConnectServer'))
        } finally {
            setPasswordLoading(false)
        }
    }

    // ─── 2FA Handlers ─────────────────────────────────────────────────────────

    const handleTwoFaToggle = () => {
        if (twoFaStatus.enabled) {
            setShowTwoFaDisableConfirm(true)
        } else {
            startTwoFaSetup()
        }
    }

    const startTwoFaSetup = async () => {
        try {
            setTwoFaLoading(true)
            setTwoFaError(null)
            setTwoFaCode('')
            const res = await fetch('/api/settings/security/2fa', { method: 'POST' })
            const data = await res.json()
            if (data.success) {
                setTwoFaSecret(data.data.secret)
                setTwoFaOtpAuthUri(data.data.otpAuthUri)
                setTwoFaManualKey(data.data.manualEntryKey)
                setTwoFaStep('setup')
                setShowTwoFaModal(true)
            } else {
                setTwoFaError(data.error)
            }
        } catch {
            setTwoFaError(t('settings.errorConnectServer'))
        } finally {
            setTwoFaLoading(false)
        }
    }

    const handleTwoFaVerify = async () => {
        if (twoFaCode.length !== 6) {
            setTwoFaError(t('settings.twoFaInvalidCode') || 'Kode harus 6 digit')
            return
        }
        setTwoFaLoading(true)
        setTwoFaError(null)
        try {
            const res = await fetch('/api/settings/security/2fa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: twoFaCode, secret: twoFaSecret }),
            })
            const data = await res.json()
            if (data.success) {
                // Show backup codes
                setTwoFaBackupCodes(data.data.backupCodes)
                setShowBackupCodes(true)
                setShowTwoFaModal(false)
                setTwoFaStatus({ enabled: true, backupCodesRemaining: data.data.backupCodesCount })
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

    const handleTwoFaDisable = async () => {
        setTwoFaLoading(true)
        setTwoFaError(null)
        try {
            const res = await fetch('/api/settings/security/2fa', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: twoFaDisablePassword }),
            })
            const data = await res.json()
            if (data.success) {
                setTwoFaStatus({ enabled: false, backupCodesRemaining: 0 })
                setShowTwoFaDisableConfirm(false)
                setTwoFaDisablePassword('')
                setToast({ message: t('settings.twoFaDisabled') || '2FA telah dinonaktifkan', type: 'success' })
            } else {
                setTwoFaError(data.error)
                setToast({ message: data.error || 'Gagal menonaktifkan 2FA', type: 'error' })
            }
        } catch {
            setToast({ message: t('settings.errorConnectServer'), type: 'error' })
        } finally {
            setTwoFaLoading(false)
        }
    }

    const handleCopyKey = () => {
        navigator.clipboard.writeText(twoFaManualKey)
        setCopiedKey(true)
        setTimeout(() => setCopiedKey(false), 2000)
    }

    // ─── Session Handlers ─────────────────────────────────────────────────────

    const handleRevokeSession = async (sessionId: string) => {
        try {
            const res = await fetch('/api/settings/security/sessions', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId }),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: 'Sesi berhasil dinonaktifkan', type: 'success' })
                fetchSessions()
            } else {
                setToast({ message: data.error || 'Gagal menonaktifkan sesi', type: 'error' })
            }
        } catch {
            setToast({ message: t('settings.errorConnectServer'), type: 'error' })
        }
    }

    const handleRevokeAllSessions = async () => {
        try {
            const res = await fetch('/api/settings/security/sessions', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: data.message || 'Semua sesi lain berhasil dinonaktifkan', type: 'success' })
                fetchSessions()
            } else {
                setToast({ message: data.error || 'Gagal menonaktifkan sesi', type: 'error' })
            }
        } catch {
            setToast({ message: t('settings.errorConnectServer'), type: 'error' })
        }
        setShowRevokeAllConfirm(false)
    }

    // ─── Utility ──────────────────────────────────────────────────────────────

    const getDeviceIcon = (userAgent: string) => {
        const ua = userAgent.toLowerCase()
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
            return <Smartphone className="w-4 h-4" />
        }
        if (ua.includes('chrome') || ua.includes('firefox') || ua.includes('safari')) {
            return <Globe className="w-4 h-4" />
        }
        return <Monitor className="w-4 h-4" />
    }

    const formatRelativeTime = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMin = Math.floor(diffMs / 60000)
        const diffHour = Math.floor(diffMs / 3600000)
        const diffDay = Math.floor(diffMs / 86400000)

        if (diffMin < 1) return 'Baru saja'
        if (diffMin < 60) return `${diffMin} menit lalu`
        if (diffHour < 24) return `${diffHour} jam lalu`
        if (diffDay < 7) return `${diffDay} hari lalu`
        return formatDateTime(dateStr)
    }

    // ─── Loading State ────────────────────────────────────────────────────────

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

    // ─── Render ───────────────────────────────────────────────────────────────

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
                    <button onClick={() => setError(null)} className="text-sm text-red-600 hover:text-red-800 font-medium">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* SECTION: Password Change                                           */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Key className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900">{t('settings.changePassword') || 'Password'}</h3>
                            <p className="text-sm text-gray-500">
                                {t('settings.lastChanged') || 'Terakhir diubah'}: {formatDateTime(new Date().toISOString())}
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

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* SECTION: Two-Factor Authentication (2FA)                           */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${twoFaStatus.enabled ? 'bg-green-100' : 'bg-yellow-100'}`}>
                            <Shield className={`w-5 h-5 ${twoFaStatus.enabled ? 'text-green-600' : 'text-yellow-600'}`} />
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900">{t('settings.twoFactor') || 'Two-Factor Authentication (2FA)'}</h3>
                            <p className="text-sm text-gray-500">{t('settings.twoFactorDesc') || 'Tambahkan lapisan keamanan ekstra ke akun Anda'}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleTwoFaToggle}
                        disabled={twoFaLoading}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${twoFaStatus.enabled
                                ? 'border border-red-300 text-red-700 hover:bg-red-50'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                    >
                        {twoFaLoading && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}
                        {twoFaStatus.enabled ? (t('settings.disable2fa') || 'Nonaktifkan 2FA') : (t('settings.enable2fa') || 'Aktifkan 2FA')}
                    </button>
                </div>
                {twoFaStatus.enabled ? (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm text-green-800 font-medium">{t('settings.twoFactorActive') || '2FA aktif'}</p>
                                <p className="text-sm text-green-700 mt-1">
                                    {t('settings.twoFactorActiveDesc') || 'Akun Anda dilindungi dengan Two-Factor Authentication.'}
                                </p>
                                {twoFaStatus.backupCodesRemaining > 0 && (
                                    <p className="text-xs text-green-600 mt-2">
                                        {twoFaStatus.backupCodesRemaining} kode backup tersisa
                                    </p>
                                )}
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

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* SECTION: Active Sessions                                           */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Monitor className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900">{t('settings.activeSessions') || 'Sesi Aktif'}</h3>
                            <p className="text-sm text-gray-500">{t('settings.activeSessionsDesc') || 'Perangkat yang sedang login ke akun Anda'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchSessions}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        {sessions.filter(s => !s.isCurrent).length > 0 && (
                            <button
                                onClick={() => setShowRevokeAllConfirm(true)}
                                className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                            >
                                Nonaktifkan Semua Sesi Lain
                            </button>
                        )}
                    </div>
                </div>

                {sessionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-8">
                        <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">Tidak ada sesi aktif</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sessions.map((session) => (
                            <div
                                key={session.id}
                                className={`flex items-center justify-between p-4 rounded-lg border ${session.isCurrent
                                        ? 'border-green-200 bg-green-50'
                                        : 'border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                        {getDeviceIcon(session.userAgent)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900 text-sm">{session.device}</span>
                                            {session.isCurrent && (
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                                    {t('settings.currentSession') || 'Sesi ini'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {session.ip} &middot; {formatRelativeTime(session.lastActiveAt)}
                                        </div>
                                    </div>
                                </div>
                                {!session.isCurrent && (
                                    <button
                                        onClick={() => handleRevokeSession(session.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Nonaktifkan sesi ini"
                                    >
                                        <LogOut className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* SECTION: Login History                                             */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">{t('settings.loginHistory') || 'Riwayat Login'}</h3>
                    <span className="text-xs text-gray-500">{loginPagination.total} total percobaan</span>
                </div>

                {loginHistoryLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    </div>
                ) : loginHistory.length === 0 ? (
                    <div className="text-center py-8">
                        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">{t('settings.noLoginHistory') || 'Belum ada riwayat login'}</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {loginHistory.map((entry) => (
                                <div key={entry.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full ${entry.success ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <div>
                                            <div className="text-sm text-gray-900">
                                                {entry.success
                                                    ? (t('settings.loginSuccess') || 'Login berhasil')
                                                    : (t('settings.loginFailed') || 'Login gagal')
                                                }
                                                {entry.failureReason && (
                                                    <span className="text-xs text-red-500 ml-2">({entry.failureReason})</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {entry.device} &middot; {entry.ip}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-500">{formatDateTime(entry.createdAt)}</div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {loginPagination.totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                <span className="text-xs text-gray-500">
                                    Halaman {loginPagination.page} dari {loginPagination.totalPages}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => fetchLoginHistory(loginPagination.page - 1)}
                                        disabled={loginPagination.page <= 1}
                                        className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Sebelumnya
                                    </button>
                                    <button
                                        onClick={() => fetchLoginHistory(loginPagination.page + 1)}
                                        disabled={loginPagination.page >= loginPagination.totalPages}
                                        className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Berikutnya
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* MODALS                                                             */}
            {/* ═══════════════════════════════════════════════════════════════════ */}

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

                                {/* QR Code placeholder with otpauth URI */}
                                <div className="flex justify-center py-4">
                                    <div className="w-48 h-48 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                                        <div className="text-center px-4">
                                            <Shield className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                                            <p className="text-xs text-gray-500 mb-2">Scan QR di authenticator app</p>
                                            <p className="text-[10px] text-gray-400 break-all font-mono leading-tight">
                                                {twoFaOtpAuthUri.substring(0, 60)}...
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Manual entry key */}
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-2">
                                        {t('settings.twoFaManualEntry') || 'Atau masukkan kode manual:'}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-medium text-gray-700 text-sm tracking-wider flex-1 break-all">
                                            {twoFaManualKey}
                                        </span>
                                        <button
                                            onClick={handleCopyKey}
                                            className="p-1.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                                            title="Salin kode"
                                        >
                                            {copiedKey ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button onClick={() => setShowTwoFaModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                        {t('common.cancel') || 'Batal'}
                                    </button>
                                    <button onClick={() => setTwoFaStep('verify')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
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

            {/* Backup Codes Modal */}
            {showBackupCodes && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Kode Backup</h3>
                            <button onClick={() => setShowBackupCodes(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-yellow-800 font-medium">
                                Simpan kode backup ini di tempat yang aman!
                            </p>
                            <p className="text-xs text-yellow-700 mt-1">
                                Kode ini hanya ditampilkan sekali. Gunakan jika Anda kehilangan akses ke aplikasi authenticator.
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <div className="grid grid-cols-2 gap-2">
                                {twoFaBackupCodes.map((code, index) => (
                                    <div key={index} className="font-mono text-sm text-gray-700 bg-white px-3 py-2 rounded border border-gray-200">
                                        {code}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(twoFaBackupCodes.join('\n'))
                                    setToast({ message: 'Kode backup disalin ke clipboard', type: 'success' })
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                            >
                                <Copy className="w-4 h-4" />
                                Salin Semua Kode
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Disable 2FA Confirm Dialog */}
            <ConfirmDialog
                isOpen={showTwoFaDisableConfirm}
                onClose={() => {
                    setShowTwoFaDisableConfirm(false)
                    setTwoFaDisablePassword('')
                    setTwoFaError(null)
                }}
                onConfirm={handleTwoFaDisable}
                title="Nonaktifkan 2FA"
                message={t('settings.confirmDisable2fa') || 'Masukkan password Anda untuk menonaktifkan 2FA. Semua sesi aktif akan dinonaktifkan.'}
                confirmText="Nonaktifkan"
                variant="warning"
            />

            {/* Revoke All Sessions Confirm Dialog */}
            <ConfirmDialog
                isOpen={showRevokeAllConfirm}
                onClose={() => setShowRevokeAllConfirm(false)}
                onConfirm={handleRevokeAllSessions}
                title="Nonaktifkan Semua Sesi Lain"
                message="Semua sesi login di perangkat lain akan dinonaktifkan. Anda tetap login di sesi ini."
                confirmText="Nonaktifkan Semua"
                variant="warning"
            />

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                    {toast.message}
                </div>
            )}
        </div>
    )
}
