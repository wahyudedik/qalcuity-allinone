'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { Phone, Mail, Handshake, FileText, ClipboardList, ArrowLeft, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'

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

    const handleDelete = async () => {
        if (!window.confirm(t('crm.leadDetail.confirmDelete'))) return
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
            {/* Header */}
            <div>
                <Link href="/dashboard/crm/leads" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="h-4 w-4" />
                    {t('crm.leadDetail.backToLeads')}
                </Link>
                <div className="mt-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
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
                            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                                <Phone className="h-4 w-4" />
                                {t('crm.leadDetail.contactLead')}
                            </button>
                            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                <Mail className="h-4 w-4" />
                                {t('crm.leadDetail.sendEmail')}
                            </button>
                            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                <Handshake className="h-4 w-4" />
                                {t('crm.leadDetail.scheduleMeeting')}
                            </button>
                            <Link
                                href="/dashboard/crm/deals"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-green-200 px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50"
                            >
                                <ClipboardList className="h-4 w-4" />
                                {t('crm.leadDetail.convertToDeal')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
