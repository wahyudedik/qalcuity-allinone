'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { Key, Shield, Monitor, AlertTriangle } from 'lucide-react'

export default function SecuritySettingsPage() {
    const { t } = useTranslation()
    const [showChangePassword, setShowChangePassword] = useState(false)
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    })

    const sessions = [
        {
            id: 1,
            device: 'Chrome on Windows',
            ip: '103.28.12.xxx',
            location: 'Jakarta, Indonesia',
            lastActive: 'Sekarang',
            current: true,
        },
        {
            id: 2,
            device: 'Safari on iPhone',
            ip: '36.95.xxx.xxx',
            location: 'Jakarta, Indonesia',
            lastActive: '2 jam lalu',
            current: false,
        },
        {
            id: 3,
            device: 'Chrome on Mac',
            ip: '114.124.xxx.xxx',
            location: 'Bandung, Indonesia',
            lastActive: '3 hari lalu',
            current: false,
        },
    ]

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()
        setShowChangePassword(false)
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('settings.securityTitle') || 'Keamanan'}</h2>
                <p className="text-sm text-gray-600 mt-1">
                    {t('settings.securitySubtitle') || 'Kelola password dan keamanan akun Anda'}
                </p>
            </div>

            {/* Password */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Key className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900">{t('settings.changePassword') || 'Password'}</h3>
                            <p className="text-sm text-gray-500">{t('settings.lastChanged') || 'Terakhir diubah'}: 15 Juli 2026</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowChangePassword(!showChangePassword)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        {t('settings.changePassword') || 'Ubah Password'}
                    </button>
                </div>

                {showChangePassword && (
                    <form onSubmit={handlePasswordChange} className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                {t('settings.currentPassword') || 'Password Saat Ini'}
                            </label>
                            <input
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                                className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
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
                            />
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
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowChangePassword(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                {t('common.cancel') || 'Batal'}
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
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

            {/* Active Sessions */}
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
                    <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                        {t('settings.logoutAllSessions') || 'Logout Semua Sesi'}
                    </button>
                </div>

                <div className="space-y-3">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            className={`flex items-center justify-between p-4 rounded-lg border ${session.current ? 'border-green-200 bg-green-50' : 'border-gray-200'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <Monitor className="w-5 h-5 text-gray-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">{session.device}</span>
                                        {session.current && (
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                                {t('settings.currentSession') || 'Sesi ini'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-0.5">
                                        {session.location} • IP: {session.ip}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-500">{session.lastActive}</div>
                                {!session.current && (
                                    <button className="text-sm text-red-600 hover:text-red-700 mt-1">
                                        {t('common.logout') || 'Logout'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Login History */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-medium text-gray-900 mb-4">{t('settings.loginHistory') || 'Riwayat Login'}</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <div>
                                <div className="text-sm text-gray-900">{t('settings.loginSuccess') || 'Login berhasil'}</div>
                                <div className="text-xs text-gray-500">Chrome on Windows • Jakarta, Indonesia</div>
                            </div>
                        </div>
                        <div className="text-sm text-gray-500">3 Agustus 2026, 09:30</div>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <div>
                                <div className="text-sm text-gray-900">{t('settings.loginSuccess') || 'Login berhasil'}</div>
                                <div className="text-xs text-gray-500">Safari on iPhone • Jakarta, Indonesia</div>
                            </div>
                        </div>
                        <div className="text-sm text-gray-500">3 Agustus 2026, 07:15</div>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            <div>
                                <div className="text-sm text-gray-900">{t('settings.loginFailed') || 'Login gagal'}</div>
                                <div className="text-xs text-gray-500">Unknown • 103.28.xxx.xxx</div>
                            </div>
                        </div>
                        <div className="text-sm text-gray-500">2 Agustus 2026, 22:45</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
