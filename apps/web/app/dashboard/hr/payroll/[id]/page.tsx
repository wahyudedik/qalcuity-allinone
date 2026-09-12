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
    Calculator,
    User,
    FileText,
    AlertTriangle,
    Loader2,
    CheckCircle,
    Clock,
    Wallet,
    TrendingUp,
    TrendingDown,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// ============================================
// TYPES
// ============================================

interface PayrollDetail {
    id: string
    period: string
    baseSalary: number
    allowances: number
    deductions: number
    bonus: number
    netSalary: number
    status: string
    paidAt: string | null
    notes: string
    employee: {
        id: string
        employeeId: string
        name: string
        email: string
        position: string
        department: string
    }
    createdAt: string
    updatedAt: string
}

// ============================================
// CONFIG
// ============================================

const statusConfig: Record<string, { labelKey: string; color: string; icon: typeof Clock }> = {
    PENDING: { labelKey: 'hr.payroll.status.pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    PROCESSED: { labelKey: 'hr.payroll.status.processed', color: 'bg-blue-100 text-blue-800', icon: Calculator },
    PAID: { labelKey: 'hr.payroll.status.paid', color: 'bg-green-100 text-green-800', icon: CheckCircle },
}

// ============================================
// HELPERS
// ============================================

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function PayrollDetailPage({ params }: { params: { id: string } }) {
    const { t } = useTranslation()
    const router = useRouter()
    const { data: session } = useSession()
    const { canMutate: canMutateFn } = usePermission()
    const canMutate = canMutateFn('hr')

    const [payroll, setPayroll] = useState<PayrollDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [processing, setProcessing] = useState(false)

    // ============================================
    // EFFECTS
    // ============================================

    useEffect(() => {
        fetchPayroll()
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

    const fetchPayroll = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await fetch(`/api/hr/payroll/${params.id}`)
            const data = await response.json()
            if (data.success) {
                setPayroll(data.data)
            } else {
                setError(data.error || t('hr.payroll.error.loadFailed'))
            }
        } catch {
            setError(t('hr.payroll.error.loadFailed'))
        } finally {
            setLoading(false)
        }
    }

    // ============================================
    // HANDLERS
    // ============================================

    const handleMarkPaid = async () => {
        try {
            setProcessing(true)
            const response = await fetch(`/api/hr/payroll/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'PAID' }),
            })
            const result = await response.json()
            if (result.success) {
                setPayroll((prev) => prev ? { ...prev, status: 'PAID', paidAt: new Date().toISOString() } : prev)
                setToast({ message: t('hr.payroll.toast.markPaidSuccess') || 'Gaji berhasil ditandai sebagai dibayar', type: 'success' })
            } else {
                setToast({ message: result.error || t('hr.payroll.toast.markPaidFailed'), type: 'error' })
            }
        } catch {
            setToast({ message: t('hr.payroll.toast.markPaidFailed'), type: 'error' })
        } finally {
            setProcessing(false)
            setShowConfirmDialog(false)
        }
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

    if (error || !payroll) {
        return (
            <div className="p-6">
                <div className="flex flex-col items-center justify-center py-12">
                    <AlertTriangle className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">{error || t('hr.payroll.error.notFound')}</p>
                    <Link
                        href="/dashboard/hr/payroll"
                        className="mt-4 text-blue-600 hover:underline"
                    >
                        ← {t('hr.payroll.backToList')}
                    </Link>
                </div>
            </div>
        )
    }

    // ============================================
    // COMPUTED VALUES
    // ============================================

    const statusCfg = statusConfig[payroll.status] || statusConfig.PENDING
    const StatusIcon = statusCfg.icon
    const isPending = payroll.status === 'PENDING'
    const isProcessed = payroll.status === 'PROCESSED'
    const showPayButton = (isPending || isProcessed) && canMutate

    return (
        <div className="space-y-6 p-6">
            {/* Toast */}
            {toast && (
                <div
                    className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                >
                    {toast.message}
                </div>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={showConfirmDialog}
                onClose={() => setShowConfirmDialog(false)}
                onConfirm={handleMarkPaid}
                title={t('hr.payroll.confirm.markPaidTitle') || 'Tandai sebagai Dibayar'}
                message={`${t('hr.payroll.confirm.markPaidMessage') || 'Apakah Anda yakin gaji untuk'} ${payroll.employee.name} ${t('hr.payroll.confirm.period') || 'periode'} ${payroll.period} ${t('hr.payroll.confirm.alreadyPaid') || 'sudah dibayar?'}`}
                confirmText={processing ? (t('common.processing') || 'Memproses...') : (t('common.confirm') || 'Ya, Dibayar')}
                variant="danger"
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/hr/payroll"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                                {t('hr.payroll.detailTitle')} — {payroll.period}
                            </h1>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                                <StatusIcon className="h-3 w-3" />
                                {t(statusCfg.labelKey)}
                            </span>
                        </div>
                        <p className="text-gray-500 mt-1">{payroll.employee.name} — {payroll.employee.employeeId}</p>
                    </div>
                </div>
                {showPayButton && (
                    <button
                        onClick={() => setShowConfirmDialog(true)}
                        disabled={processing}
                        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                        {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        {t('hr.payroll.markPaid') || 'Tandai Dibayar'}
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Salary Breakdown */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-gray-400" />
                            {t('hr.payroll.detail.salaryBreakdown') || 'Rincian Gaji'}
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-sm text-gray-500">{t('hr.payroll.detail.baseSalary') || 'Gaji Pokok'}</span>
                                <span className="font-medium text-gray-900">{formatCurrency(payroll.baseSalary)}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                    {t('hr.payroll.detail.allowances') || 'Tunjangan'}
                                </span>
                                <span className="font-medium text-green-600">+{formatCurrency(payroll.allowances)}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                    {t('hr.payroll.detail.deductions') || 'Potongan'}
                                </span>
                                <span className="font-medium text-red-600">-{formatCurrency(payroll.deductions)}</span>
                            </div>
                            {payroll.bonus > 0 && (
                                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                    <span className="text-sm text-gray-500">{t('hr.payroll.detail.bonus') || 'Bonus'}</span>
                                    <span className="font-medium text-green-600">+{formatCurrency(payroll.bonus)}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between py-3 border-t-2 border-gray-200">
                                <span className="text-base font-semibold text-gray-900">{t('hr.payroll.detail.netSalary') || 'Gaji Bersih'}</span>
                                <span className="text-lg font-bold text-blue-600">{formatCurrency(payroll.netSalary)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {payroll.notes && (
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-gray-400" />
                                {t('hr.payroll.detail.notes') || 'Catatan'}
                            </h2>
                            <p className="text-gray-700">{payroll.notes}</p>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Employee Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <User className="h-5 w-5 text-gray-400" />
                            {t('hr.payroll.detail.employeeInfo') || 'Informasi Karyawan'}
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.payroll.detail.name') || 'Nama'}</span>
                                <Link
                                    href={`/dashboard/hr/employees/${payroll.employee.id}`}
                                    className="text-sm font-medium text-blue-600 hover:underline"
                                >
                                    {payroll.employee.name}
                                </Link>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.payroll.detail.nip') || 'NIP'}</span>
                                <span className="font-mono text-sm text-gray-900">{payroll.employee.employeeId}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.payroll.detail.position') || 'Posisi'}</span>
                                <span className="text-sm font-medium text-gray-900">{payroll.employee.position}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.payroll.detail.department') || 'Departemen'}</span>
                                <span className="text-sm font-medium text-gray-900">{payroll.employee.department || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Summary */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-gray-400" />
                            {t('hr.payroll.detail.paymentSummary') || 'Ringkasan Pembayaran'}
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.payroll.detail.period') || 'Periode'}</span>
                                <span className="text-sm font-medium text-gray-900">{payroll.period}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('common.status')}</span>
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}>
                                    {t(statusCfg.labelKey)}
                                </span>
                            </div>
                            {payroll.paidAt && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">{t('hr.payroll.detail.paidAt') || 'Dibayar'}</span>
                                    <span className="text-sm font-medium text-gray-900">{formatDate(payroll.paidAt)}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.payroll.detail.createdAt') || 'Dibuat'}</span>
                                <span className="text-sm font-medium text-gray-900">{formatDate(payroll.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
