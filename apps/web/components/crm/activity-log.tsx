'use client'

import { useState, useEffect, useCallback } from 'react'
import { Phone, Mail, Handshake, FileText, ClipboardList, Plus, Check, Filter, Clock, Trash2 } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Activity {
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

interface ActivityLogProps {
    entityType: 'CONTACT' | 'LEAD' | 'DEAL'
    entityId: string
}

const activityTypeConfig: Record<string, { icon: typeof Phone; color: string; label: string }> = {
    CALL: { icon: Phone, color: 'text-blue-600 bg-blue-100', label: 'Telepon' },
    EMAIL: { icon: Mail, color: 'text-purple-600 bg-purple-100', label: 'Email' },
    MEETING: { icon: Handshake, color: 'text-green-600 bg-green-100', label: 'Meeting' },
    NOTE: { icon: FileText, color: 'text-gray-600 bg-gray-100', label: 'Catatan' },
    TASK: { icon: ClipboardList, color: 'text-orange-600 bg-orange-100', label: 'Tugas' },
}

export function ActivityLog({ entityType, entityId }: ActivityLogProps) {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'

    const [activities, setActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [filterType, setFilterType] = useState<string>('')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        type: 'CALL',
        subject: '',
        description: '',
        dueDate: '',
    })
    const [submitting, setSubmitting] = useState(false)

    const fetchActivities = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({
                entityType,
                entityId,
                limit: '50',
            })
            if (filterType) params.set('type', filterType)

            const res = await fetch(`/api/crm/activities?${params.toString()}`)
            const data = await res.json()
            if (data.success) {
                setActivities(data.data)
            }
        } catch {
            // silent
        } finally {
            setLoading(false)
        }
    }, [entityType, entityId, filterType])

    useEffect(() => {
        fetchActivities()
    }, [fetchActivities])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.subject.trim()) return

        try {
            setSubmitting(true)
            const res = await fetch('/api/crm/activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entityType,
                    entityId,
                    type: formData.type,
                    subject: formData.subject,
                    description: formData.description || null,
                    dueDate: formData.dueDate || null,
                }),
            })
            const data = await res.json()
            if (data.success) {
                setFormData({ type: 'CALL', subject: '', description: '', dueDate: '' })
                setShowForm(false)
                fetchActivities()
            }
        } catch {
            // silent
        } finally {
            setSubmitting(false)
        }
    }

    const handleMarkComplete = async (activityId: string) => {
        try {
            const res = await fetch(`/api/crm/activities/${activityId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completedAt: new Date().toISOString() }),
            })
            const data = await res.json()
            if (data.success) {
                fetchActivities()
            }
        } catch {
            // silent
        }
    }

    const handleDelete = async (activityId: string) => {
        setShowDeleteConfirm(activityId)
    }

    const confirmDelete = async () => {
        if (!showDeleteConfirm) return
        try {
            const res = await fetch(`/api/crm/activities/${showDeleteConfirm}`, {
                method: 'DELETE',
            })
            const data = await res.json()
            if (data.success) {
                fetchActivities()
            }
        } catch {
            // silent
        } finally {
            setShowDeleteConfirm(null)
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

    return (
        <div className="space-y-4">
            <ConfirmDialog
                isOpen={!!showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(null)}
                onConfirm={confirmDelete}
                title="Hapus Aktivitas"
                message="Apakah Anda yakin ingin menghapus aktivitas ini?"
                confirmText="Hapus"
                cancelText="Batal"
                variant="danger"
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                    Aktivitas
                    {activities.length > 0 && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                            {activities.length}
                        </span>
                    )}
                </h3>
                <div className="flex items-center gap-2">
                    {/* Filter */}
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="">Semua Jenis</option>
                        {Object.entries(activityTypeConfig).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                        ))}
                    </select>
                    {canMutate && (
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" />
                            Catat Aktivitas
                        </button>
                    )}
                </div>
            </div>

            {/* Add Activity Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Aktivitas</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {Object.entries(activityTypeConfig).map(([key, config]) => (
                                    <option key={key} value={key}>{config.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Batas Waktu</label>
                            <input
                                type="datetime-local"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subjek *</label>
                        <input
                            type="text"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            placeholder="Contoh: Follow-up penawaran harga"
                            required
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Detail aktivitas..."
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !formData.subject.trim()}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {submitting ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            )}

            {/* Activity Timeline */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
                    ))}
                </div>
            ) : activities.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
                    <Filter className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">Belum ada aktivitas tercatat</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {activities.map((activity) => {
                        const config = activityTypeConfig[activity.type] || activityTypeConfig.NOTE
                        const Icon = config.icon
                        const isCompleted = !!activity.completedAt

                        return (
                            <div
                                key={activity.id}
                                className={`relative flex gap-3 rounded-xl border p-4 transition-all ${
                                    isCompleted
                                        ? 'border-green-200 bg-green-50'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                            >
                                {/* Icon */}
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.color}`}>
                                    <Icon className="h-5 w-5" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className={`text-sm font-medium ${isCompleted ? 'text-green-700 line-through' : 'text-gray-900'}`}>
                                                {activity.subject}
                                            </p>
                                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}>
                                                    {config.label}
                                                </span>
                                                <span>{formatDate(activity.createdAt)}</span>
                                                {isCompleted && (
                                                    <span className="inline-flex items-center gap-1 text-green-600">
                                                        <Check className="h-3 w-3" />
                                                        Selesai
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {canMutate && !isCompleted && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleMarkComplete(activity.id)}
                                                    title="Tandai selesai"
                                                    className="rounded-lg p-1.5 text-gray-400 hover:bg-green-100 hover:text-green-600"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(activity.id)}
                                                    title="Hapus"
                                                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {activity.description && (
                                        <p className="mt-2 text-sm text-gray-600">{activity.description}</p>
                                    )}
                                    {activity.dueDate && !isCompleted && (
                                        <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                                            <Clock className="h-3 w-3" />
                                            Jatuh tempo: {formatDate(activity.dueDate)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
