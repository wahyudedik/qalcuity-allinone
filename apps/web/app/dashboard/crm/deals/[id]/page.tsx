'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { Phone, Mail, Handshake, ClipboardList, ArrowLeft, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface DealDetail {
    id: string
    name: string
    company: string
    contactName: string
    value: number
    currency: string
    stage: string
    probability: number
    expectedCloseDate: string
    createdAt: string
    notes: string
    activities: Array<{ date: string; type: string; description: string }>
}

// Stage config menggunakan UPPERCASE keys sesuai nilai di database
// DB values: DISCOVERY, PROPOSAL, NEGOTIATION, CLOSING, CLOSED_WON, CLOSED_LOST
const stageConfig: Record<string, { color: string }> = {
    DISCOVERY: { color: 'bg-blue-100 text-blue-700' },
    PROPOSAL: { color: 'bg-yellow-100 text-yellow-700' },
    NEGOTIATION: { color: 'bg-orange-100 text-orange-700' },
    CLOSING: { color: 'bg-purple-100 text-purple-700' },
    CLOSED_WON: { color: 'bg-green-100 text-green-700' },
    CLOSED_LOST: { color: 'bg-red-100 text-red-700' },
}

export default function DealDetailPage({ params }: { params: { id: string } }) {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
    const router = useRouter()
    const [deal, setDeal] = useState<DealDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Helper untuk mendapatkan label stage dari i18n
    const getStageLabel = (stage: string) => t(`crm.deals.stages.${stage}`)

    useEffect(() => {
        const fetchDeal = async () => {
            try {
                setLoading(true)
                const res = await fetch(`/api/crm/deals/${params.id}`)
                const data = await res.json()
                if (data.success) {
                    setDeal(data.data)
                } else {
                    setError(t('crm.dealDetail.error'))
                }
            } catch {
                setError(t('crm.dealDetail.errorLoad'))
            } finally {
                setLoading(false)
            }
        }
        fetchDeal()
    }, [params.id, t])

    const handleDelete = async () => {
        if (!window.confirm(t('crm.dealDetail.confirmDelete'))) return
        try {
            const res = await fetch(`/api/crm/deals/${params.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                setToast({ message: t('crm.dealDetail.deleteSuccess'), type: 'success' })
                router.push('/dashboard/crm/deals')
            } else {
                setToast({ message: data.error || t('crm.dealDetail.deleteError'), type: 'error' })
            }
        } catch {
            setToast({ message: t('crm.dealDetail.deleteError'), type: 'error' })
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
                <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
            </div>
        )
    }

    if (error || !deal) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500">{error || t('crm.dealDetail.error')}</p>
                <Link href="/dashboard/crm/deals" className="mt-4 text-blue-600 hover:underline">
                    {t('crm.dealDetail.backToDeals')}
                </Link>
            </div>
        )
    }

    const weightedValue = Number(deal.value) * (deal.probability / 100)

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Link href="/dashboard/crm/deals" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4" />
                {t('crm.dealDetail.backToDeals')}
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{deal.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stageConfig[deal.stage]?.color || 'bg-gray-100 text-gray-700'}`}>
                            {getStageLabel(deal.stage)}
                        </span>
                        <span className="text-sm text-gray-500">• {deal.company}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        {t('crm.dealDetail.edit')}
                    </button>
                    {canMutate && (
                        <button onClick={handleDelete} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
                            <Trash2 className="inline h-4 w-4 mr-1" />
                            {t('crm.dealDetail.delete')}
                        </button>
                    )}
                    <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                        {t('crm.dealDetail.winDeal')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="text-sm text-gray-500">{t('crm.dealDetail.value')}</div>
                            <div className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(Number(deal.value))}</div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="text-sm text-gray-500">{t('crm.dealDetail.probability')}</div>
                            <div className="mt-1 text-xl font-bold text-blue-600">{deal.probability}%</div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="text-sm text-gray-500">{t('crm.dealDetail.weightedValue')}</div>
                            <div className="mt-1 text-xl font-bold text-green-600">{formatCurrency(weightedValue)}</div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="text-sm text-gray-500">{t('crm.dealDetail.estClose')}</div>
                            <div className="mt-1 text-xl font-bold text-gray-900">{deal.expectedCloseDate}</div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('crm.dealDetail.notes')}</h2>
                        <p className="text-sm text-gray-600">{deal.notes}</p>
                    </div>

                    {/* Activities */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('crm.dealDetail.activities')}</h2>
                        <div className="space-y-4">
                            {deal.activities.map((activity, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                                        {activity.type === 'call' && <Phone className="h-4 w-4 text-blue-600" />}
                                        {activity.type === 'email' && <Mail className="h-4 w-4 text-purple-600" />}
                                        {activity.type === 'meeting' && <Handshake className="h-4 w-4 text-green-600" />}
                                        {activity.type === 'task' && <ClipboardList className="h-4 w-4 text-orange-600" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-900">{activity.description}</p>
                                        <p className="text-xs text-gray-500">{activity.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="mt-4 text-sm text-blue-600 hover:text-blue-700">{t('crm.dealDetail.addActivity')}</button>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Deal Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('crm.dealDetail.dealInfo')}</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-gray-500">{t('crm.dealDetail.company')}</p>
                                <Link href="/dashboard/crm/contacts" className="text-sm font-medium text-blue-600 hover:underline">{deal.company}</Link>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{t('crm.dealDetail.contact')}</p>
                                <Link href="/dashboard/crm/contacts" className="text-sm font-medium text-blue-600 hover:underline">{deal.contactName}</Link>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{t('crm.dealDetail.stage')}</p>
                                <p className="text-sm font-medium text-gray-900">{getStageLabel(deal.stage)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{t('crm.dealDetail.probability')}</p>
                                <p className="text-sm font-medium text-gray-900">{deal.probability}%</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{t('crm.dealDetail.estClose')}</p>
                                <p className="text-sm font-medium text-gray-900">{deal.expectedCloseDate}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{t('crm.dealDetail.created')}</p>
                                <p className="text-sm font-medium text-gray-900">{deal.createdAt}</p>
                            </div>
                        </div>
                    </div>

                    {/* Weighted Value */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('crm.dealDetail.analysis')}</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">{t('crm.dealDetail.value')}</span>
                                <span className="text-sm font-medium text-gray-900">{formatCurrency(Number(deal.value))}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">{t('crm.dealDetail.probability')}</span>
                                <span className="text-sm font-medium text-gray-900">{deal.probability}%</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-2">
                                <span className="text-sm font-medium text-gray-900">{t('crm.dealDetail.weightedValue')}</span>
                                <span className="text-sm font-bold text-green-600">{formatCurrency(weightedValue)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('crm.dealDetail.notes')}</h3>
                        <p className="text-sm text-gray-600">{deal.notes}</p>
                    </div>

                    {/* Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('crm.dealDetail.actions')}</h3>
                        <div className="space-y-2">
                            <button className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                {t('crm.dealDetail.changeStage')}
                            </button>
                            <button className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                {t('crm.dealDetail.sendProposal')}
                            </button>
                            <button className="w-full rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50">
                                {t('crm.dealDetail.loseDeal')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
