'use client'

import { useState } from 'react'

const teamMembers = [
    {
        id: 1,
        name: 'Budi Santoso',
        email: 'budi@majubersama.com',
        role: 'Owner',
        status: 'active',
        lastActive: 'Online',
    },
    {
        id: 2,
        name: 'Siti Rahayu',
        email: 'siti@majubersama.com',
        role: 'Admin',
        status: 'active',
        lastActive: '2 jam lalu',
    },
    {
        id: 3,
        name: 'Andi Pratama',
        email: 'andi@majubersama.com',
        role: 'Sales',
        status: 'active',
        lastActive: '5 menit lalu',
    },
    {
        id: 4,
        name: 'Dewi Lestari',
        email: 'dewi@majubersama.com',
        role: 'Finance',
        status: 'pending',
        lastActive: 'Undangan dikirim',
    },
    {
        id: 5,
        name: 'Rizki Prasetyo',
        email: 'rizki@majubersama.com',
        role: 'Inventory',
        status: 'inactive',
        lastActive: '30 hari lalu',
    },
]

const roles = [
    { value: 'owner', label: 'Owner', description: 'Akses penuh ke semua fitur' },
    { value: 'admin', label: 'Admin', description: 'Akses ke semua fitur kecuali billing' },
    { value: 'sales', label: 'Sales', description: 'Akses ke CRM dan penjualan' },
    { value: 'finance', label: 'Finance', description: 'Akses ke modul keuangan' },
    { value: 'inventory', label: 'Inventory', description: 'Akses ke modul inventaris' },
    { value: 'hr', label: 'HR', description: 'Akses ke modul HR' },
    { value: 'viewer', label: 'Viewer', description: 'Akses lihat saja' },
]

export default function TeamSettingsPage() {
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState('viewer')

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        // TODO: Implement invite
        setShowInviteModal(false)
        setInviteEmail('')
        setInviteRole('viewer')
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Aktif
                    </span>
                )
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                        <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                        Pending
                    </span>
                )
            case 'inactive':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                        Tidak Aktif
                    </span>
                )
            default:
                return null
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Anggota Tim</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Kelola anggota tim dan hak akses mereka
                    </p>
                </div>
                <button
                    onClick={() => setShowInviteModal(true)}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Undang Anggota
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">Total Anggota</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{teamMembers.length}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">Aktif</div>
                    <div className="text-2xl font-bold text-green-600 mt-1">
                        {teamMembers.filter(m => m.status === 'active').length}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">Undangan Pending</div>
                    <div className="text-2xl font-bold text-yellow-600 mt-1">
                        {teamMembers.filter(m => m.status === 'pending').length}
                    </div>
                </div>
            </div>

            {/* Team List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Cari anggota..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                            />
                        </div>
                        <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white">
                            <option value="">Semua Role</option>
                            {roles.map(role => (
                                <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="divide-y divide-gray-200">
                    {teamMembers.map((member) => (
                        <div key={member.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                    {member.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900">{member.name}</div>
                                    <div className="text-sm text-gray-500">{member.email}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <div className="text-sm font-medium text-gray-700">{member.role}</div>
                                    <div className="text-xs text-gray-500">{member.lastActive}</div>
                                </div>
                                {getStatusBadge(member.status)}
                                <div className="flex items-center gap-2">
                                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                    {member.role !== 'Owner' && (
                                        <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Role Permissions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Hak Akses Role</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roles.map((role) => (
                        <div key={role.value} className="p-4 border border-gray-200 rounded-lg">
                            <div className="font-medium text-gray-900">{role.label}</div>
                            <div className="text-sm text-gray-500 mt-1">{role.description}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowInviteModal(false)} />
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Undang Anggota Baru</h3>

                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="nama@email.com"
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Role
                                </label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 bg-white"
                                >
                                    {roles.filter(r => r.value !== 'owner').map(role => (
                                        <option key={role.value} value={role.value}>{role.label}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    {roles.find(r => r.value === inviteRole)?.description}
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
                                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                >
                                    Kirim Undangan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
