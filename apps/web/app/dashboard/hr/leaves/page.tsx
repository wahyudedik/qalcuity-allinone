'use client'

import { useState, useEffect, useCallback } from 'react'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useTranslation } from '@/lib/i18n'
import {
    Search,
    Plus,
    ClipboardList,
    BarChart3,
    Calendar,
    AlertTriangle,
    Check,
    X,
    Clock,
    Loader2,
    MessageCircle,
    Palmtree,
    Thermometer,
    Home,
    Baby,
    Wallet,
    Trash2,
    Eye,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useRouter } from 'next/navigation'

interface LeaveRequest {
    id: string
    employeeName: string
    type: 'annual' | 'sick' | 'personal' | 'maternity' | 'unpaid'
    startDate: string
    endDate: string
    days: number
    reason: string
    status: 'pending' | 'approved' | 'rejected'
    appliedDate: string
    approvedBy?: string
}

interface LeaveFormData {
    type: string
    startDate: string
    endDate: string
    reason: string
}

interface FormErrors {
    type?: string
    startDate?: string
    endDate?: string
    reason?: string
}

function validateLeaveForm(data: LeaveFormData): FormErrors {
    const errors: FormErrors = {}

    if (!data.type) {
        errors.type = 'Tipe cuti wajib dipilih'
    }

    if (!data.startDate) {
        errors.startDate = 'Tanggal mulai wajib diisi'
    }

    if (!data.endDate) {
        errors.endDate = 'Tanggal selesai wajib diisi'
    } else if (data.startDate && data.endDate) {
        const start = new Date(data.startDate)
        const end = new Date(data.endDate)
        if (end < start) {
            errors.endDate = 'Tanggal selesai harus setelah tanggal mulai'
        }
    }

    if (!data.reason || data.reason.trim().length < 10) {
        errors.reason = 'Alasan cuti harus minimal 10 karakter'
    }

    return errors
}

function calculateDays(start: string, end: string): number {
    if (!start || !end) return 0
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffTime = endDate.getTime() - startDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays > 0 ? diffDays : 0
}

export default function LeavesPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const router = useRouter()
    const canMutate = session?.user?.role !== 'VIEWER'
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'requests' | 'balance' | 'calendar'>('requests')
    const [filterStatus, setFilterStatus] = useState('all')
    const [filterType, setFilterType] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [showApproveConfirm, setShowApproveConfirm] = useState(false)
    const [showRejectConfirm, setShowRejectConfirm] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [confirmActionId, setConfirmActionId] = useState<string | null>(null)

    // Form modal state
    const [showForm, setShowForm] = useState(false)
    const [formData, setFormData] = useState<LeaveFormData>({
        type: '',
        startDate: '',
        endDate: '',
        reason: '',
    })
    const [formErrors, setFormErrors] = useState<FormErrors>({})
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const leaveTypeConfig = {
        annual: { label: t('hr.leaves.annual') || 'Cuti Tahunan', color: 'bg-blue-100 text-blue-700', icon: Palmtree },
        sick: { label: t('hr.leaves.sick') || 'Sakit', color: 'bg-red-100 text-red-700', icon: Thermometer },
        personal: { label: t('hr.leaves.personal') || 'Cuti Pribadi', color: 'bg-purple-100 text-purple-700', icon: Home },
        maternity: { label: t('hr.leaves.maternity') || 'Cuti Melahirkan', color: 'bg-pink-100 text-pink-700', icon: Baby },
        unpaid: { label: t('hr.leaves.unpaid') || 'Cuti Tanpa Gaji', color: 'bg-gray-100 text-gray-700', icon: Wallet },
    }

    const statusConfig = {
        pending: { label: t('hr.leaves.pending') || 'Menunggu', color: 'bg-yellow-100 text-yellow-700' },
        approved: { label: t('hr.leaves.approved') || 'Disetujui', color: 'bg-green-100 text-green-700' },
        rejected: { label: t('hr.leaves.rejected') || 'Ditolak', color: 'bg-red-100 text-red-700' },
    }

    const fetchLeaves = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (searchQuery) params.set('search', searchQuery)
            if (filterStatus !== 'all') params.set('status', filterStatus)
            if (filterType !== 'all') params.set('type', filterType)

            const res = await fetch(`/api/hr/leaves?${params.toString()}`)
            const data = await res.json()

            if (data.success) {
                setLeaveRequests(data.data)
            } else {
                setError(data.error || 'Gagal memuat data cuti')
            }
        } catch {
            setError('Gagal memuat data cuti. Periksa koneksi jaringan Anda.')
        } finally {
            setLoading(false)
        }
    }, [searchQuery, filterStatus, filterType])

    useEffect(() => {
        fetchLeaves()
    }, [fetchLeaves])

    const filteredRequests = leaveRequests.filter(req => {
        const matchesSearch = req.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = filterStatus === 'all' || req.status === filterStatus
        const matchesType = filterType === 'all' || req.type === filterType
        return matchesSearch && matchesStatus && matchesType
    })

    const handleApprove = async (id: string) => {
        setConfirmActionId(id)
        setShowApproveConfirm(true)
    }

    const confirmApprove = async () => {
        if (!confirmActionId) return
        setShowApproveConfirm(false)
        setProcessingId(confirmActionId)
        try {
            const res = await fetch('/api/hr/leaves', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: confirmActionId, status: 'approved', approvedBy: session?.user?.name || 'Admin' }),
            })
            const result = await res.json()
            if (result.success) {
                fetchLeaves()
                setToast({ message: 'Permohonan cuti berhasil disetujui', type: 'success' })
            } else {
                setToast({ message: `Gagal menyetujui: ${result.error}`, type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menyetujui permohonan cuti', type: 'error' })
        } finally {
            setProcessingId(null)
            setConfirmActionId(null)
        }
    }

    const handleReject = async (id: string) => {
        setConfirmActionId(id)
        setShowRejectConfirm(true)
    }

    const confirmReject = async () => {
        if (!confirmActionId) return
        setShowRejectConfirm(false)
        setProcessingId(confirmActionId)
        try {
            const res = await fetch('/api/hr/leaves', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: confirmActionId, status: 'rejected' }),
            })
            const result = await res.json()
            if (result.success) {
                fetchLeaves()
                setToast({ message: 'Permohonan cuti ditolak', type: 'success' })
            } else {
                setToast({ message: `Gagal menolak: ${result.error}`, type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menolak permohonan cuti', type: 'error' })
        } finally {
            setProcessingId(null)
            setConfirmActionId(null)
        }
    }

    const handleDelete = async (id: string) => {
        setConfirmActionId(id)
        setShowDeleteConfirm(true)
    }

    const confirmDelete = async () => {
        if (!confirmActionId) return
        setShowDeleteConfirm(false)
        try {
            const response = await fetch(`/api/hr/leaves?id=${confirmActionId}`, { method: 'DELETE' })
            const result = await response.json()
            if (result.success) {
                fetchLeaves()
                setToast({ message: 'Permohonan cuti berhasil dihapus', type: 'success' })
            } else {
                setToast({ message: `Gagal menghapus: ${result.error}`, type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menghapus permohonan cuti', type: 'error' })
        } finally {
            setConfirmActionId(null)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const errors = validateLeaveForm(formData)
        setFormErrors(errors)

        if (Object.keys(errors).length > 0) return

        setSubmitting(true)
        try {
            const res = await fetch('/api/hr/leaves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    days: calculateDays(formData.startDate, formData.endDate),
                }),
            })
            const result = await res.json()

            if (result.success) {
                setShowForm(false)
                setFormData({ type: '', startDate: '', endDate: '', reason: '' })
                fetchLeaves()
                setToast({ message: 'Permohonan cuti berhasil diajukan', type: 'success' })
            } else {
                setToast({ message: result.error || 'Gagal mengajukan cuti', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal mengajukan permohonan cuti', type: 'error' })
        } finally {
            setSubmitting(false)
        }
    }

    const handleFormChange = (field: keyof LeaveFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
        if (formErrors[field]) {
            setFormErrors((prev) => ({ ...prev, [field]: undefined }))
        }
    }

    const pendingCount = leaveRequests.filter(r => r.status === 'pending').length
    const approvedCount = leaveRequests.filter(r => r.status === 'approved').length
    const rejectedCount = leaveRequests.filter(r => r.status === 'rejected').length

    const leaveBalance = [
        { type: 'annual', total: 12, used: 5, remaining: 7 },
        { type: 'sick', total: 12, used: 2, remaining: 10 },
        { type: 'personal', total: 3, used: 1, remaining: 2 },
    ]

    if (loading) {
        return (
            <div className="space-y-6">
                <LoadingSkeleton lines={2} />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {[1, 2, 3, 4].map(i => <LoadingSkeleton key={i} lines={1} />)}
                </div>
                <LoadingSkeleton lines={1} />
                <LoadingSkeleton lines={5} />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-12">
                <AlertTriangle className="h-10 w-10 text-yellow-500" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">{error}</h3>
                <button onClick={fetchLeaves} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    Coba Lagi
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('hr.leaves.title') || 'Cuti'}</h1>
                    <p className="text-gray-500">{t('hr.leaves.subtitle') || 'Kelola permohonan dan jatah cuti karyawan'}</p>
                </div>
                {canMutate && (
                    <button
                        onClick={() => {
                            setFormData({ type: '', startDate: '', endDate: '', reason: '' })
                            setFormErrors({})
                            setShowForm(true)
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        {t('hr.leaves.requestLeave') || 'Ajukan Cuti'}
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-2xl font-bold text-gray-900">{leaveRequests.length}</div>
                    <div className="text-sm text-gray-500">{t('hr.leaves.totalRequests') || 'Total Permohonan'}</div>
                </div>
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                    <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                    <div className="text-sm text-yellow-600">{t('hr.leaves.pendingApproval') || 'Menunggu Persetujuan'}</div>
                </div>
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
                    <div className="text-sm text-green-600">{t('hr.leaves.approved') || 'Disetujui'}</div>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
                    <div className="text-sm text-red-600">{t('hr.leaves.rejected') || 'Ditolak'}</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-1">
                    {[
                        { key: 'requests' as const, label: t('hr.leaves.requestsTab') || 'Permohonan Cuti', icon: ClipboardList },
                        { key: 'balance' as const, label: t('hr.leaves.balanceTab') || 'Saldo Cuti', icon: BarChart3 },
                        { key: 'calendar' as const, label: t('hr.leaves.calendarTab') || 'Kalender Cuti', icon: Calendar },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Requests Tab */}
            {activeTab === 'requests' && (
                <>
                    {/* Filters */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('hr.leaves.searchPlaceholder') || 'Cari nama karyawan...'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                        >
                            <option value="all">{t('hr.leaves.allStatuses') || 'Semua Status'}</option>
                            <option value="pending">{t('hr.leaves.pending') || 'Menunggu'}</option>
                            <option value="approved">{t('hr.leaves.approved') || 'Disetujui'}</option>
                            <option value="rejected">{t('hr.leaves.rejected') || 'Ditolak'}</option>
                        </select>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                        >
                            <option value="all">{t('hr.leaves.allTypes') || 'Semua Tipe'}</option>
                            <option value="annual">{t('hr.leaves.annual') || 'Cuti Tahunan'}</option>
                            <option value="sick">{t('hr.leaves.sick') || 'Sakit'}</option>
                            <option value="personal">{t('hr.leaves.personal') || 'Cuti Pribadi'}</option>
                            <option value="maternity">{t('hr.leaves.maternity') || 'Cuti Melahirkan'}</option>
                            <option value="unpaid">{t('hr.leaves.unpaid') || 'Cuti Tanpa Gaji'}</option>
                        </select>
                    </div>

                    {/* Leave Requests List */}
                    <div className="space-y-4">
                        {filteredRequests.map((request) => {
                            const typeConfig = leaveTypeConfig[request.type] || leaveTypeConfig.annual
                            const TypeIcon = typeConfig.icon
                            return (
                                <div key={request.id} className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${typeConfig.color}`}>
                                                    <TypeIcon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{request.employeeName}</h3>
                                                    <p className="text-sm text-gray-500">{request.id} • {t('hr.leaves.appliedDate') || 'Diajukan'} {new Date(request.appliedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 ml-13">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeConfig.color}`}>
                                                        {typeConfig.label}
                                                    </span>
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig[request.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                                                        {statusConfig[request.status]?.label || request.status}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        {new Date(request.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {new Date(request.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {request.days} hari
                                                    </span>
                                                </div>
                                                <p className="mt-2 flex items-center gap-1 text-sm text-gray-500">
                                                    <MessageCircle className="h-3.5 w-3.5" />
                                                    {request.reason}
                                                </p>
                                                {request.approvedBy && (
                                                    <p className="mt-1 text-xs text-gray-400">{t('hr.leaves.approvedBy') || 'Oleh'}: {request.approvedBy}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 md:flex-col">
                                            {request.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleApprove(request.id)}
                                                        disabled={processingId === request.id}
                                                        className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                        {t('hr.leaves.approve') || 'Setujui'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(request.id)}
                                                        disabled={processingId === request.id}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                                        {t('hr.leaves.reject') || 'Tolak'}
                                                    </button>
                                                </>
                                            )}
                                            {canMutate && (
                                                <button onClick={() => handleDelete(request.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4" />
                                                    {t('hr.leaves.delete') || 'Hapus'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {filteredRequests.length === 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                            <ClipboardList className="mx-auto h-10 w-10 text-gray-400" />
                            <h3 className="mt-4 text-lg font-medium text-gray-900">Tidak ada permohonan cuti</h3>
                            <p className="mt-2 text-gray-500">Belum ada permohonan cuti yang sesuai dengan filter</p>
                        </div>
                    )}
                </>
            )}

            {/* Balance Tab */}
            {activeTab === 'balance' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {leaveBalance.map((balance) => {
                            const config = leaveTypeConfig[balance.type as keyof typeof leaveTypeConfig]
                            const BalanceIcon = config.icon
                            const percentage = Math.round((balance.used / balance.total) * 100)
                            return (
                                <div key={balance.type} className="rounded-xl border border-gray-200 bg-white p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${config.color}`}>
                                            <BalanceIcon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{config.label}</h3>
                                            <p className="text-sm text-gray-500">Tahun {new Date().getFullYear()}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Terpakai</span>
                                            <span className="font-medium text-gray-900">{balance.used} dari {balance.total} hari</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-gray-100">
                                            <div className="h-2 rounded-full bg-blue-600" style={{ width: `${percentage}%` }} />
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Sisa</span>
                                            <span className="font-bold text-green-600">{balance.remaining} hari</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Calendar Tab */}
            {activeTab === 'calendar' && (
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                        </h3>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => (
                            <div key={day} className="py-2 font-medium text-gray-500">{day}</div>
                        ))}
                        {Array.from({ length: 35 }, (_, i) => {
                            const day = i - 0 + 1
                            const isCurrentMonth = day >= 1 && day <= 31
                            const isToday = day === new Date().getDate()
                            return (
                                <div
                                    key={i}
                                    className={`min-h-[60px] rounded-lg border p-1 ${isCurrentMonth ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'} ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                                >
                                    <div className={`text-right p-1 ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {isCurrentMonth ? day : ''}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <h2 className="text-lg font-semibold text-gray-900">Ajukan Cuti Baru</h2>
                            <button onClick={() => setShowForm(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                            {/* Leave Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipe Cuti <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => handleFormChange('type', e.target.value)}
                                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.type ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                >
                                    <option value="">Pilih tipe cuti</option>
                                    <option value="annual">Cuti Tahunan</option>
                                    <option value="sick">Sakit</option>
                                    <option value="personal">Cuti Pribadi</option>
                                    <option value="maternity">Cuti Melahirkan</option>
                                    <option value="unpaid">Cuti Tanpa Gaji</option>
                                </select>
                                {formErrors.type && <p className="mt-1 text-xs text-red-600">{formErrors.type}</p>}
                            </div>

                            {/* Start Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tanggal Mulai <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => handleFormChange('startDate', e.target.value)}
                                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.startDate ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                />
                                {formErrors.startDate && <p className="mt-1 text-xs text-red-600">{formErrors.startDate}</p>}
                            </div>

                            {/* End Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tanggal Selesai <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => handleFormChange('endDate', e.target.value)}
                                    min={formData.startDate || undefined}
                                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.endDate ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                />
                                {formErrors.endDate && <p className="mt-1 text-xs text-red-600">{formErrors.endDate}</p>}
                                {formData.startDate && formData.endDate && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        Total: {calculateDays(formData.startDate, formData.endDate)} hari
                                    </p>
                                )}
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Alasan <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => handleFormChange('reason', e.target.value)}
                                    rows={3}
                                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.reason ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                    placeholder="Jelaskan alasan cuti Anda (minimal 10 karakter)"
                                />
                                {formErrors.reason && <p className="mt-1 text-xs text-red-600">{formErrors.reason}</p>}
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" disabled={submitting}>
                                    Batal
                                </button>
                                <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {submitting ? 'Mengirim...' : 'Ajukan Cuti'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Approve Confirm Dialog */}
            <ConfirmDialog
                isOpen={showApproveConfirm}
                onClose={() => { setShowApproveConfirm(false); setConfirmActionId(null) }}
                onConfirm={confirmApprove}
                title="Setujui Cuti"
                message="Apakah Anda yakin ingin menyetujui permohonan cuti ini?"
                confirmText="Setujui"
                variant="info"
                isLoading={processingId === confirmActionId}
            />

            {/* Reject Confirm Dialog */}
            <ConfirmDialog
                isOpen={showRejectConfirm}
                onClose={() => { setShowRejectConfirm(false); setConfirmActionId(null) }}
                onConfirm={confirmReject}
                title="Tolak Cuti"
                message="Apakah Anda yakin ingin menolak permohonan cuti ini?"
                confirmText="Tolak"
                variant="warning"
                isLoading={processingId === confirmActionId}
            />

            {/* Delete Confirm Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => { setShowDeleteConfirm(false); setConfirmActionId(null) }}
                onConfirm={confirmDelete}
                title="Hapus Cuti"
                message="Apakah Anda yakin ingin menghapus permohonan cuti ini?"
                confirmText="Hapus"
                variant="danger"
            />

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                    <span className="inline-flex items-center gap-1.5">
                        {toast.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        {toast.message}
                    </span>
                </div>
            )}
        </div>
    )
}
