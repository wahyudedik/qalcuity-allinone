'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import {
    ArrowLeft,
    ClipboardList,
    Warehouse,
    Package,
    Check,
    X,
    Loader2,
    AlertTriangle,
    FileText,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// ============================================
// TYPES
// ============================================

interface StockOpnameItemDetail {
    id: string
    systemQuantity: number
    physicalQuantity: number
    difference: number
    notes: string | null
    product: {
        id: string
        name: string
        sku: string
        unit: string
        stock: number
    }
}

interface StockOpnameDetail {
    id: string
    opnameNumber: string
    status: string
    opnameDate: string
    notes: string | null
    totalDifference: number
    warehouse: {
        id: string
        name: string
        code: string
    } | null
    items: StockOpnameItemDetail[]
    createdAt: string
}

// ============================================
// CONFIG
// ============================================

const statusStyles: Record<string, string> = {
    DRAFT: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
}

const statusLabels: Record<string, string> = {
    DRAFT: 'Draft',
    IN_PROGRESS: 'Dalam Proses',
    COMPLETED: 'Selesai',
    CANCELLED: 'Dibatalkan',
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function StockOpnameDetailPage({ params }: { params: { id: string } }) {
    const { t } = useTranslation()
    const router = useRouter()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'

    const [opname, setOpname] = useState<StockOpnameDetail | null>(null)
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
        fetchOpname()
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

    const fetchOpname = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await fetch(`/api/inventory/stock-opname/${params.id}`)
            const data = await response.json()
            if (data.success) {
                setOpname(data.data)
            } else {
                setError(data.error || 'Gagal memuat data stock opname')
            }
        } catch {
            setError('Gagal memuat data stock opname')
        } finally {
            setLoading(false)
        }
    }

    // ============================================
    // HANDLERS
    // ============================================

    const handleStatusChange = (newStatus: string) => {
        const labels: Record<string, string> = {
            IN_PROGRESS: 'memulai',
            COMPLETED: 'menyelesaikan',
            CANCELLED: 'membatalkan',
        }
        setConfirmTitle(`Konfirmasi ${labels[newStatus] || newStatus}`)
        setConfirmMessage(`Apakah Anda yakin ingin ${labels[newStatus] || newStatus} stock opname ini?`)
        setConfirmAction(() => async () => {
            try {
                setProcessing(true)
                const response = await fetch(`/api/inventory/stock-opname/${params.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus }),
                })
                const result = await response.json()
                if (result.success) {
                    setOpname((prev) => prev ? { ...prev, status: newStatus } : prev)
                    setToast({ message: `Stock opname berhasil ${labels[newStatus]}`, type: 'success' })
                } else {
                    setToast({ message: result.error || 'Gagal mengubah status', type: 'error' })
                }
            } catch {
                setToast({ message: 'Gagal mengubah status', type: 'error' })
            } finally {
                setProcessing(false)
            }
        })
        setShowConfirmDialog(true)
    }

    // ============================================
    // COMPUTED VALUES
    // ============================================

    const itemsWithVariance = opname?.items.filter((item) => item.difference !== 0) || []
    const totalItems = opname?.items.length || 0
    const varianceCount = itemsWithVariance.length

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

    if (error || !opname) {
        return (
            <div className="p-6">
                <div className="flex flex-col items-center justify-center py-12">
                    <AlertTriangle className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">{error || 'Data stock opname tidak ditemukan'}</p>
                    <Link
                        href="/dashboard/inventory/stock-opname"
                        className="mt-4 text-blue-600 hover:underline"
                    >
                        ← Kembali ke daftar stock opname
                    </Link>
                </div>
            </div>
        )
    }

    const isDraft = opname.status === 'DRAFT'
    const isInProgress = opname.status === 'IN_PROGRESS'

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
                confirmText={processing ? 'Memproses...' : 'Konfirmasi'}
                variant="danger"
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/inventory/stock-opname"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                                {opname.opnameNumber}
                            </h1>
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[opname.status] || 'bg-gray-100 text-gray-800'}`}>
                                {statusLabels[opname.status] || opname.status}
                            </span>
                        </div>
                        <p className="text-gray-500 mt-1">{opname.warehouse?.name || 'Semua Gudang'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isDraft && canMutate && (
                        <>
                            <button
                                onClick={() => handleStatusChange('IN_PROGRESS')}
                                disabled={processing}
                                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                <ClipboardList className="h-4 w-4" />
                                Mulai Opname
                            </button>
                            <button
                                onClick={() => handleStatusChange('CANCELLED')}
                                disabled={processing}
                                className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                                <X className="h-4 w-4" />
                                Batalkan
                            </button>
                        </>
                    )}
                    {isInProgress && canMutate && (
                        <>
                            <button
                                onClick={() => handleStatusChange('COMPLETED')}
                                disabled={processing}
                                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                Selesaikan
                            </button>
                            <button
                                onClick={() => handleStatusChange('CANCELLED')}
                                disabled={processing}
                                className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                                <X className="h-4 w-4" />
                                Batalkan
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Opname Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-gray-400" />
                            Detail Opname
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Nomor Opname</p>
                                <p className="font-medium text-gray-900 mt-1 font-mono">{opname.opnameNumber}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Tanggal Opname</p>
                                <p className="font-medium text-gray-900 mt-1">{formatDateTime(opname.opnameDate)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Gudang</p>
                                <p className="font-medium text-gray-900 mt-1">{opname.warehouse?.name || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Selisih</p>
                                <p className={`font-medium mt-1 ${opname.totalDifference !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {opname.totalDifference} unit
                                </p>
                            </div>
                            {opname.notes && (
                                <div className="sm:col-span-2">
                                    <p className="text-sm text-gray-500">Catatan</p>
                                    <p className="font-medium text-gray-900 mt-1">{opname.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="rounded-xl border border-gray-200 bg-white">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Package className="h-5 w-5 text-gray-400" />
                                Items ({totalItems})
                            </h2>
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50">
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Produk
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Qty Sistem
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Qty Fisik
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Selisih
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Catatan
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {opname.items.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-gray-900">{item.product.name}</p>
                                                    <p className="text-xs text-gray-500">{item.product.sku} · {item.product.unit}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-sm text-gray-700">{item.systemQuantity}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-sm font-medium text-gray-900">{item.physicalQuantity}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${item.difference === 0
                                                        ? 'bg-green-100 text-green-700'
                                                        : item.difference > 0
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {item.difference > 0 ? '+' : ''}{item.difference}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {item.notes || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {opname.items.map((item) => (
                                <div key={item.id} className="p-4 space-y-2">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">{item.product.name}</p>
                                            <p className="text-xs text-gray-500">{item.product.sku} · {item.product.unit}</p>
                                        </div>
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${item.difference === 0
                                                ? 'bg-green-100 text-green-700'
                                                : item.difference > 0
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                            {item.difference > 0 ? '+' : ''}{item.difference}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-gray-500">Sistem:</span>
                                            <span className="ml-1 font-medium text-gray-900">{item.systemQuantity}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Fisik:</span>
                                            <span className="ml-1 font-medium text-gray-900">{item.physicalQuantity}</span>
                                        </div>
                                    </div>
                                    {item.notes && (
                                        <p className="text-xs text-gray-500">{item.notes}</p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {opname.items.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                <p>Belum ada item</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Variance Summary */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-gray-400" />
                            Ringkasan Selisih
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Total Items</span>
                                <span className="text-sm font-medium text-gray-900">{totalItems}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Items dengan Selisih</span>
                                <span className={`text-sm font-medium ${varianceCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {varianceCount}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Items Sesuai</span>
                                <span className="text-sm font-medium text-green-600">
                                    {totalItems - varianceCount}
                                </span>
                            </div>
                            <div className="border-t border-gray-100 pt-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">Total Selisih</span>
                                    <span className={`text-sm font-bold ${opname.totalDifference !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {opname.totalDifference} unit
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Warehouse Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Warehouse className="h-5 w-5 text-gray-400" />
                            Informasi Gudang
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Nama</span>
                                <span className="text-sm font-medium text-gray-900">{opname.warehouse?.name || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Kode</span>
                                <span className="font-mono text-sm text-gray-900">{opname.warehouse?.code || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Navigasi</h2>
                        <div className="space-y-3">
                            <Link
                                href="/dashboard/inventory/stock-opname"
                                className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 w-full"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Kembali ke Daftar
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
