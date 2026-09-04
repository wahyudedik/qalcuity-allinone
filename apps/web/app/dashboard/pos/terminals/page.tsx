'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import {
    Search, Monitor, Plus, Loader2, Check, X, AlertCircle, Eye, Pencil, Trash2,
    ChevronLeft, ChevronRight,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

type Terminal = {
    id: string
    name: string
    code: string
    location: string | null
    status: string
    activeSession: { id: string; cashierName: string; openedAt: string } | null
    createdAt: string
}

type TerminalDetail = Terminal & {
    sessions: {
        id: string
        cashierName: string
        status: string
        openingCash: number
        closingCash: number | null
        openedAt: string
        closedAt: string | null
    }[]
}

const STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'Aktif',
    INACTIVE: 'Nonaktif',
    MAINTENANCE: 'Perawatan',
}

export default function POSTerminalsPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canManage = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN'

    const [terminals, setTerminals] = useState<Terminal[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Detail modal
    const [showDetail, setShowDetail] = useState(false)
    const [detailTerminal, setDetailTerminal] = useState<TerminalDetail | null>(null)

    // Form modal
    const [showFormModal, setShowFormModal] = useState(false)
    const [editingTerminal, setEditingTerminal] = useState<Terminal | null>(null)
    const [formData, setFormData] = useState({ name: '', code: '', location: '', status: 'ACTIVE' })
    const [formLoading, setFormLoading] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    // Delete modal
    const [showDeleteModal, setShowDeleteModal] = useState<Terminal | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchTerminals = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (filterStatus !== 'all') params.set('status', filterStatus)
            if (searchQuery) params.set('search', searchQuery)
            const response = await fetch(`/api/pos/terminals?${params.toString()}`)
            const data = await response.json()
            if (data.success) {
                setTerminals(data.data)
                setTotalPages(1)
            } else {
                setError(data.error || 'Gagal memuat data terminal')
            }
        } catch {
            setError('Gagal memuat data terminal. Periksa koneksi jaringan Anda.')
        } finally {
            setLoading(false)
        }
    }, [filterStatus, searchQuery])

    useEffect(() => {
        fetchTerminals()
    }, [fetchTerminals])

    const openCreateModal = () => {
        setEditingTerminal(null)
        setFormData({ name: '', code: '', location: '', status: 'ACTIVE' })
        setFormError(null)
        setShowFormModal(true)
    }

    const openEditModal = (terminal: Terminal) => {
        setEditingTerminal(terminal)
        setFormData({
            name: terminal.name,
            code: terminal.code,
            location: terminal.location || '',
            status: terminal.status,
        })
        setFormError(null)
        setShowFormModal(true)
    }

    const handleFormSubmit = async () => {
        setFormLoading(true)
        setFormError(null)
        try {
            const body: Record<string, string> = {
                name: formData.name,
                code: formData.code,
            }
            if (formData.location) body.location = formData.location

            const url = editingTerminal ? `/api/pos/terminals/${editingTerminal.id}` : '/api/pos/terminals'
            const method = editingTerminal ? 'PUT' : 'POST'

            if (editingTerminal) {
                body.status = formData.status
            }

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const data = await response.json()
            if (data.success) {
                setToast({
                    message: editingTerminal ? 'Terminal berhasil diperbarui' : 'Terminal berhasil dibuat',
                    type: 'success',
                })
                setShowFormModal(false)
                fetchTerminals()
            } else {
                setFormError(data.error || data.details?.[0]?.[0] || 'Gagal menyimpan terminal')
            }
        } catch {
            setFormError('Gagal menyimpan terminal')
        } finally {
            setFormLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!showDeleteModal) return
        setDeleteLoading(true)
        try {
            const response = await fetch(`/api/pos/terminals/${showDeleteModal.id}`, { method: 'DELETE' })
            const data = await response.json()
            if (data.success) {
                setToast({ message: 'Terminal berhasil dihapus', type: 'success' })
                setShowDeleteModal(null)
                fetchTerminals()
            } else {
                setToast({ message: data.error || 'Gagal menghapus terminal', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menghapus terminal', type: 'error' })
        } finally {
            setDeleteLoading(false)
        }
    }

    const fetchDetail = async (id: string) => {
        try {
            const response = await fetch(`/api/pos/terminals/${id}`)
            const data = await response.json()
            if (data.success) {
                setDetailTerminal(data.data)
                setShowDetail(true)
            }
        } catch {
            setToast({ message: 'Gagal memuat detail terminal', type: 'error' })
        }
    }

    const filtered = terminals

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Monitor className="h-6 w-6" />
                        {t('pos.terminals.title') || 'Terminal Management'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">{t('pos.terminals.subtitle') || 'Kelola terminal point of sale'}</p>
                </div>
                {canManage && (
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        {t('pos.terminals.addTerminal') || 'Tambah Terminal'}
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('pos.terminals.searchPlaceholder') || 'Cari kode, nama, atau lokasi...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                    <option value="all">{t('pos.terminals.allStatus') || 'Semua Status'}</option>
                    <option value="ACTIVE">{t('pos.terminals.active') || 'Aktif'}</option>
                    <option value="INACTIVE">{t('pos.terminals.inactive') || 'Nonaktif'}</option>
                    <option value="MAINTENANCE">{t('pos.terminals.maintenance') || 'Perawatan'}</option>
                </select>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
                    <p className="text-sm text-gray-500">{error}</p>
                    <button onClick={fetchTerminals} className="mt-3 text-sm text-blue-600 hover:underline">Coba Lagi</button>
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={Monitor}
                    title={t('pos.terminals.empty') || 'Belum ada terminal'}
                    description={t('pos.terminals.emptyDescription') || 'Tambahkan terminal untuk memulai transaksi POS.'}
                    actionLabel={canManage ? (t('pos.terminals.addTerminal') || 'Tambah Terminal') : undefined}
                    onAction={canManage ? openCreateModal : undefined}
                />
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pos.terminals.code') || 'Kode'}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pos.terminals.name') || 'Nama'}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pos.terminals.location') || 'Lokasi'}</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('pos.terminals.status') || 'Status'}</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sesi</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('pos.terminals.actions') || 'Aksi'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                                {filtered.map((terminal) => (
                                    <tr key={terminal.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900 dark:text-white">{terminal.code}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{terminal.name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{terminal.location || '-'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${terminal.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    terminal.status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                        'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                                }`}>
                                                {STATUS_LABELS[terminal.status] || terminal.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {terminal.activeSession ? (
                                                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                                    {terminal.activeSession.cashierName}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => fetchDetail(terminal.id)}
                                                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    Detail
                                                </button>
                                                {canManage && (
                                                    <>
                                                        <button
                                                            onClick={() => openEditModal(terminal)}
                                                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/20"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => setShowDeleteModal(terminal)}
                                                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            Hapus
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {filtered.map((terminal) => (
                            <div key={terminal.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">{terminal.code}</p>
                                        <p className="text-xs text-gray-400">{terminal.location || 'Tidak ada lokasi'}</p>
                                    </div>
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${terminal.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                            terminal.status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-700'
                                        }`}>
                                        {STATUS_LABELS[terminal.status] || terminal.status}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-gray-600">{terminal.name}</p>
                                {terminal.activeSession && (
                                    <p className="mt-1 text-xs text-green-600">Sesi aktif: {terminal.activeSession.cashierName}</p>
                                )}
                                <div className="mt-3 flex gap-1">
                                    <button
                                        onClick={() => fetchDetail(terminal.id)}
                                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                                    >
                                        Detail
                                    </button>
                                    {canManage && (
                                        <>
                                            <button
                                                onClick={() => openEditModal(terminal)}
                                                className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteModal(terminal)}
                                                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                            >
                                                Hapus
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Detail Modal */}
            {showDetail && detailTerminal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDetail(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detail Terminal</h3>
                            <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Kode</span>
                                <span className="font-mono font-medium">{detailTerminal.code}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Nama</span>
                                <span className="font-medium">{detailTerminal.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Lokasi</span>
                                <span>{detailTerminal.location || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Status</span>
                                <span className={`font-medium ${detailTerminal.status === 'ACTIVE' ? 'text-green-600' :
                                        detailTerminal.status === 'MAINTENANCE' ? 'text-yellow-600' : 'text-gray-600'
                                    }`}>
                                    {STATUS_LABELS[detailTerminal.status] || detailTerminal.status}
                                </span>
                            </div>
                        </div>

                        {/* Sessions History */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Riwayat Sesi</h4>
                            {detailTerminal.sessions.length > 0 ? (
                                <div className="space-y-1.5">
                                    {detailTerminal.sessions.map((s) => (
                                        <div key={s.id} className="flex items-center justify-between text-sm rounded-lg bg-gray-50 dark:bg-gray-700/50 px-3 py-2">
                                            <div>
                                                <span className="font-medium">{s.cashierName}</span>
                                                <span className={`ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${s.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {s.status === 'OPEN' ? 'Buka' : 'Tutup'}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-400">{new Date(s.openedAt).toLocaleDateString('id-ID')}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400">Belum ada riwayat sesi</p>
                            )}
                        </div>

                        <button
                            onClick={() => setShowDetail(false)}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}

            {/* Create/Edit Form Modal */}
            {showFormModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !formLoading && setShowFormModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editingTerminal ? 'Edit Terminal' : 'Tambah Terminal'}
                            </h3>
                            {!formLoading && (
                                <button onClick={() => setShowFormModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>

                        {formError && (
                            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                                {formError}
                            </div>
                        )}

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Terminal *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Contoh: Kasir Utama"
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kode Terminal *</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    placeholder="Contoh: KSR-001"
                                    disabled={!!editingTerminal}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lokasi</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="Contoh: Lantai 1, Depan Kasir"
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            {editingTerminal && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="ACTIVE">Aktif</option>
                                        <option value="INACTIVE">Nonaktif</option>
                                        <option value="MAINTENANCE">Perawatan</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowFormModal(false)}
                                disabled={formLoading}
                                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleFormSubmit}
                                disabled={formLoading || !formData.name || !formData.code}
                                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {formLoading ? 'Menyimpan...' : editingTerminal ? 'Simpan Perubahan' : 'Buat Terminal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !deleteLoading && setShowDeleteModal(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Hapus Terminal</h3>
                            {!deleteLoading && (
                                <button onClick={() => setShowDeleteModal(null)} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-gray-500">
                            Apakah Anda yakin ingin menghapus terminal <strong>{showDeleteModal.name}</strong> ({showDeleteModal.code})? Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(null)}
                                disabled={deleteLoading}
                                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleteLoading ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
