'use client'
import { usePermission } from '@/lib/use-permission'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { Plus, Search, ClipboardList, Phone, Mail, Handshake, FileText, Clock, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'

type Activity = {
    id: string
    entityType: string
    entityId: string
    type: string
    subject: string
    description: string | null
    dueDate: string | null
    completedAt: string | null
    createdBy: string
    createdAt: string
}

const activityTypeConfig: Record<string, { icon: typeof Phone; color: string; bgColor: string }> = {
    CALL: { icon: Phone, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    EMAIL: { icon: Mail, color: 'text-purple-600', bgColor: 'bg-purple-100' },
    MEETING: { icon: Handshake, color: 'text-green-600', bgColor: 'bg-green-100' },
    NOTE: { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-100' },
    TASK: { icon: ClipboardList, color: 'text-orange-600', bgColor: 'bg-orange-100' },
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    PENDING: { label: 'Menunggu', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    COMPLETED: { label: 'Selesai', color: 'text-green-700', bgColor: 'bg-green-100' },
    CANCELLED: { label: 'Dibatalkan', color: 'text-red-700', bgColor: 'bg-red-100' },
}

export default function ActivitiesPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const { canMutate: canMutateFn } = usePermission()
    const canMutate = canMutateFn('crm')

    const [activities, setActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterType, setFilterType] = useState<string>('')
    const [filterStatus, setFilterStatus] = useState<string>('')
    const [searchQuery, setSearchQuery] = useState('')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null)
    const [confirmTitle, setConfirmTitle] = useState('Konfirmasi Hapus')
    const [confirmMessage, setConfirmMessage] = useState('')

    // Create modal state
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [form, setForm] = useState({
        entityType: 'CONTACT' as string,
        entityId: '',
        type: 'CALL',
        subject: '',
        description: '',
        dueDate: '',
    })
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    useEffect(() => {
        fetchActivities()
    }, [])

    const fetchActivities = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({ limit: '100' })
            if (filterType) params.set('type', filterType)
            if (searchQuery) params.set('search', searchQuery)

            const response = await fetch(`/api/crm/activities?${params.toString()}`)
            const data = await response.json()
            if (data.success) {
                setActivities(data.data)
            } else {
                setError(t('crm.activities.fetchError'))
            }
        } catch {
            setError(t('crm.activities.fetchError'))
        } finally {
            setLoading(false)
        }
    }

    const getStatus = (activity: Activity): string => {
        if (activity.completedAt) return 'COMPLETED'
        if (activity.dueDate && new Date(activity.dueDate) < new Date()) return 'PENDING'
        return 'PENDING'
    }

    const filtered = activities.filter((a) => {
        const matchType = filterType === '' || a.type === filterType
        const status = getStatus(a)
        const matchStatus = filterStatus === '' || status === filterStatus
        const matchSearch = searchQuery === '' ||
            a.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
        return matchType && matchStatus && matchSearch
    })

    const handleDelete = async (id: string) => {
        setConfirmTitle('Konfirmasi Hapus')
        setConfirmMessage('Apakah Anda yakin ingin menghapus aktivitas ini?')
        setConfirmAction(() => async () => {
            try {
                const response = await fetch(`/api/crm/activities/${id}`, { method: 'DELETE' })
                const result = await response.json()
                if (result.success) {
                    fetchActivities()
                    setToast({ message: t('crm.activities.deleteSuccess'), type: 'success' })
                } else {
                    setToast({ message: t('crm.activities.deleteFailed'), type: 'error' })
                }
            } catch {
                setToast({ message: t('crm.activities.deleteFailed'), type: 'error' })
            }
        })
        setShowConfirmDialog(true)
    }

    const handleCreateActivity = async () => {
        if (!form.subject.trim() || !form.entityId.trim()) return
        setSubmitting(true)
        try {
            const payload: Record<string, unknown> = {
                entityType: form.entityType,
                entityId: form.entityId.trim(),
                type: form.type,
                subject: form.subject.trim(),
            }
            if (form.description.trim()) payload.description = form.description.trim()
            if (form.dueDate) payload.dueDate = form.dueDate

            const response = await fetch('/api/crm/activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const result = await response.json()
            if (result.success) {
                setShowCreateModal(false)
                setForm({ entityType: 'CONTACT', entityId: '', type: 'CALL', subject: '', description: '', dueDate: '' })
                fetchActivities()
                setToast({ message: t('crm.activities.createSuccess'), type: 'success' })
            } else {
                setToast({ message: t('crm.activities.createFailed'), type: 'error' })
            }
        } catch {
            setToast({ message: t('crm.activities.createFailed'), type: 'error' })
        } finally {
            setSubmitting(false)
        }
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const stats = {
        total: activities.length,
        calls: activities.filter((a) => a.type === 'CALL').length,
        emails: activities.filter((a) => a.type === 'EMAIL').length,
        meetings: activities.filter((a) => a.type === 'MEETING').length,
        tasks: activities.filter((a) => a.type === 'TASK').length,
        completed: activities.filter((a) => !!a.completedAt).length,
    }

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
                        ))}
                    </div>
                    <div className="h-96 bg-gray-200 rounded-xl"></div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={fetchActivities}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        {t('common.refresh')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('crm.activities.title')}</h1>
                    <p className="text-gray-500">{stats.total} {t('crm.activities.subtitle')}</p>
                </div>
                {canMutate && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        {t('crm.activities.addActivity')}
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('crm.activities.totalLabel')}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('crm.activities.typeCall')}</p>
                    <p className="mt-1 text-2xl font-bold text-blue-600">{stats.calls}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('crm.activities.typeEmail')}</p>
                    <p className="mt-1 text-2xl font-bold text-purple-600">{stats.emails}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('crm.activities.typeMeeting')}</p>
                    <p className="mt-1 text-2xl font-bold text-green-600">{stats.meetings}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('crm.activities.typeTask')}</p>
                    <p className="mt-1 text-2xl font-bold text-orange-600">{stats.tasks}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('crm.activities.statusCompleted')}</p>
                    <p className="mt-1 text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('crm.activities.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="">{t('crm.activities.filterAllTypes')}</option>
                        <option value="CALL">{t('crm.activities.typeCall')}</option>
                        <option value="EMAIL">{t('crm.activities.typeEmail')}</option>
                        <option value="MEETING">{t('crm.activities.typeMeeting')}</option>
                        <option value="NOTE">{t('crm.activities.typeNote')}</option>
                        <option value="TASK">{t('crm.activities.typeTask')}</option>
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="">{t('crm.activities.filterAllStatus')}</option>
                        <option value="PENDING">{t('crm.activities.statusPending')}</option>
                        <option value="COMPLETED">{t('crm.activities.statusCompleted')}</option>
                        <option value="CANCELLED">{t('crm.activities.statusCancelled')}</option>
                    </select>
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {filtered.length === 0 ? (
                    <EmptyState
                        icon={ClipboardList}
                        title={t('crm.activities.empty')}
                        description={t('crm.activities.emptyDescription')}
                    />
                ) : filtered.map((activity) => {
                    const config = activityTypeConfig[activity.type] || activityTypeConfig.NOTE
                    const Icon = config.icon
                    const status = getStatus(activity)
                    const statusInfo = statusConfig[status] || statusConfig.PENDING

                    return (
                        <Link
                            key={activity.id}
                            href={`/dashboard/crm/activities/${activity.id}`}
                            className="block rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.bgColor}`}>
                                        <Icon className={`h-5 w-5 ${config.color}`} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{activity.subject}</p>
                                        <p className="text-sm text-gray-500">{activity.entityType} • {activity.type}</p>
                                    </div>
                                </div>
                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusInfo.bgColor} ${statusInfo.color}`}>
                                    {statusInfo.label}
                                </span>
                            </div>
                            {activity.description && (
                                <p className="mt-2 text-sm text-gray-600 line-clamp-2">{activity.description}</p>
                            )}
                            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDate(activity.createdAt)}
                                </div>
                                {canMutate && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault()
                                            handleDelete(activity.id)
                                        }}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </Link>
                    )
                })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 font-medium text-gray-500">{t('crm.activities.table.type')}</th>
                                <th className="px-4 py-3 font-medium text-gray-500">{t('crm.activities.table.subject')}</th>
                                <th className="px-4 py-3 font-medium text-gray-500">{t('crm.activities.table.entity')}</th>
                                <th className="px-4 py-3 font-medium text-gray-500">{t('crm.activities.table.dueDate')}</th>
                                <th className="px-4 py-3 font-medium text-gray-500">{t('crm.activities.table.status')}</th>
                                <th className="px-4 py-3 font-medium text-gray-500">{t('crm.activities.table.created')}</th>
                                <th className="px-4 py-3 font-medium text-gray-500">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7}>
                                        <EmptyState
                                            icon={ClipboardList}
                                            title={t('crm.activities.empty')}
                                            description={t('crm.activities.emptyDescription')}
                                        />
                                    </td>
                                </tr>
                            ) : filtered.map((activity) => {
                                const config = activityTypeConfig[activity.type] || activityTypeConfig.NOTE
                                const Icon = config.icon
                                const status = getStatus(activity)
                                const statusInfo = statusConfig[status] || statusConfig.PENDING

                                return (
                                    <tr key={activity.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bgColor} ${config.color}`}>
                                                <Icon className="h-3.5 w-3.5" />
                                                {activity.type}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link href={`/dashboard/crm/activities/${activity.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                                                {activity.subject}
                                            </Link>
                                            {activity.description && (
                                                <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{activity.description}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{activity.entityType}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {activity.dueDate ? formatDate(activity.dueDate) : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusInfo.bgColor} ${statusInfo.color}`}>
                                                {statusInfo.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{formatDate(activity.createdAt)}</td>
                                        <td className="px-4 py-3">
                                            {canMutate && (
                                                <button
                                                    onClick={() => handleDelete(activity.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                    title={t('common.delete')}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('crm.activities.form.title')}</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('crm.activities.form.entityTypeLabel')}</label>
                                    <select
                                        value={form.entityType}
                                        onChange={(e) => setForm({ ...form, entityType: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="CONTACT">Contact</option>
                                        <option value="LEAD">Lead</option>
                                        <option value="DEAL">Deal</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('crm.activities.form.typeLabel')}</label>
                                    <select
                                        value={form.type}
                                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="CALL">{t('crm.activities.typeCall')}</option>
                                        <option value="EMAIL">{t('crm.activities.typeEmail')}</option>
                                        <option value="MEETING">{t('crm.activities.typeMeeting')}</option>
                                        <option value="NOTE">{t('crm.activities.typeNote')}</option>
                                        <option value="TASK">{t('crm.activities.typeTask')}</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('crm.activities.form.entityIdLabel')}</label>
                                <input
                                    type="text"
                                    value={form.entityId}
                                    onChange={(e) => setForm({ ...form, entityId: e.target.value })}
                                    placeholder={t('crm.activities.form.entityIdPlaceholder')}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('crm.activities.form.subjectLabel')} *</label>
                                <input
                                    type="text"
                                    value={form.subject}
                                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                    placeholder={t('crm.activities.form.subjectPlaceholder')}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('crm.activities.form.descriptionLabel')}</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder={t('crm.activities.form.descriptionPlaceholder')}
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('crm.activities.form.dueDateLabel')}</label>
                                <input
                                    type="datetime-local"
                                    value={form.dueDate}
                                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateActivity}
                                    disabled={submitting || !form.subject.trim() || !form.entityId.trim()}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {submitting ? t('common.loading') : t('common.save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={showConfirmDialog}
                onClose={() => setShowConfirmDialog(false)}
                onConfirm={confirmAction || (() => Promise.resolve())}
                title={confirmTitle}
                message={confirmMessage}
                confirmText={t('common.delete')}
                cancelText={t('common.cancel')}
                variant="danger"
            />
        </div>
    )
}
