'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import {
    LayoutGrid,
    Plus,
    Loader2,
    AlertCircle,
    Inbox,
    Trash2,
    Eye,
    MoreHorizontal,
    LayoutDashboard,
    Star,
    Users,
    Lock,
} from 'lucide-react'

/* ============================================
   TYPES
   ============================================ */

interface DashboardItem {
    id: string
    name: string
    description: string | null
    slug: string
    layout: string
    theme: string | null
    visibility: string
    ownerId: string
    ownerName: string | null
    department: string | null
    isDefault: boolean
    isTemplate: boolean
    tags: string | null
    viewCount: number
    lastViewedAt: string | null
    refreshAll: number | null
    isActive: boolean
    widgetCount: number
    createdAt: string
    updatedAt: string
}

interface DashboardsResponse {
    success: boolean
    data: DashboardItem[]
}

/* ============================================
   HELPERS
   ============================================ */

function getVisibilityIcon(visibility: string): typeof Lock {
    switch (visibility) {
        case 'ORGANIZATION': return Users
        case 'TEAM': return Users
        case 'PRIVATE': return Lock
        default: return Lock
    }
}

function getVisibilityLabel(visibility: string): string {
    switch (visibility) {
        case 'ORGANIZATION': return 'Public'
        case 'TEAM': return 'Team'
        case 'PRIVATE': return 'Private'
        default: return visibility
    }
}

function timeAgo(dateStr: string): string {
    const now = new Date()
    const date = new Date(dateStr)
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

/* ============================================
   MAIN PAGE
   ============================================ */

export default function DashboardsPage() {
    const { t } = useTranslation()
    const [dashboards, setDashboards] = useState<DashboardItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [actionMenuId, setActionMenuId] = useState<string | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [createForm, setCreateForm] = useState({
        name: '',
        description: '',
        visibility: 'PRIVATE' as string,
        theme: 'AUTO' as string,
    })

    const fetchDashboards = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/analytics/dashboards')
            const json: DashboardsResponse = await res.json()
            if (!res.ok || !json.success) {
                throw new Error('Failed to load dashboards')
            }
            setDashboards(json.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchDashboards()
    }, [fetchDashboards])

    /* ---------- Delete ---------- */
    const deleteDashboard = async (id: string) => {
        if (!confirm(t('analytics.dashboards.deleteConfirm'))) return
        try {
            const res = await fetch(`/api/analytics/dashboards/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete')
            setDashboards(prev => prev.filter(d => d.id !== id))
            setActionMenuId(null)
        } catch {
            setError('Failed to delete dashboard')
        }
    }

    /* ---------- Create ---------- */
    const createDashboard = async () => {
        if (!createForm.name.trim()) return
        try {
            setSaving(true)
            const slug = createForm.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')
            const res = await fetch('/api/analytics/dashboards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: createForm.name.trim(),
                    description: createForm.description.trim() || null,
                    slug,
                    visibility: createForm.visibility,
                    theme: createForm.theme,
                }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.error || 'Failed to create dashboard')
            setShowCreateModal(false)
            setCreateForm({ name: '', description: '', visibility: 'PRIVATE', theme: 'AUTO' })
            fetchDashboards()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create dashboard')
        } finally {
            setSaving(false)
        }
    }

    /* ---------- Filter ---------- */
    const filteredDashboards = dashboards.filter(d => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            return d.name.toLowerCase().includes(q) ||
                (d.description && d.description.toLowerCase().includes(q))
        }
        return true
    })

    /* ---------- Stats ---------- */
    const totalWidgets = dashboards.reduce((sum, d) => sum + (d.widgetCount || 0), 0)
    const templateCount = dashboards.filter(d => d.isTemplate).length
    const activeCount = dashboards.filter(d => d.isActive).length

    const stats = [
        { label: 'Total Dashboards', value: dashboards.length, icon: LayoutGrid, color: 'text-blue-600 dark:text-blue-400' },
        { label: 'Active', value: activeCount, icon: LayoutDashboard, color: 'text-green-600 dark:text-green-400' },
        { label: 'Templates', value: templateCount, icon: Star, color: 'text-purple-600 dark:text-purple-400' },
        { label: 'Total Widgets', value: totalWidgets, icon: LayoutGrid, color: 'text-orange-600 dark:text-orange-400' },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('analytics.dashboards.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t('analytics.dashboards.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    {t('analytics.dashboards.create')}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</span>
                                <Icon className={`h-5 w-5 ${stat.color}`} />
                            </div>
                            <p className={`mt-2 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        </div>
                    )
                })}
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('analytics.common.search')}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
                <LayoutGrid className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>

            {/* Loading State */}
            {loading && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 space-y-2">
                                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                                </div>
                                <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse dark:bg-gray-700" />
                            </div>
                            <div className="mt-4 flex gap-2">
                                <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse dark:bg-gray-700" />
                                <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse dark:bg-gray-700" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredDashboards.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-gray-700 dark:bg-gray-800">
                    <Inbox className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {t('analytics.dashboards.empty.title')}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {t('analytics.dashboards.empty.description')}
                    </p>
                </div>
            )}

            {/* Dashboards Grid */}
            {!loading && !error && filteredDashboards.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredDashboards.map((dashboard) => {
                        const VisIcon = getVisibilityIcon(dashboard.visibility)
                        const tags = dashboard.tags ? dashboard.tags.split(',').map(s => s.trim()).filter(Boolean) : []
                        return (
                            <div
                                key={dashboard.id}
                                className="group rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                            >
                                {/* Dashboard Header */}
                                <div className="relative border-b border-gray-100 p-5 dark:border-gray-700">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-blue-50 p-2.5 dark:bg-blue-900/30">
                                                <LayoutDashboard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{dashboard.name}</h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <VisIcon className="h-3 w-3 text-gray-400" />
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                                        {getVisibilityLabel(dashboard.visibility)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setActionMenuId(actionMenuId === dashboard.id ? null : dashboard.id)}
                                                className="rounded-lg bg-gray-50 p-1.5 text-gray-400 hover:text-gray-600 dark:bg-gray-700 dark:hover:text-gray-300"
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                            {actionMenuId === dashboard.id && (
                                                <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
                                                    <button
                                                        onClick={() => setActionMenuId(null)}
                                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        {t('common.view')}
                                                    </button>
                                                    <button
                                                        onClick={() => deleteDashboard(dashboard.id)}
                                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        {t('common.delete')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Dashboard Info */}
                                <div className="p-4">
                                    {dashboard.description && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{dashboard.description}</p>
                                    )}
                                    <div className="mt-3 flex flex-wrap gap-1">
                                        <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                            {dashboard.widgetCount} {t('analytics.dashboards.widgets')}
                                        </span>
                                        {dashboard.isDefault && (
                                            <span className="inline-block rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                {t('analytics.dashboards.default')}
                                            </span>
                                        )}
                                        {dashboard.isTemplate && (
                                            <span className="inline-block rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                                {t('analytics.dashboards.template')}
                                            </span>
                                        )}
                                        {tags.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                                        <span>{t('common.updatedAt')} {timeAgo(dashboard.updatedAt)}</span>
                                        <span>{dashboard.viewCount} views</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Create Dashboard Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateModal(false)}>
                    <div
                        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {t('analytics.dashboards.create')}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Buat dashboard baru untuk visualisasi data
                        </p>

                        <div className="mt-5 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Nama Dashboard <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Masukkan nama dashboard"
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Deskripsi
                                </label>
                                <textarea
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Deskripsi singkat dashboard (opsional)"
                                    rows={2}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                />
                            </div>

                            {/* Visibility */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Visibilitas
                                </label>
                                <select
                                    value={createForm.visibility}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, visibility: e.target.value }))}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                >
                                    <option value="PRIVATE">Private — Hanya saya</option>
                                    <option value="TEAM">Team — Tim saya</option>
                                    <option value="DEPARTMENT">Department — Seluruh departemen</option>
                                    <option value="ORGANIZATION">Organization — Semua orang</option>
                                </select>
                            </div>

                            {/* Theme */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Tema
                                </label>
                                <select
                                    value={createForm.theme}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, theme: e.target.value }))}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                >
                                    <option value="AUTO">Auto (ikuti sistem)</option>
                                    <option value="LIGHT">Light</option>
                                    <option value="DARK">Dark</option>
                                </select>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                            >
                                Batal
                            </button>
                            <button
                                onClick={createDashboard}
                                disabled={!createForm.name.trim() || saving}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {saving ? 'Membuat...' : 'Buat Dashboard'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
