'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { Phone, Mail, Handshake, FileText, ClipboardList, ArrowLeft, Trash2, Pencil, Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface LeadDetail {
    id: string
    name: string
    email: string
    phone: string
    company: string
    source: string
    status: string
    score: number
    notes: string
    createdAt: string
    activities: Array<{ date: string; type: string; description: string }>
}

const statusConfig: Record<string, { label: string; color: string }> = {
    new: { label: 'Baru', color: 'bg-blue-100 text-blue-800' },
    contacted: { label: 'Dihubungi', color: 'bg-yellow-100 text-yellow-800' },
    qualified: { label: 'Kualifikasi', color: 'bg-green-100 text-green-800' },
    unqualified: { label: 'Tidak Kualifikasi', color: 'bg-red-100 text-red-800' },
}

const activityTypeConfig: Record<string, { icon: typeof Phone; color: string }> = {
    call: { icon: Phone, color: 'text-blue-600' },
    email: { icon: Mail, color: 'text-purple-600' },
    meeting: { icon: Handshake, color: 'text-green-600' },
    note: { icon: FileText, color: 'text-gray-600' },
    form: { icon: ClipboardList, color: 'text-orange-600' },
}

export default function LeadDetailPage({ params }: { params: { id: string } }) {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
    const router = useRouter()
    const [lead, setLead] = useState<LeadDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [converting, setConverting] = useState(false)
    const [showConvertConfirm, setShowConvertConfirm] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    useEffect(() => {
        const fetchLead = async () => {
            try {
                const response = await fetch(`/api/crm/leads/${params.id}`)
                const data = await response.json()
                if (data.success) {
                    setLead(data.data)
                } else {
                    setError(t('crm.leadDetail.error'))
                }
            } catch {
                setError(t('crm.leadDetail.errorLoad'))
            } finally {
                setLoading(false)
            }
        }
        fetchLead()
    }, [params.id, t])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const handleDelete = async () => {
        setShowDeleteConfirm(true)
    }

    const confirmDelete = async () => {
        try {
            const res = await fetch(`/api/crm/leads/${params.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                setToast({ message: t('crm.leadDetail.deleteSuccess'), type: 'success' })
                router.push('/dashboard/crm/leads')
            } else {
                setToast({ message: data.error || t('crm.leadDetail.deleteError'), type: 'error' })
            }
        } catch {
            setToast({ message: t('crm.leadDetail.deleteError'), type: 'error' })
        }
    }

    const handleConvertToDeal = async () => {
        try {
            setConverting(true)
            const res = await fetch('/api/crm/deals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `${lead?.name} - ${lead?.company}`,
                    company: lead?.company,
                    contactName: lead?.name,
                    value: 0,
                    stage: 'DISCOVERY',
                    probability: 10,
                    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    notes: `Converted from lead: ${lead?.name}`,
                    leadId: lead?.id,
                }),
            })
            const data = await res.json()
            if (data.success) {
                // Update lead status to qualified
                await fetch(`/api/crm/leads/${params.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'qualified' }),
                })
                setToast({ message: t('crm.leadDetail.toastConverted'), type: 'success' })
                setShowConvertConfirm(false)
                router.push(`/dashboard/crm/deals/${data.data.id}`)
            } else {
                setToast({ message: data.error || t('crm.leadDetail.toastConvertFailed'), type: 'error' })
            }
        } catch {
            setToast({ message: t('crm.leadDetail.toastConvertFailed'), type: 'error' })
        } finally {
            setConverting(false)
        }
    }

    if (loading) {
        return (
            <div className="p-6">
                <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
                <div className="mt-4 h-48 animate-pulse rounded-xl bg-gray-100" />
            </div>
        )
    }

    if (error || !lead) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <p className="text-lg text-gray-600">{error || t('crm.leadDetail.error')}</p>
                    <Link href="/dashboard/crm/leads" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
                        ← {t('crm.leadDetail.backToLeads')}
                    </Link>
                </div>
            </div>
        )
    }

    const statusInfo = statusConfig[lead.status] || { label: lead.status, color: 'bg-gray-100 text-gray-800' }

    return (
        <div className="space-y-6 p-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                    {toast.message}
                </div>
            )}

            {/* Delete Confirm Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={confirmDelete}
                title="Konfirmasi Hapus"
                message={t('crm.leadDetail.confirmDelete')}
                confirmText="Hapus"
                cancelText="Batal"
                variant="danger"
            />

            {/* Header */}
            <div>
                <Link href="/dashboard/crm/leads" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="h-4 w-4" />
                    {t('crm.leadDetail.backToLeads')}
                </Link>
                <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{lead.name}</h1>
                        <p className="text-sm text-gray-500">{lead.company}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                        </span>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">{t('crm.leadDetail.score')}</p>
                            <p className="text-2xl font-bold text-gray-900">{lead.score}</p>
                        </div>
                        {canMutate && (
                            <button
                                onClick={() => router.push(`/dashboard/crm/leads/${params.id}/edit`)}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <Pencil className="h-4 w-4" />
                                {t('crm.contactDetail.edit')}
                            </button>
                        )}
                        {canMutate && (
                            <button onClick={handleDelete} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
                                <Trash2 className="inline h-4 w-4 mr-1" />
                                {t('crm.leadDetail.delete')}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Contact Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('crm.leadDetail.contactInfo')}</h3>
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm text-gray-500">{t('crm.leadDetail.email')}</p>
                                <p className="font-medium text-gray-900">{lead.email}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('crm.leadDetail.phone')}</p>
                                <p className="font-medium text-gray-900">{lead.phone}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('crm.leadDetail.company')}</p>
                                <p className="font-medium text-gray-900">{lead.company}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('crm.leadDetail.source')}</p>
                                <p className="font-medium text-gray-900">{lead.source}</p>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {lead.notes && (
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h3 className="text-lg font-semibold text-gray-900">{t('crm.leadDetail.notes')}</h3>
                            <p className="mt-4 text-sm text-gray-700">{lead.notes}</p>
                        </div>
                    )}

                    {/* Activities */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('crm.leadDetail.activities')}</h3>
                        {lead.activities.length > 0 ? (
                            <div className="mt-4 space-y-4">
                                {lead.activities.map((activity, idx) => {
                                    const config = activityTypeConfig[activity.type] || { icon: FileText, color: 'text-gray-600' }
                                    const IconComp = config.icon
                                    return (
                                        <div key={idx} className="flex items-start gap-3">
                                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                                                <IconComp className={`h-4 w-4 ${config.color}`} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                                                <p className="text-xs text-gray-500">{formatDate(activity.date)}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="mt-4 text-sm text-gray-500">{t('crm.leadDetail.noActivities')}</p>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Quick Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('crm.leadDetail.detail')}</h3>
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('crm.leadDetail.leadId')}</span>
                                <span className="font-mono text-sm text-gray-900">{lead.id}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('crm.leadDetail.createdAt')}</span>
                                <span className="text-sm text-gray-900">{formatDate(lead.createdAt)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('crm.leadDetail.source')}</span>
                                <span className="text-sm text-gray-900">{lead.source}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('crm.leadDetail.actions')}</h3>
                        <div className="mt-4 space-y-3">
                            <a
                                href={`tel:${lead.phone}`}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                <Phone className="h-4 w-4" />
                                {t('crm.leadDetail.contactLead')}
                            </a>
                            <a
                                href={`mailto:${lead.email}`}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <Mail className="h-4 w-4" />
                                {t('crm.leadDetail.sendEmail')}
                            </a>
                            <button
                                onClick={() => setShowConvertConfirm(true)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-green-200 px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50"
                            >
                                <ClipboardList className="h-4 w-4" />
                                {t('crm.leadDetail.convertToDeal')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Convert Confirmation Modal */}
            {showConvertConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowConvertConfirm(false)} />
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('crm.leadDetail.convertConfirmTitle')}</h3>
                        <p className="text-sm text-gray-600 mb-6">{t('crm.leadDetail.convertConfirmMessage')}</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowConvertConfirm(false)}
                                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleConvertToDeal}
                                disabled={converting}
                                className="px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {converting && <Loader2 className="h-4 w-4 animate-spin" />}
                                {t('common.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
