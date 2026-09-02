'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { getInitials } from '@/lib/utils'
import { Mail, User, Eye, Search, Loader2, Pencil, Trash2, X, ChevronDown } from 'lucide-react'

type TeamMember = {
    id: string
    name: string
    email: string
    role: string
    avatar?: string | null
    status: string
    isCurrentUser: boolean
    lastActive: string | null
    joinedAt: string
}

// SECURITY: SuperAdmin and Owner roles are EXCLUDED from tenant settings.
// SuperAdmin is exclusively for platform owner (info@qalcuity.com) — assigned via database only.
// Tenant admins can only manage: Admin, Member, Viewer roles.
const roles = [
    { id: 'admin', icon: User, color: 'text-blue-600 bg-blue-100' },
    { id: 'member', icon: User, color: 'text-green-600 bg-green-100' },
    { id: 'viewer', icon: Eye, color: 'text-gray-600 bg-gray-100' },
]

function formatRelativeTime(dateStr: string | null, t: (key: string) => string): string {
    if (!dateStr) return t('settings.neverActive')
    try {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffSec = Math.floor(diffMs / 1000)
        const diffMin = Math.floor(diffSec / 60)
        const diffHour = Math.floor(diffMin / 60)
        const diffDay = Math.floor(diffHour / 24)

        if (diffSec < 60) return t('settings.justNow')
        if (diffMin < 60) return `${diffMin} ${t('settings.minutesAgo')}`
        if (diffHour < 24) return `${diffHour} ${t('settings.hoursAgo')}`
        if (diffDay < 30) return `${diffDay} ${t('settings.daysAgo')}`
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
        return 'N/A'
    }
}

export default function TeamSettingsPage() {
    const { t } = useTranslation()
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteName, setInviteName] = useState('')
    const [inviteRole, setInviteRole] = useState('member')
    const [inviteLoading, setInviteLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // State untuk edit role
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
    const [editRole, setEditRole] = useState('')
    const [editLoading, setEditLoading] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)

    // State untuk hapus member
    const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    useEffect(() => {
        fetchTeamMembers()
    }, [])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchTeamMembers = async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/settings/team')
            const data = await res.json()
            if (data.success) {
                setTeamMembers(data.data)
            } else {
                setError(data.error || t('settings.errorLoadTeam'))
            }
        } catch {
            setError(t('settings.errorConnectServer'))
        } finally {
            setLoading(false)
        }
    }

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteEmail.trim()) return

        try {
            setInviteLoading(true)
            const res = await fetch('/api/settings/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail.trim(), name: inviteName.trim(), role: inviteRole }),
            })
            const data = await res.json()
            if (data.success) {
                setTeamMembers(prev => [...prev, { ...data.data, isCurrentUser: false, lastActive: null, joinedAt: data.data.createdAt }])
                setShowInviteModal(false)
                setInviteEmail('')
                setInviteName('')
                setInviteRole('member')
                setToast({ message: t('settings.inviteSent'), type: 'success' })
            } else {
                setToast({ message: data.error || t('settings.errorSendInvite'), type: 'error' })
            }
        } catch {
            setToast({ message: t('settings.errorConnectServer'), type: 'error' })
        } finally {
            setInviteLoading(false)
        }
    }

    const handleEditRole = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingMember) return

        try {
            setEditLoading(true)
            const res = await fetch('/api/settings/team', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId: editingMember.id, role: editRole }),
            })
            const data = await res.json()
            if (data.success) {
                setTeamMembers(prev => prev.map(m =>
                    m.id === editingMember.id ? { ...m, role: editRole } : m
                ))
                setShowEditModal(false)
                setEditingMember(null)
                setToast({ message: t('settings.roleChanged'), type: 'success' })
            } else {
                setToast({ message: data.error || t('settings.errorChangeRole'), type: 'error' })
            }
        } catch {
            setToast({ message: t('settings.errorConnectServer'), type: 'error' })
        } finally {
            setEditLoading(false)
        }
    }

    const handleRemoveMember = async () => {
        if (!deletingMember) return

        try {
            setDeleteLoading(true)
            const res = await fetch(`/api/settings/team?id=${deletingMember.id}`, {
                method: 'DELETE',
            })
            const data = await res.json()
            if (data.success) {
                setTeamMembers(prev => prev.filter(m => m.id !== deletingMember.id))
                setShowDeleteModal(false)
                setDeletingMember(null)
                setToast({ message: t('settings.memberRemoved'), type: 'success' })
            } else {
                setToast({ message: data.error || t('settings.errorRemoveMember'), type: 'error' })
            }
        } catch {
            setToast({ message: t('settings.errorConnectServer'), type: 'error' })
        } finally {
            setDeleteLoading(false)
        }
    }

    const openEditModal = (member: TeamMember) => {
        setEditingMember(member)
        setEditRole(member.role)
        setShowEditModal(true)
    }

    const openDeleteModal = (member: TeamMember) => {
        setDeletingMember(member)
        setShowDeleteModal(true)
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

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">{t('settings.teamTitle') || 'Pengaturan Tim'}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {t('settings.teamSubtitle') || 'Kelola anggota tim dan peran mereka'}
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                    <p className="text-sm text-gray-500">{t('settings.loadingTeam')}</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">{t('settings.teamTitle') || 'Pengaturan Tim'}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {t('settings.teamSubtitle') || 'Kelola anggota tim dan peran mereka'}
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center">
                    <p className="text-sm text-red-600 mb-3">{error}</p>
                    <button
                        onClick={fetchTeamMembers}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        {t('settings.retry')}
                    </button>
                </div>
            </div>
        )
    }

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
                    {filteredMembers.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-sm text-gray-500">{t('settings.noMembersFound')}</p>
                        </div>
                    ) : (
                        filteredMembers.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                        {member.avatar || getInitials(member.name)}
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            {member.name}
                                            {member.isCurrentUser && (
                                                <span className="ml-2 text-xs text-blue-600">({t('settings.you')})</span>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-500">{member.email}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <span className="text-sm font-medium text-gray-700">{getRoleName(member.role)}</span>
                                        <div className="text-xs text-gray-500">{formatRelativeTime(member.lastActive, t)}</div>
                                    </div>
                                    {getStatusBadge(member.status)}
                                    {/* Tombol aksi — sembunyikan untuk current user */}
                                    {!member.isCurrentUser && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => openEditModal(member)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title={t('settings.changeRole')}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => openDeleteModal(member)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title={t('settings.removeMember')}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
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
                                    {teamMembers.filter(m => m.role.toLowerCase() === role.id).length} {t('settings.membersCount') || 'anggota'}
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
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">{t('settings.inviteMember') || 'Undang Anggota'}</h3>
                            <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {t('settings.fullName') || 'Nama'}
                                </label>
                                <input
                                    type="text"
                                    value={inviteName}
                                    onChange={(e) => setInviteName(e.target.value)}
                                    placeholder={t('settings.inviteNamePlaceholder')}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
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
                                    {/* SECURITY: SuperAdmin removed — platform owner only, assigned via database */}
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
                                    disabled={inviteLoading}
                                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {inviteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {t('settings.sendInvite') || 'Kirim Undangan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Role Modal */}
            {showEditModal && editingMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">{t('settings.changeRole')}</h3>
                            <button onClick={() => { setShowEditModal(false); setEditingMember(null) }} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                    {getInitials(editingMember.name)}
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900">{editingMember.name}</div>
                                    <div className="text-sm text-gray-500">{editingMember.email}</div>
                                </div>
                            </div>
                        </div>
                        <form onSubmit={handleEditRole} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {t('settings.role') || 'Peran'}
                                </label>
                                <div className="relative">
                                    <select
                                        value={editRole}
                                        onChange={(e) => setEditRole(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white appearance-none"
                                    >
                                        {/* SECURITY: SuperAdmin removed — platform owner only, assigned via database */}
                                        <option value="admin">{t('settings.admin') || 'Admin'}</option>
                                        <option value="member">{t('settings.member') || 'Anggota'}</option>
                                        <option value="viewer">{t('settings.viewer') || 'Pengamat'}</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowEditModal(false); setEditingMember(null) }}
                                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    {t('settings.cancel') || 'Batal'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={editLoading || editRole === editingMember.role}
                                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {editLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {t('settings.changeRole')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && deletingMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">{t('settings.removeMember')}</h3>
                            <button onClick={() => { setShowDeleteModal(false); setDeletingMember(null) }} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-sm font-medium">
                                    {getInitials(deletingMember.name)}
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900">{deletingMember.name}</div>
                                    <div className="text-sm text-gray-500">{deletingMember.email}</div>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-6">
                            {t('settings.confirmRemoveMember')}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => { setShowDeleteModal(false); setDeletingMember(null) }}
                                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                {t('settings.cancel') || 'Batal'}
                            </button>
                            <button
                                onClick={handleRemoveMember}
                                disabled={deleteLoading}
                                className="px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                <Trash2 className="w-4 h-4" />
                                {t('settings.removeMember')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.message}
                </div>
            )}
        </div>
    )
}
