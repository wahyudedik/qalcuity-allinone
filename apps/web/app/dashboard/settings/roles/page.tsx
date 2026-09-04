'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { Shield, Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, Loader2, CheckCircle, X, Users, Lock } from 'lucide-react'

type RoleData = {
    id: string
    name: string
    description: string
    isSystem: boolean
    permissions: string[]
    userCount: number
    createdAt: string | null
    updatedAt: string | null
}

type PermissionCategory = {
    key: string
    label: string
    permissions: { key: string; label: string }[]
}

const PERMISSION_CATEGORIES: PermissionCategory[] = [
    {
        key: 'finance',
        label: 'Finance',
        permissions: [
            { key: 'finance:view', label: 'View' },
            { key: 'finance:create', label: 'Create' },
            { key: 'finance:edit', label: 'Edit' },
            { key: 'finance:delete', label: 'Delete' },
            { key: 'finance:approve', label: 'Approve' },
        ],
    },
    {
        key: 'crm',
        label: 'CRM',
        permissions: [
            { key: 'crm:view', label: 'View' },
            { key: 'crm:create', label: 'Create' },
            { key: 'crm:edit', label: 'Edit' },
            { key: 'crm:delete', label: 'Delete' },
            { key: 'crm:import', label: 'Import' },
        ],
    },
    {
        key: 'hr',
        label: 'HR',
        permissions: [
            { key: 'hr:view', label: 'View' },
            { key: 'hr:create', label: 'Create' },
            { key: 'hr:edit', label: 'Edit' },
            { key: 'hr:delete', label: 'Delete' },
            { key: 'hr:approve', label: 'Approve' },
        ],
    },
    {
        key: 'inventory',
        label: 'Inventory',
        permissions: [
            { key: 'inventory:view', label: 'View' },
            { key: 'inventory:create', label: 'Create' },
            { key: 'inventory:edit', label: 'Edit' },
            { key: 'inventory:delete', label: 'Delete' },
        ],
    },
    {
        key: 'settings',
        label: 'Settings',
        permissions: [
            { key: 'settings:view', label: 'View' },
            { key: 'settings:edit', label: 'Edit' },
            { key: 'settings:team', label: 'Team' },
            { key: 'settings:billing', label: 'Billing' },
        ],
    },
    {
        key: 'reports',
        label: 'Reports',
        permissions: [
            { key: 'reports:view', label: 'View' },
            { key: 'reports:create', label: 'Create' },
        ],
    },
    {
        key: 'analytics',
        label: 'Analytics',
        permissions: [
            { key: 'analytics:view', label: 'View' },
            { key: 'analytics:edit', label: 'Edit' },
        ],
    },
    {
        key: 'audit',
        label: 'Audit',
        permissions: [
            { key: 'audit:view', label: 'View' },
        ],
    },
]

export default function RolesSettingsPage() {
    const { t } = useTranslation()
    const [roles, setRoles] = useState<RoleData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [expandedRole, setExpandedRole] = useState<string | null>(null)
    const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] as string[] })
    const [creating, setCreating] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchRoles = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/settings/roles')
            const data = await res.json()
            if (data.success) {
                setRoles(data.data)
            } else {
                setError(data.error || t('settings.roles.loadFailed'))
            }
        } catch {
            setError(t('settings.roles.connectFailed'))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchRoles()
    }, [fetchRoles])

    const handleCreateRole = async () => {
        if (!newRole.name.trim()) {
            setToast({ message: t('settings.roles.nameRequired'), type: 'error' })
            return
        }

        setCreating(true)
        try {
            const res = await fetch('/api/settings/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRole),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: t('settings.roles.createSuccess'), type: 'success' })
                setShowCreateModal(false)
                setNewRole({ name: '', description: '', permissions: [] })
                fetchRoles()
            } else {
                setToast({ message: data.error || t('settings.roles.createFailed'), type: 'error' })
            }
        } catch {
            setToast({ message: t('settings.roles.connectFailed'), type: 'error' })
        } finally {
            setCreating(false)
        }
    }

    const handleDeleteRole = async (roleId: string, roleName: string) => {
        if (!confirm(`Hapus role "${roleName}"?`)) return

        setDeleting(roleId)
        try {
            const res = await fetch(`/api/settings/roles/${roleId}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                setToast({ message: t('settings.roles.deleteSuccess'), type: 'success' })
                fetchRoles()
            } else {
                setToast({ message: data.error || t('settings.roles.deleteFailed'), type: 'error' })
            }
        } catch {
            setToast({ message: t('settings.roles.connectFailed'), type: 'error' })
        } finally {
            setDeleting(null)
        }
    }

    const togglePermission = (perm: string) => {
        setNewRole(prev => ({
            ...prev,
            permissions: prev.permissions.includes(perm)
                ? prev.permissions.filter(p => p !== perm)
                : [...prev.permissions, perm],
        }))
    }

    const selectAllInCategory = (categoryKey: string) => {
        const cat = PERMISSION_CATEGORIES.find(c => c.key === categoryKey)
        if (!cat) return
        const allPerms = cat.permissions.map(p => p.key)
        const allSelected = allPerms.every(p => newRole.permissions.includes(p))

        setNewRole(prev => ({
            ...prev,
            permissions: allSelected
                ? prev.permissions.filter(p => !allPerms.includes(p))
                : [...new Set([...prev.permissions, ...allPerms])],
        }))
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-96"></div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-16 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8">
                <div className="flex flex-col items-center text-center">
                    <Shield className="h-12 w-12 text-red-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Gagal Memuat Roles</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button onClick={fetchRoles} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Coba Lagi
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <X className="h-5 w-5" />}
                    <span className="text-sm font-medium">{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Roles & Permission</h2>
                    <p className="text-gray-600 mt-1">Kelola role dan hak akses anggota tim</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Buat Role
                </button>
            </div>

            {/* Roles List */}
            <div className="space-y-3">
                {roles.map(role => (
                    <div key={role.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${role.isSystem ? 'bg-blue-50' : 'bg-purple-50'}`}>
                                    {role.isSystem ? <Lock className="h-5 w-5 text-blue-600" /> : <Shield className="h-5 w-5 text-purple-600" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900">{role.name}</span>
                                        {role.isSystem && (
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">System</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500">{role.description}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                    <Users className="h-4 w-4" />
                                    {role.userCount} user
                                </div>
                                <div className="text-sm text-gray-500">
                                    {role.permissions.length} permissions
                                </div>
                                {!role.isSystem && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id, role.name) }}
                                        disabled={deleting === role.id}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {deleting === role.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </button>
                                )}
                                {expandedRole === role.id ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                            </div>
                        </div>

                        {/* Expanded Permissions */}
                        {expandedRole === role.id && (
                            <div className="border-t border-gray-100 p-4 bg-gray-50">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {PERMISSION_CATEGORIES.map(cat => (
                                        <div key={cat.key} className="bg-white rounded-lg border border-gray-200 p-3">
                                            <h4 className="font-medium text-gray-900 text-sm mb-2">{cat.label}</h4>
                                            <div className="flex flex-wrap gap-1">
                                                {cat.permissions.map(perm => {
                                                    const hasPerm = role.permissions.includes(perm.key) || role.permissions.includes(`${cat.key}:*`)
                                                    return (
                                                        <span
                                                            key={perm.key}
                                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${hasPerm
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-gray-100 text-gray-400'
                                                                }`}
                                                        >
                                                            {hasPerm ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                                            {perm.label}
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Create Role Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Buat Role Baru</h3>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {/* Name & Description */}
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Role *</label>
                                    <input
                                        type="text"
                                        value={newRole.name}
                                        onChange={e => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Contoh: Sales Manager"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                                    <input
                                        type="text"
                                        value={newRole.description}
                                        onChange={e => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Deskripsi singkat role ini"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Permission Selection */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-3">Pilih Permission</h4>
                                <div className="space-y-3">
                                    {PERMISSION_CATEGORIES.map(cat => {
                                        const allPerms = cat.permissions.map(p => p.key)
                                        const selectedCount = allPerms.filter(p => newRole.permissions.includes(p)).length
                                        return (
                                            <div key={cat.key} className="bg-gray-50 rounded-lg p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedCount === allPerms.length}
                                                            onChange={() => selectAllInCategory(cat.key)}
                                                            className="h-4 w-4 text-blue-600 rounded"
                                                        />
                                                        <span className="font-medium text-sm text-gray-900">{cat.label}</span>
                                                    </div>
                                                    <span className="text-xs text-gray-500">{selectedCount}/{allPerms.length}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2 ml-6">
                                                    {cat.permissions.map(perm => (
                                                        <label key={perm.key} className="flex items-center gap-1.5 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={newRole.permissions.includes(perm.key)}
                                                                onChange={() => togglePermission(perm.key)}
                                                                className="h-3.5 w-3.5 text-blue-600 rounded"
                                                            />
                                                            <span className="text-sm text-gray-700">{perm.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleCreateRole}
                                disabled={creating || !newRole.name.trim()}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                                Buat Role
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
