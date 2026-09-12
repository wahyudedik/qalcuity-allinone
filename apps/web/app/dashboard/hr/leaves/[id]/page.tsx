'use client'
import { usePermission } from '@/lib/use-permission'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import {
    ArrowLeft,
    Calendar,
    Clock,
    Check,
    X,
    User,
    FileText,
    Loader2,
    Palmtree,
    Thermometer,
    Home,
    Baby,
    Wallet,
    AlertTriangle,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// ============================================
// TYPES
// ============================================

interface LeaveDetail {
    id: string
    employeeId: string
    employeeName: string
    employeeNumber: string
    position: string
    department: string
    type: string
    startDate: string
    endDate: string
    days: number
    reason: string
    status: string
    appliedDate: string
    approvedBy: string | null
    notes: string
    createdAt: string
}

// ============================================
// CONFIG
// ============================================

const leaveTypeConfig: Record<string, { labelKey: string; icon: typeof Palmtree; color: string; bgColor: string }> = {
    annual: { labelKey: 'hr.leave.type.annual', icon: Palmtree, color: 'text-blue-700', bgColor: 'bg-blue-100' },
    sick: { labelKey: 'hr.leave.type.sick', icon: Thermometer, color: 'text-red-700', bgColor: 'bg-red-100' },
    personal: { labelKey: 'hr.leave.type.personal', icon: Home, color: 'text-purple-700', bgColor: 'bg-purple-100' },
    maternity: { labelKey: 'hr.leave.type.maternity', icon: Baby, color: 'text-pink-700', bgColor: 'bg-pink-100' },
    unpaid: { labelKey: 'hr.leave.type.unpaid', icon: Wallet, color: 'text-orange-700', bgColor: 'bg-orange-100' },
}

const statusConfig: Record<string, { labelKey: string; color: string }> = {
    pending: { labelKey: 'hr.leave.status.pending', color: 'bg-yellow-100 text-yellow-800' },
    approved: { labelKey: 'hr.leave.status.approved', color: 'bg-green-100 text-green-800' },
    rejected: { labelKey: 'hr.leave.status.rejected', color: 'bg-red-100 text-red-800' },
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function LeaveDetailPage({ params }: { params: { id: string } }) {
    const { t } = useTranslation()
    const router = useRouter()
    const { data: session } = useSession()
    const { canMutate: canMutateFn } = usePermission()
    const canMutate = canMutateFn('hr')

    const [leave, setLeave] = useState<LeaveDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null)
    const [confirmTitle, setConfirmTitle] = useState('')
    const [confirmMessage, setConfirmMessage] = useState('')
    const [processing, setProcessing] = useState(false)

    // ============================================
    // EFFECTS
    // ============================================

    useEffect(() => {
        fetchLeave()
    }, [params.id])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    // ============================================
    // DATA FETCHING
    // ============================================

    const fetchLeave = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await fetch(`/api/hr/leaves/${params.id}`)
            const data = await response.json()
            if (data.success) {
                setLeave(data.data)
            } else {
                setError(data.error || t('hr.leave.error.loadFailed'))
            }
        } catch {
            setError(t('hr.leave.error.loadFailed'))
        } finally {
            setLoading(false)
        }
    }

    // ============================================
    // HANDLERS
    // ============================================

    const handleApprove = () => {
        setConfirmTitle(t('hr.leave.confirm.approveTitle'))
        setConfirmMessage(`${t('hr.leave.confirm.approveMessage')} ${leave?.employeeName || ''}`)
        setConfirmAction(() => async () => {
            try {
                setProcessing(true)
                const response = await fetch(`/api/hr/leaves/${params.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'APPROVED' }),
                })
                const result = await response.json()
                if (result.success) {
                    setLeave((prev) => prev ? { ...prev, status: 'approved' } : prev)
                    setToast({ message: t('hr.leave.toast.approveSuccess'), type: 'success' })
                } else {
                    setToast({ message: result.error || t('hr.leave.toast.approveFailed'), type: 'error' })
                }
            } catch {
                setToast({ message: t('hr.leave.toast.approveFailed'), type: 'error' })
            } finally {
                setProcessing(false)
            }
        })
        setShowConfirmDialog(true)
    }

    const handleReject = () => {
        setConfirmTitle(t('hr.leave.confirm.rejectTitle'))
        setConfirmMessage(`${t('hr.leave.confirm.rejectMessage')} ${leave?.employeeName || ''}`)
        setConfirmAction(() => async () => {
            try {
                setProcessing(true)
                const response = await fetch(`/api/hr/leaves/${params.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'REJECTED' }),
                })
                const result = await response.json()
                if (result.success) {
                    setLeave((prev) => prev ? { ...prev, status: 'rejected' } : prev)
                    setToast({ message: t('hr.leave.toast.rejectSuccess'), type: 'success' })
                } else {
                    setToast({ message: result.error || t('hr.leave.toast.rejectFailed'), type: 'error' })
                }
            } catch {
                setToast({ message: t('hr.leave.toast.rejectFailed'), type: 'error' })
            } finally {
                setProcessing(false)
            }
        })
        setShowConfirmDialog(true)
    }

    // ============================================
    // RENDER: LOADING
    // ============================================

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse" />
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4" />
                            <div className="grid grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="space-y-1">
                                        <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                                        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4" />
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex justify-between">
                                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // ============================================
    // RENDER: ERROR
    // ============================================

    if (error || !leave) {
        return (
            <div className="p-6">
                <div className="flex flex-col items-center justify-center py-12">
                    <AlertTriangle className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">{error || t('hr.leave.error.notFound')}</p>
                    <Link
                        href="/dashboard/hr/leaves"
                        className="mt-4 text-blue-600 hover:underline"
                    >
                        ← {t('hr.leave.backToList')}
                    </Link>
                </div>
            </div>
        )
    }

    // ============================================
    // COMPUTED VALUES
    // ============================================

    const typeConfig = leaveTypeConfig[leave.type] || leaveTypeConfig.annual
    const TypeIcon = typeConfig.icon
    const statusCfg = statusConfig[leave.status] || statusConfig.pending
    const isPending = leave.status === 'pending'

    // Build timeline
    const timelineEvents = [
        {
            date: leave.appliedDate,
            label: t('hr.leave.timeline.applied'),
            color: 'bg-blue-500',
        },
    ]
    if (leave.status === 'approved' && leave.approvedBy) {
        timelineEvents.push({
            date: leave.appliedDate,
            label: `${t('hr.leave.timeline.approvedBy')} ${leave.approvedBy || ''}`,
            color: 'bg-green-500',
        })
    } else if (leave.status === 'rejected') {
        timelineEvents.push({
            date: leave.appliedDate,
            label: t('hr.leave.timeline.rejected'),
            color: 'bg-red-500',
        })
    }

    return (
        <div className="space-y-6 p-6">
            {/* Toast */}
            {toast && (
                <div
                    className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}
                >
                    {toast.message}
                </div>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={showConfirmDialog}
                onClose={() => {
                    setShowConfirmDialog(false)
                    setConfirmAction(null)
                }}
                onConfirm={async () => {
                    if (confirmAction) await confirmAction()
                    setShowConfirmDialog(false)
                    setConfirmAction(null)
                }}
                title={confirmTitle}
                message={confirmMessage}
                confirmText={processing ? t('hr.leave.processing') : t('common.confirm')}
                variant="danger"
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/hr/leaves"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                                {t('hr.leave.detailTitle')}
                            </h1>
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                                {t(statusCfg.labelKey)}
                            </span>
                        </div>
                        <p className="text-gray-500 mt-1">{leave.employeeName} — {leave.employeeNumber}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isPending && canMutate && (
                        <>
                            <button
                                onClick={handleApprove}
                                disabled={processing}
                                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                {t('hr.leave.approve')}
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={processing}
                                className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                                <X className="h-4 w-4" />
                                {t('hr.leave.reject')}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Leave Details */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-gray-400" />
                            {t('hr.leave.detailTitle')}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">{t('hr.leave.fields.type')}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${typeConfig.bgColor} ${typeConfig.color}`}>
                                        <TypeIcon className="h-3.5 w-3.5" />
                                        {t(typeConfig.labelKey)}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('hr.leave.fields.days')}</p>
                                <p className="font-medium text-gray-900 mt-1">{leave.days}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('hr.leave.fields.startDate')}</p>
                                <p className="font-medium text-gray-900 mt-1">{formatDate(leave.startDate)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('hr.leave.fields.endDate')}</p>
                                <p className="font-medium text-gray-900 mt-1">{formatDate(leave.endDate)}</p>
                            </div>
                            <div className="sm:col-span-2">
                                <p className="text-sm text-gray-500">{t('hr.leave.fields.reason')}</p>
                                <p className="font-medium text-gray-900 mt-1">{leave.reason || '-'}</p>
                            </div>
                            {leave.notes && (
                                <div className="sm:col-span-2">
                                    <p className="text-sm text-gray-500">{t('hr.leave.fields.notes')}</p>
                                    <p className="font-medium text-gray-900 mt-1">{leave.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-gray-400" />
                            {t('hr.leave.timeline.title')}
                        </h2>
                        <div className="relative ml-3 border-l-2 border-gray-200 pl-6">
                            {timelineEvents.map((event, idx) => (
                                <div key={idx} className="relative mb-6 last:mb-0">
                                    <div className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full ${event.color} ring-2 ring-white`} />
                                    <p className="text-sm font-medium text-gray-900">{event.label}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{formatDate(event.date)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Employee Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <User className="h-5 w-5 text-gray-400" />
                            {t('hr.leave.employeeInfo.title')}
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.leave.employeeInfo.name')}</span>
                                <span className="text-sm font-medium text-gray-900">{leave.employeeName}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.leave.employeeInfo.nip')}</span>
                                <span className="font-mono text-sm text-gray-900">{leave.employeeNumber}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.leave.employeeInfo.position')}</span>
                                <span className="text-sm font-medium text-gray-900">{leave.position || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.leave.employeeInfo.department')}</span>
                                <span className="text-sm font-medium text-gray-900">{leave.department || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Leave Summary */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-gray-400" />
                            {t('hr.leave.summary.title')}
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.leave.summary.applied')}</span>
                                <span className="text-sm text-gray-900">{formatDate(leave.appliedDate)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('common.status')}</span>
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}>
                                    {t(statusCfg.labelKey)}
                                </span>
                            </div>
                            {leave.approvedBy && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">{t('hr.leave.summary.approvedBy')}</span>
                                    <span className="text-sm font-medium text-gray-900">{leave.approvedBy}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('hr.leave.actions.title')}</h2>
                        <div className="space-y-3">
                            <Link
                                href={`/dashboard/hr/employees/${leave.employeeId}`}
                                className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 w-full"
                            >
                                <User className="h-4 w-4" />
                                {t('hr.leave.actions.viewProfile')}
                            </Link>
                            <Link
                                href="/dashboard/hr/leaves"
                                className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 w-full"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                {t('hr.leave.actions.backToList')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
