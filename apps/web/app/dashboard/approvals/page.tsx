'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
    CheckCircle,
    XCircle,
    Clock,
    Shield,
    Plus,
    Trash2,
    Search,
    Filter,
    ChevronDown,
    ChevronUp,
    MessageSquare,
    Settings,
    FileText,
    ShoppingCart,
    PenLine,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────

type ApprovalLevel = {
    id: string
    entityType: string
    level: number
    name: string
    requiredRole: string
    isActive: boolean
    createdAt: string
}

type ApprovalRequest = {
    id: string
    entityType: string
    entityId: string
    currentLevel: number
    status: string
    requestedBy: string
    requestedAt: string
    resolvedBy: string | null
    resolvedAt: string | null
    comments: string | null
    levelName: string
    requesterName: string
    requesterEmail: string
}

const entityTypeConfig: Record<string, { label: string; color: string; icon: typeof FileText }> = {
    INVOICE: { label: 'Invoice', color: 'bg-blue-100 text-blue-700', icon: FileText },
    PURCHASE_ORDER: { label: 'Purchase Order', color: 'bg-purple-100 text-purple-700', icon: ShoppingCart },
    QUOTATION: { label: 'Quotation', color: 'bg-green-100 text-green-700', icon: PenLine },
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    PENDING: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    APPROVED: { label: 'Disetujui', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    REJECTED: { label: 'Ditolak', color: 'bg-red-100 text-red-700', icon: XCircle },
    CANCELLED: { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-700', icon: XCircle },
}

const roleOptions = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MEMBER', label: 'Member' },
    { value: 'SUPERADMIN', label: 'Super Admin' },
]

// ─── Main Component ───────────────────────────────────────────────────────

export default function ApprovalsPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const { addToast } = useToast()
    const canMutate = session?.user?.role !== 'VIEWER'
    const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN'

    const [activeTab, setActiveTab] = useState<'pending' | 'levels'>('pending')
    const [requests, setRequests] = useState<ApprovalRequest[]>([])
    const [levels, setLevels] = useState<ApprovalLevel[]>([])
    const [loading, setLoading] = useState(true)
    const [filterEntity, setFilterEntity] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [search, setSearch] = useState('')

    // Approval modal state
    const [showApproveModal, setShowApproveModal] = useState(false)
    const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null)
    const [approvalComments, setApprovalComments] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Reject modal state
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [rejectComments, setRejectComments] = useState('')

    // Level form state
    const [showLevelForm, setShowLevelForm] = useState(false)
    const [editingLevel, setEditingLevel] = useState<ApprovalLevel | null>(null)
    const [levelForm, setLevelForm] = useState({
        entityType: 'INVOICE',
        level: 1,
        name: '',
        requiredRole: 'ADMIN',
    })

    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deletingLevel, setDeletingLevel] = useState<ApprovalLevel | null>(null)

    const fetchRequests = useCallback(async () => {
        try {
            const params = new URLSearchParams()
            if (filterEntity) params.set('entityType', filterEntity)
            if (filterStatus) params.set('status', filterStatus)

            const res = await fetch(`/api/approval/requests?${params.toString()}`)
            const data = await res.json()
            if (data.success) {
                setRequests(data.data)
            }
        } catch (error) {
            console.error('Failed to fetch approval requests:', error);
        }
    }, [filterEntity, filterStatus])

    const fetchLevels = useCallback(async () => {
        try {
            const params = new URLSearchParams()
            if (filterEntity) params.set('entityType', filterEntity)

            const res = await fetch(`/api/approval/levels?${params.toString()}`)
            const data = await res.json()
            if (data.success) {
                setLevels(data.data)
            }
        } catch (error) {
            console.error('Failed to fetch approval levels:', error);
        }
    }, [filterEntity])

    useEffect(() => {
        setLoading(true)
        Promise.all([fetchRequests(), fetchLevels()]).finally(() => setLoading(false))
    }, [fetchRequests, fetchLevels])

    const handleApprove = async () => {
        if (!selectedRequest) return
        setIsSubmitting(true)
        try {
            const res = await fetch(`/api/approval/requests/${selectedRequest.id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comments: approvalComments || undefined }),
            })
            const data = await res.json()
            if (data.success) {
                setShowApproveModal(false)
                setSelectedRequest(null)
                setApprovalComments('')
                addToast('Berhasil menyetujui permintaan', 'success')
                fetchRequests()
                fetchLevels()
            } else {
                addToast(data.error || 'Gagal menyetujui', 'error')
            }
        } catch {
            addToast('Gagal menyetujui permintaan', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleReject = async () => {
        if (!selectedRequest) return
        if (!rejectComments.trim()) {
            addToast('Komentar wajib diisi saat menolak', 'error')
            return
        }
        setIsSubmitting(true)
        try {
            const res = await fetch(`/api/approval/requests/${selectedRequest.id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comments: rejectComments }),
            })
            const data = await res.json()
            if (data.success) {
                setShowRejectModal(false)
                setSelectedRequest(null)
                setRejectComments('')
                addToast('Permintaan berhasil ditolak', 'success')
                fetchRequests()
            } else {
                addToast(data.error || 'Gagal menolak', 'error')
            }
        } catch {
            addToast('Gagal menolak permintaan', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSaveLevel = async () => {
        if (!levelForm.name.trim()) return
        setIsSubmitting(true)
        try {
            if (editingLevel) {
                const res = await fetch(`/api/approval/levels/${editingLevel.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: levelForm.name,
                        requiredRole: levelForm.requiredRole,
                    }),
                })
                const data = await res.json()
                if (!data.success) {
                    addToast(data.error || 'Gagal update level', 'error')
                    return
                }
            } else {
                const res = await fetch('/api/approval/levels', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(levelForm),
                })
                const data = await res.json()
                if (!data.success) {
                    addToast(data.error || 'Gagal membuat level', 'error')
                    return
                }
            }
            addToast(editingLevel ? 'Level berhasil diupdate' : 'Level berhasil dibuat', 'success')
            setShowLevelForm(false)
            setEditingLevel(null)
            setLevelForm({ entityType: 'INVOICE', level: 1, name: '', requiredRole: 'ADMIN' })
            fetchLevels()
        } catch {
            addToast('Gagal menyimpan level', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteLevel = async () => {
        if (!deletingLevel) return
        try {
            const res = await fetch(`/api/approval/levels/${deletingLevel.id}`, {
                method: 'DELETE',
            })
            const data = await res.json()
            if (data.success) {
                setShowDeleteConfirm(false)
                setDeletingLevel(null)
                addToast('Level berhasil dihapus', 'success')
                fetchLevels()
            } else {
                addToast(data.error || 'Gagal menghapus level', 'error')
            }
        } catch {
            addToast('Gagal menghapus level', 'error')
        }
    }

    const filteredRequests = requests.filter((r) => {
        if (search && !r.entityId.toLowerCase().includes(search.toLowerCase()) &&
            !r.requesterName.toLowerCase().includes(search.toLowerCase())) {
            return false
        }
        return true
    })

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {t('approval.title') || 'Approval'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {t('approval.subtitle') || 'Kelola persetujuan transaksi bisnis'}
                    </p>
                </div>
                {isAdmin && activeTab === 'levels' && (
                    <button
                        onClick={() => {
                            setEditingLevel(null)
                            setLevelForm({ entityType: 'INVOICE', level: 1, name: '', requiredRole: 'ADMIN' })
                            setShowLevelForm(true)
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                        <Plus className="h-4 w-4" />
                        {t('approval.addLevel') || 'Tambah Level'}
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'pending'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t('approval.pendingApprovals') || 'Menunggu Persetujuan'}
                            {requests.filter((r) => r.status === 'PENDING').length > 0 && (
                                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                                    {requests.filter((r) => r.status === 'PENDING').length}
                                </span>
                            )}
                        </div>
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setActiveTab('levels')}
                            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'levels'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                {t('approval.approvalLevels') || 'Level Persetujuan'}
                            </div>
                        </button>
                    )}
                </nav>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('common.searchPlaceholder') || 'Cari...'}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                        value={filterEntity}
                        onChange={(e) => setFilterEntity(e.target.value)}
                        className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                    >
                        <option value="">Semua Tipe</option>
                        <option value="INVOICE">Invoice</option>
                        <option value="PURCHASE_ORDER">Purchase Order</option>
                        <option value="QUOTATION">Quotation</option>
                    </select>
                </div>
                {activeTab === 'pending' && (
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                    >
                        <option value="">Semua Status</option>
                        <option value="PENDING">Menunggu</option>
                        <option value="APPROVED">Disetujui</option>
                        <option value="REJECTED">Ditolak</option>
                    </select>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">{t('common.loading') || 'Memuat...'}</div>
            ) : activeTab === 'pending' ? (
                /* ─── Pending Approvals Tab ─────────────────────────── */
                filteredRequests.length === 0 ? (
                    <div className="text-center py-12">
                        <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                            {t('approval.noPending') || 'Tidak ada approval yang menunggu'}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Semua transaksi sudah diproses.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tipe
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Entity
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Level
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Requested By
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tanggal
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredRequests.map((req) => {
                                        const entityCfg = entityTypeConfig[req.entityType] || entityTypeConfig.INVOICE
                                        const statusCfg = statusConfig[req.status] || statusConfig.PENDING
                                        const StatusIcon = statusCfg.icon
                                        return (
                                            <tr key={req.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${entityCfg.color}`}>
                                                        <entityCfg.icon className="h-3 w-3" />
                                                        {entityCfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                                    {req.entityId.slice(0, 12)}...
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                    {req.levelName}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                    {req.requesterName}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(req.requestedAt).toLocaleDateString('id-ID')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                                                        <StatusIcon className="h-3 w-3" />
                                                        {statusCfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                    {req.status === 'PENDING' && canMutate && (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedRequest(req)
                                                                    setApprovalComments('')
                                                                    setShowApproveModal(true)
                                                                }}
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-xs font-medium"
                                                            >
                                                                <CheckCircle className="h-3.5 w-3.5" />
                                                                Setuju
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedRequest(req)
                                                                    setRejectComments('')
                                                                    setShowRejectModal(true)
                                                                }}
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-xs font-medium"
                                                            >
                                                                <XCircle className="h-3.5 w-3.5" />
                                                                Tolak
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden space-y-3">
                            {filteredRequests.map((req) => {
                                const entityCfg = entityTypeConfig[req.entityType] || entityTypeConfig.INVOICE
                                const statusCfg = statusConfig[req.status] || statusConfig.PENDING
                                const StatusIcon = statusCfg.icon
                                return (
                                    <div key={req.id} className="p-4 bg-white rounded-lg border border-gray-200 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${entityCfg.color}`}>
                                                <entityCfg.icon className="h-3 w-3" />
                                                {entityCfg.label}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                                                <StatusIcon className="h-3 w-3" />
                                                {statusCfg.label}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-900 font-mono">
                                            ID: {req.entityId.slice(0, 16)}...
                                        </div>
                                        <div className="text-sm text-gray-700">
                                            Level: {req.levelName}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            Oleh: {req.requesterName} &bull; {new Date(req.requestedAt).toLocaleDateString('id-ID')}
                                        </div>
                                        {req.comments && (
                                            <div className="text-sm text-gray-500 flex items-start gap-1">
                                                <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                                {req.comments}
                                            </div>
                                        )}
                                        {req.status === 'PENDING' && canMutate && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedRequest(req)
                                                        setApprovalComments('')
                                                        setShowApproveModal(true)
                                                    }}
                                                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-sm font-medium"
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                    Setuju
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedRequest(req)
                                                        setRejectComments('')
                                                        setShowRejectModal(true)
                                                    }}
                                                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                    Tolak
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )
            ) : (
                /* ─── Approval Levels Tab ──────────────────────────── */
                levels.length === 0 ? (
                    <div className="text-center py-12">
                        <Shield className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                            {t('approval.noLevels') || 'Belum ada level approval'}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Tambahkan level approval untuk memulai workflow persetujuan.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Level
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tipe Entity
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Nama
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Role Minimum
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {levels.map((level) => {
                                        const entityCfg = entityTypeConfig[level.entityType] || entityTypeConfig.INVOICE
                                        return (
                                            <tr key={level.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                                    {level.level}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${entityCfg.color}`}>
                                                        <entityCfg.icon className="h-3 w-3" />
                                                        {entityCfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {level.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                    {level.requiredRole}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${level.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {level.isActive ? 'Aktif' : 'Nonaktif'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingLevel(level)
                                                                setLevelForm({
                                                                    entityType: level.entityType,
                                                                    level: level.level,
                                                                    name: level.name,
                                                                    requiredRole: level.requiredRole,
                                                                })
                                                                setShowLevelForm(true)
                                                            }}
                                                            className="text-blue-600 hover:text-blue-900"
                                                        >
                                                            <Settings className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setDeletingLevel(level)
                                                                setShowDeleteConfirm(true)
                                                            }}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden space-y-3">
                            {levels.map((level) => {
                                const entityCfg = entityTypeConfig[level.entityType] || entityTypeConfig.INVOICE
                                return (
                                    <div key={level.id} className="p-4 bg-white rounded-lg border border-gray-200 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${entityCfg.color}`}>
                                                <entityCfg.icon className="h-3 w-3" />
                                                {entityCfg.label}
                                            </span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${level.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {level.isActive ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </div>
                                        <div className="text-sm font-medium text-gray-900">
                                            Level {level.level}: {level.name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            Role minimum: {level.requiredRole}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditingLevel(level)
                                                    setLevelForm({
                                                        entityType: level.entityType,
                                                        level: level.level,
                                                        name: level.name,
                                                        requiredRole: level.requiredRole,
                                                    })
                                                    setShowLevelForm(true)
                                                }}
                                                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium"
                                            >
                                                <Settings className="h-4 w-4" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setDeletingLevel(level)
                                                    setShowDeleteConfirm(true)
                                                }}
                                                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )
            )}

            {/* ─── Approve Modal ───────────────────────────────────── */}
            {showApproveModal && selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {t('approval.confirmApprove') || 'Konfirmasi Persetujuan'}
                        </h3>
                        <div className="text-sm text-gray-600 space-y-2">
                            <div>
                                <span className="font-medium">Tipe:</span>{' '}
                                {entityTypeConfig[selectedRequest.entityType]?.label}
                            </div>
                            <div>
                                <span className="font-medium">Level:</span>{' '}
                                {selectedRequest.levelName}
                            </div>
                            <div>
                                <span className="font-medium">Diminta oleh:</span>{' '}
                                {selectedRequest.requesterName}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('approval.comments') || 'Komentar'} (opsional)
                            </label>
                            <textarea
                                value={approvalComments}
                                onChange={(e) => setApprovalComments(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Tambahkan komentar..."
                            />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowApproveModal(false)
                                    setSelectedRequest(null)
                                    setApprovalComments('')
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                {t('common.cancel') || 'Batal'}
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                {isSubmitting ? (t('common.loading') || 'Memuat...') : (t('approval.approve') || 'Setuju')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Level Form Modal ─────────────────────────────────── */}
            {showLevelForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {editingLevel ? (t('approval.editLevel') || 'Edit Level') : (t('approval.addLevel') || 'Tambah Level')}
                        </h3>
                        {!editingLevel && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipe Entity
                                </label>
                                <select
                                    value={levelForm.entityType}
                                    onChange={(e) => setLevelForm({ ...levelForm, entityType: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="INVOICE">Invoice</option>
                                    <option value="PURCHASE_ORDER">Purchase Order</option>
                                    <option value="QUOTATION">Quotation</option>
                                </select>
                            </div>
                        )}
                        {!editingLevel && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Level
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={levelForm.level}
                                    onChange={(e) => setLevelForm({ ...levelForm, level: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nama Level
                            </label>
                            <input
                                type="text"
                                value={levelForm.name}
                                onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Contoh: Manager Approval"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Role Minimum
                            </label>
                            <select
                                value={levelForm.requiredRole}
                                onChange={(e) => setLevelForm({ ...levelForm, requiredRole: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {roleOptions.map((role) => (
                                    <option key={role.value} value={role.value}>
                                        {role.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowLevelForm(false)
                                    setEditingLevel(null)
                                    setLevelForm({ entityType: 'INVOICE', level: 1, name: '', requiredRole: 'ADMIN' })
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                {t('common.cancel') || 'Batal'}
                            </button>
                            <button
                                onClick={handleSaveLevel}
                                disabled={isSubmitting || !levelForm.name.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSubmitting ? (t('common.loading') || 'Memuat...') : (t('common.save') || 'Simpan')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Reject Modal ────────────────────────────────────── */}
            {showRejectModal && selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Tolak Permintaan
                        </h3>
                        <div className="text-sm text-gray-600 space-y-2">
                            <div>
                                <span className="font-medium">Tipe:</span>{' '}
                                {entityTypeConfig[selectedRequest.entityType]?.label}
                            </div>
                            <div>
                                <span className="font-medium">Level:</span>{' '}
                                {selectedRequest.levelName}
                            </div>
                            <div>
                                <span className="font-medium">Diminta oleh:</span>{' '}
                                {selectedRequest.requesterName}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Alasan penolakan <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={rejectComments}
                                onChange={(e) => setRejectComments(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                placeholder="Masukkan alasan penolakan..."
                            />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false)
                                    setSelectedRequest(null)
                                    setRejectComments('')
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                {t('common.cancel') || 'Batal'}
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={isSubmitting || !rejectComments.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {isSubmitting ? (t('common.loading') || 'Memuat...') : 'Tolak'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Delete Confirmation ──────────────────────────────── */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false)
                    setDeletingLevel(null)
                }}
                onConfirm={handleDeleteLevel}
                title={t('approval.deleteLevel') || 'Hapus Level?'}
                message={`Level "${deletingLevel?.name}" akan dinonaktifkan. Anda dapat mengaktifkannya kembali nanti.`}
            />
        </div>
    )
}
