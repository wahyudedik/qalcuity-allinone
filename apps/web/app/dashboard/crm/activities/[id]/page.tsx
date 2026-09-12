'use client'
import { usePermission } from '@/lib/use-permission'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, Handshake, FileText, ClipboardList, Trash2, Pencil, Clock, CheckCircle } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface ActivityDetail {
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
    updatedAt: string
}

const activityTypeConfig: Record<string, { icon: typeof Phone; color: string; bgColor: string; label: string }> = {
    CALL: { icon: Phone, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Telepon' },
    EMAIL: { icon: Mail, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Email' },
    MEETING: { icon: Handshake, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Meeting' },
    NOTE: { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Catatan' },
    TASK: { icon: ClipboardList, color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Tugas' },
}

export default function ActivityDetailPage({ params }: { params: { id: string } }) {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const { canMutate: canMutateFn } = usePermission()
    const canMutate = canMutateFn('crm')
    const router = useRouter()
    const [activity, setActivity] = useState<ActivityDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editForm, setEditForm] = useState({
        type: '',
        subject: '',
        description: '',
        dueDate: '',
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const activityId = params?.id
        if (!activityId) return

        const fetchActivity = async () => {
            try {
                setLoading(true)
                const res = await fetch(`/api/crm/activities/${activityId}`)
                const data = await res.json()
                if (data.success) {
                    setActivity(data.data)
                } else {
                    setError(t('crm.activityDetail.error'))
                }
            } catch {
                setError(t('crm.activityDetail.errorLoad'))
            } finally {
                setLoading(false)
            }
        }
        fetchActivity()
    }, [params?.id, t])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const handleDelete = () => {
        setShowDeleteConfirm(true)
    }

    const confirmDelete = async () => {
        setShowDeleteConfirm(false)
        try {
            const res = await fetch(`/api/crm/activities/${params.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                setToast({ message: t('crm.activityDetail.deleteSuccess'), type: 'success' })
                router.push('/dashboard/crm/activities')
            } else {
                setToast({ message: data.error || t('crm.activityDetail.deleteError'), type: 'error' })
            }
        } catch {
            setToast({ message: t('crm.activityDetail.deleteError'), type: 'error' })
        }
    }

    const handleEdit = () => {
        if (!activity) return
        setEditForm({
            type: activity.type,
            subject: activity.subject,
            description: activity.description || '',
            dueDate: activity.dueDate ? new Date(activity.dueDate).toISOString().slice(0, 16) : '',
        })
        setShowEditModal(true)
    }

    const handleSaveEdit = async () => {
        setSaving(true)
        try {
            const payload: Record<string, unknown> = {
                type: editForm.type,
                subject: editForm.subject.trim(),
            }
            if (editForm.description.trim()) payload.description = editForm.description.trim()
            if (editForm.dueDate) payload.dueDate = new Date(editForm.dueDate).toISOString()

            const res = await fetch(`/api/crm/activities/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const data = await res.json()
            if (data.success) {
                setActivity(data.data)
                setShowEditModal(false)
                setToast({ message: t('crm.activityDetail.updateSuccess'), type: 'success' })
            } else {
                setToast({ message: t('crm.activityDetail.updateError'), type: 'error' })
            }
        } catch {
            setToast({ message: t('crm.activityDetail.updateError'), type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    const handleMarkComplete = async () => {
        try {
            const res = await fetch(`/api/crm/activities/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completedAt: new Date().toISOString() }),
            })
            const data = await res.json()
            if (data.success) {
                setActivity(data.data)
                setToast({ message: t('crm.activityDetail.markedComplete'), type: 'success' })
            }
        } catch {
            setToast({ message: t('crm.activityDetail.updateError'), type: 'error' })
        }
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-10 w-40 animate-pulse rounded bg-gray-200" />
                <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
            </div>
        )
    }

    if (error || !activity) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500">{error || t('crm.activityDetail.error')}</p>
                <Link href="/dashboard/crm/activities" className="mt-4 text-blue-600 hover:underline">
                    {t('crm.activityDetail.backToActivities')}
                </Link>
            </div>
        )
    }

    const config = activityTypeConfig[activity.type] || activityTypeConfig.NOTE
    const Icon = config.icon
    const isCompleted = !!activity.completedAt

    // Get entity link based on type
    const getEntityLink = () => {
        switch (activity.entityType) {
            case 'CONTACT':
                return `/dashboard/crm/contacts/${activity.entityId}`
            case 'LEAD':
                return `/dashboard/crm/leads/${activity.entityId}`
            case 'DEAL':
                return `/dashboard/crm/deals/${activity.entityId}`
            default:
                return null
        }
    }

    const entityLink = getEntityLink()

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.message}
                </div>
            )}

            {/* Back Button */}
            <Link href="/dashboard/crm/activities" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4" />
                {t('crm.activityDetail.backToActivities')}
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full ${config.bgColor}`}>
                        <Icon className={`h-8 w-8 ${config.color}`} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{activity.subject}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bgColor} ${config.color}`}>
                                {config.label}
                            </span>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm text-gray-500">{activity.entityType}</span>
                            {isCompleted && (
                                <>
                                    <span className="text-sm text-gray-500">•</span>
                                    <span className="inline-flex items-center gap-1 text-sm text-green-600">
                                        <CheckCircle className="h-4 w-4" />
                                        {t('crm.activityDetail.completed')}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {canMutate && !isCompleted && (
                        <button
                            onClick={handleMarkComplete}
                            className="inline-flex items-center gap-2 rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
                        >
                            <CheckCircle className="h-4 w-4" />
                            {t('crm.activityDetail.markComplete')}
                        </button>
                    )}
                    {canMutate && (
                        <button
                            onClick={handleEdit}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            <Pencil className="h-4 w-4" />
                            {t('crm.activityDetail.edit')}
                        </button>
                    )}
                    {canMutate && (
                        <button onClick={handleDelete} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
                            <Trash2 className="inline h-4 w-4 mr-1" />
                            {t('crm.activityDetail.delete')}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Activity Details */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('crm.activityDetail.title')}</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">{t('crm.activityDetail.type')}</p>
                                <p className="font-medium text-gray-900">{config.label}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('crm.activityDetail.subject')}</p>
                                <p className="font-medium text-gray-900">{activity.subject}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('crm.activityDetail.entityType')}</p>
                                <p className="font-medium text-gray-900">{activity.entityType}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('crm.activityDetail.status')}</p>
                                <p className="font-medium text-gray-900">
                                    {isCompleted ? t('crm.activityDetail.completed') : t('crm.activityDetail.pending')}
                                </p>
                            </div>
                            {activity.dueDate && (
                                <div>
                                    <p className="text-sm text-gray-500">{t('crm.activityDetail.dueDate')}</p>
                                    <p className="font-medium text-gray-900">{formatDate(activity.dueDate)}</p>
                                </div>
                            )}
                            {activity.completedAt && (
                                <div>
                                    <p className="text-sm text-gray-500">{t('crm.activityDetail.completedAt')}</p>
                                    <p className="font-medium text-green-600">{formatDate(activity.completedAt)}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    {activity.description && (
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('crm.activityDetail.description')}</h2>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{activity.description}</p>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Related Entity */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('crm.activityDetail.relatedEntity')}</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-gray-500">{t('crm.activityDetail.entityType')}</p>
                                <p className="text-sm font-medium text-gray-900">{activity.entityType}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{t('crm.activityDetail.entityId')}</p>
                                <p className="text-sm font-medium text-gray-900 font-mono">{activity.entityId}</p>
                            </div>
                            {entityLink && (
                                <Link
                                    href={entityLink}
                                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                >
                                    {t('crm.activityDetail.viewEntity')}
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Timestamps */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('crm.activityDetail.info')}</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500">{t('crm.activityDetail.createdAt')}</p>
                                    <p className="text-sm font-medium text-gray-900">{formatDate(activity.createdAt)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500">{t('crm.activityDetail.updatedAt')}</p>
                                    <p className="text-sm font-medium text-gray-900">{formatDate(activity.updatedAt)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('crm.activityDetail.editTitle')}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('crm.activityDetail.type')}</label>
                                <select
                                    value={editForm.type}
                                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="CALL">{t('crm.activities.typeCall')}</option>
                                    <option value="EMAIL">{t('crm.activities.typeEmail')}</option>
                                    <option value="MEETING">{t('crm.activities.typeMeeting')}</option>
                                    <option value="NOTE">{t('crm.activities.typeNote')}</option>
                                    <option value="TASK">{t('crm.activities.typeTask')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('crm.activityDetail.subject')} *</label>
                                <input
                                    type="text"
                                    value={editForm.subject}
                                    onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('crm.activityDetail.description')}</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('crm.activityDetail.dueDate')}</label>
                                <input
                                    type="datetime-local"
                                    value={editForm.dueDate}
                                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveEdit}
                                    disabled={saving || !editForm.subject.trim()}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? t('common.loading') : t('common.save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={confirmDelete}
                title={t('crm.activityDetail.confirmDelete')}
                message={t('crm.activityDetail.confirmDeleteMessage')}
                confirmText={t('common.delete')}
                cancelText={t('common.cancel')}
                variant="danger"
            />
        </div>
    )
}
