'use client'

import { useState } from 'react'

export default function ProfileSettingsPage() {
    const [isSaving, setIsSaving] = useState(false)
    const [formData, setFormData] = useState({
        name: 'Budi Santoso',
        email: 'budi@majubersama.com',
        phone: '+62 812-3456-7890',
        avatar: null as string | null,
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value,
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        // TODO: Implement save
        await new Promise(resolve => setTimeout(resolve, 1000))
        setIsSaving(false)
    }

    return (
        <div className="space-y-6">
            {/* Profile Picture */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Foto Profil</h2>
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        BS
                    </div>
                    <div>
                        <button
                            type="button"
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Ubah Foto
                        </button>
                        <p className="text-xs text-gray-500 mt-2">
                            JPG, PNG atau GIF. Maksimal 2MB.
                        </p>
                    </div>
                </div>
            </div>

            {/* Basic Info */}
            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Dasar</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Nama Lengkap
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
                            Email
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
                            Nomor Telepon
                        </label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Bahasa
                        </label>
                        <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 bg-white">
                            <option value="id">Bahasa Indonesia</option>
                            <option value="en">English</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Zona Waktu
                        </label>
                        <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 bg-white">
                            <option value="WIB">WIB (UTC+7)</option>
                            <option value="WITA">WITA (UTC+8)</option>
                            <option value="WIT">WIT (UTC+9)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Mata Uang
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
                        className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                </div>
            </form>

            {/* Danger Zone */}
            <div className="bg-white rounded-xl border border-red-200 p-6">
                <h2 className="text-lg font-semibold text-red-600 mb-2">Zona Bahaya</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Tindakan berikut tidak dapat dibatalkan. Pastikan Anda sudah yakin.
                </p>
                <div className="flex items-center gap-4">
                    <button className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        Unduh Data Saya
                    </button>
                    <button className="px-4 py-2.5 border border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                        Hapus Akun
                    </button>
                </div>
            </div>
        </div>
    )
}
