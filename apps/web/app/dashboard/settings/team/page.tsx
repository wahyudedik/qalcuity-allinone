'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { Mail, Shield, User, Eye, Search } from 'lucide-react'

const teamMembers = [
    {
        id: 1,
        name: 'Adi Prasetyo',
        email: 'adi@majubersama.com',
        role: 'owner',
        status: 'active',
        avatar: 'AP',
        joinedAt: '1 Jan 2024',
        lastActive: 'Sekarang',
    },
    {
        id: 2,
        name: 'Sari Dewi',
        email: 'sari@majubersama.com',
        role: 'admin',
        status: 'active',
        avatar: 'SD',
        joinedAt: '15 Mar 2024',
        lastActive: '2 jam lalu',
    },
    {
        id: 3,
        name: 'Budi Santoso',
        email: 'budi@majubersama.com',
        role: 'member',
        status: 'active',
        avatar: 'BS',
        joinedAt: '1 Jun 2024',
        lastActive: '1 hari lalu',
    },
    {
        id: 4,
        name: 'Maya Putri',
        email: 'maya@majubersama.com',
        role: 'viewer',
        status: 'active',
        avatar: 'MP',
        joinedAt: '20 Aug 2024',
        lastActive: '3 hari lalu',
    },
    {
        id: 5,
        name: 'Rizki Ramadhan',
        email: 'rizki@external.com',
        role: 'member',
        status: 'pending',
        avatar: 'RR',
        joinedAt: '10 Jan 2026',
        lastActive: 'Belum aktif',
    },
]

const roles = [
    { id: 'owner', icon: Shield, color: 'text-red-600 bg-red-100' },
    { id: 'admin', icon: User, color: 'text-blue-600 bg-blue-100' },
    { id: 'member', icon: User, color: 'text-green-600 bg-green-100' },
    { id: 'viewer', icon: Eye, color: 'text-gray-600 bg-gray-100' },
]

export default function TeamSettingsPage() {
    const { t } = useTranslation()
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState('member')
    const [searchQuery, setSearchQuery] = useState('')

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        setShowInviteModal(false)
        setInviteEmail('')
        setInviteRole('member')
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">{t('common.active') || 'Aktif'}</span>
            case 'pending':
                return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">{t('common.pending') || 'Menunggu'}</span>
            case 'inactive':
                return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">{t('common.inactive') || 'Tidak Aktif'}</span>
            default:
                return null
        }
    }

    const getRoleName = (roleId: string) => {
        return t(`settings.${roleId}`) || roleId.charAt(0).toUpperCase() + roleId.slice(1)
    }

    const getRoleDesc = (roleId: string) => {
        return t(`settings.${roleId}Desc`) || ''
    }

    const filteredMembers = teamMembers.filter(member =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('settings.teamTitle') || 'Pengaturan Tim'}</h2>
                <p className="text-sm text-gray-600 mt-1">
                    {t('settings.teamSubtitle') || 'Kelola anggota tim dan peran mereka'}
                </p>
            </div>

            {/* Team Members */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">{t('settings.teamMembers') || 'Anggota Tim'}</h3>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        {t('settings.inviteMember') || 'Undang Anggota'}
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('settings.searchMembers') || 'Cari anggota...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                </div>

                {/* Members List */}
                <div className="space-y-3">
                    {filteredMembers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                    {member.avatar}
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900">{member.name}</div>
                                    <div className="text-sm text-gray-500">{member.email}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <span className="text-sm font-medium text-gray-700">{getRoleName(member.role)}</span>
                                    <div className="text-xs text-gray-500">{member.lastActive}</div>
                                </div>
                                {getStatusBadge(member.status)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Roles */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-medium text-gray-900 mb-4">{t('settings.role') || 'Peran'}</h3>
                <div className="space-y-3">
                    {roles.map((role) => {
                        const RoleIcon = role.icon
                        return (
                            <div key={role.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${role.color}`}>
                                        <RoleIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">{getRoleName(role.id)}</div>
                                        <div className="text-sm text-gray-500">{getRoleDesc(role.id)}</div>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500">
                                    {teamMembers.filter(m => m.role === role.id).length} {t('settings.teamMembers') || 'anggota'}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.inviteMember') || 'Undang Anggota'}</h3>
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {t('settings.emailAddress') || 'Email'}
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="email@contoh.com"
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {t('settings.role') || 'Peran'}
                                </label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                                >
                                    <option value="admin">{t('settings.admin') || 'Admin'}</option>
                                    <option value="member">{t('settings.member') || 'Anggota'}</option>
                                    <option value="viewer">{t('settings.viewer') || 'Pengamat'}</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
                                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    {t('settings.cancel') || 'Batal'}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                >
                                    {t('settings.sendInvite') || 'Kirim Undangan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
