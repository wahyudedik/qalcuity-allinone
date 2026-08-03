'use client'

import { useState } from 'react'

export default function SecuritySettingsPage() {
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
        // TODO: Implement password change
        setShowChangePassword(false)
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">Keamanan</h2>
                <p className="text-sm text-gray-600 mt-1">
                    Kelola password dan keamanan akun Anda
                </p>
            </div>

            {/* Password */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900">Password</h3>
                            <p className="text-sm text-gray-500">Terakhir diubah: 15 Juli 2026</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowChangePassword(!showChangePassword)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Ubah Password
                    </button>
                </div>

                {showChangePassword && (
                    <form onSubmit={handlePasswordChange} className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Password Saat Ini
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
                                Password Baru
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
                                Konfirmasi Password Baru
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
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                                Simpan Password
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
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900">Two-Factor Authentication (2FA)</h3>
                            <p className="text-sm text-gray-500">Tambahkan lapisan keamanan ekstra ke akun Anda</p>
                        </div>
                    </div>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                        Aktifkan 2FA
                    </button>
                </div>
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <p className="text-sm text-yellow-800 font-medium">2FA belum aktif</p>
                            <p className="text-sm text-yellow-700 mt-1">
                                Kami sangat menyarankan untuk mengaktifkan 2FA untuk keamanan akun yang lebih baik.
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
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900">Sesi Aktif</h3>
                            <p className="text-sm text-gray-500">Perangkat yang sedang login ke akun Anda</p>
                        </div>
                    </div>
                    <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                        Logout Semua Sesi
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
                                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">{session.device}</span>
                                        {session.current && (
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                                Sesi ini
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
                                        Logout
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Login History */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-medium text-gray-900 mb-4">Riwayat Login</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <div>
                                <div className="text-sm text-gray-900">Login berhasil</div>
                                <div className="text-xs text-gray-500">Chrome on Windows • Jakarta, Indonesia</div>
                            </div>
                        </div>
                        <div className="text-sm text-gray-500">3 Agustus 2026, 09:30</div>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <div>
                                <div className="text-sm text-gray-900">Login berhasil</div>
                                <div className="text-xs text-gray-500">Safari on iPhone • Jakarta, Indonesia</div>
                            </div>
                        </div>
                        <div className="text-sm text-gray-500">3 Agustus 2026, 07:15</div>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            <div>
                                <div className="text-sm text-gray-900">Login gagal</div>
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
