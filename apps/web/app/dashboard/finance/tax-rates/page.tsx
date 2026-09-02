'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Plus, Percent, Check, X, Edit, Trash2, Search, Filter } from 'lucide-react'

type TaxRate = {
    id: string
    name: string
    code: string
    rate: number
    type: string
    isActive: boolean
    isDefault: boolean
    createdAt: string
}

const typeConfig: Record<string, { label: string; color: string }> = {
    VAT: { label: 'PPN', color: 'bg-blue-100 text-blue-700' },
    INCOME_TAX: { label: 'PPh', color: 'bg-green-100 text-green-700' },
    OTHER: { label: 'Lainnya', color: 'bg-gray-100 text-gray-700' },
}

export default function TaxRatesPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
    const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN'

    const [taxRates, setTaxRates] = useState<TaxRate[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [typeFilter, setTypeFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null)
    const [confirmMessage, setConfirmMessage] = useState('')

    // Form state
    const [showForm, setShowForm] = useState(false)
    const [editingTaxRate, setEditingTaxRate] = useState<TaxRate | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        rate: 0,
        type: 'VAT',
        isDefault: false,
    })

    useEffect(() => {
        fetchTaxRates()
    }, [])

    // Auto-hide toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchTaxRates = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/finance/tax-rates')
            const data = await res.json()
            if (data.success) {
                setTaxRates(data.data)
            } else {
                setError(data.error || 'Gagal memuat data')
            }
        } catch {
            setError('Gagal memuat data pajak')
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        try {
            const res = await fetch('/api/finance/tax-rates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: 'Data pajak berhasil dibuat', type: 'success' })
                setShowForm(false)
                resetForm()
                fetchTaxRates()
            } else {
                setToast({ message: data.error || 'Gagal membuat data pajak', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal membuat data pajak', type: 'error' })
        }
    }

    const handleUpdate = async () => {
        if (!editingTaxRate) return
        try {
            const res = await fetch(`/api/finance/tax-rates/${editingTaxRate.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: 'Data pajak berhasil diperbarui', type: 'success' })
                setShowForm(false)
                resetForm()
                fetchTaxRates()
            } else {
                setToast({ message: data.error || 'Gagal memperbarui data pajak', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal memperbarui data pajak', type: 'error' })
        }
    }

    const handleDelete = async (id: string) => {
        setConfirmMessage('Apakah Anda yakin ingin menghapus data pajak ini?')
        setConfirmAction(() => async () => {
            try {
                const res = await fetch(`/api/finance/tax-rates/${id}`, { method: 'DELETE' })
                const data = await res.json()
                if (data.success) {
                    setToast({ message: 'Data pajak berhasil dihapus', type: 'success' })
                    fetchTaxRates()
                } else {
                    setToast({ message: data.error || 'Gagal menghapus data pajak', type: 'error' })
                }
            } catch {
                setToast({ message: 'Gagal menghapus data pajak', type: 'error' })
            }
        })
        setShowConfirmDialog(true)
    }

    const handleToggleActive = async (taxRate: TaxRate) => {
        try {
            const res = await fetch(`/api/finance/tax-rates/${taxRate.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !taxRate.isActive }),
            })
            const data = await res.json()
            if (data.success) {
                setToast({
                    message: `Data pajak ${!taxRate.isActive ? 'diaktifkan' : 'dinonaktifkan'}`,
                    type: 'success'
                })
                fetchTaxRates()
            }
        } catch {
            setToast({ message: 'Gagal mengubah status', type: 'error' })
        }
    }

    const handleSetDefault = async (taxRate: TaxRate) => {
        try {
            const res = await fetch(`/api/finance/tax-rates/${taxRate.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isDefault: true }),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: 'Default pajak berhasil diubah', type: 'success' })
                fetchTaxRates()
            }
        } catch {
            setToast({ message: 'Gagal mengubah default', type: 'error' })
        }
    }

    const openEditForm = (taxRate: TaxRate) => {
        setEditingTaxRate(taxRate)
        setFormData({
            name: taxRate.name,
            code: taxRate.code,
            rate: taxRate.rate,
            type: taxRate.type,
            isDefault: taxRate.isDefault,
        })
        setShowForm(true)
    }

    const resetForm = () => {
        setEditingTaxRate(null)
        setFormData({ name: '', code: '', rate: 0, type: 'VAT', isDefault: false })
    }

    const filteredTaxRates = taxRates.filter((tr) => {
        if (typeFilter !== 'all' && tr.type !== typeFilter) return false
        if (search && !tr.name.toLowerCase().includes(search.toLowerCase()) && !tr.code.toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    const totalActive = taxRates.filter((tr) => tr.isActive).length
    const totalVAT = taxRates.filter((tr) => tr.type === 'VAT').length
    const totalIncomeTax = taxRates.filter((tr) => tr.type === 'INCOME_TAX').length
    const totalDefault = taxRates.filter((tr) => tr.isDefault).length

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 w-48 rounded bg-gray-200" />
                    <div className="h-10 w-64 rounded bg-gray-200" />
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 rounded bg-gray-100" />
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <Percent className="mb-4 h-12 w-12 text-red-400" />
                <h3 className="mb-2 text-lg font-semibold text-gray-900">Gagal Memuat Data</h3>
                <p className="mb-4 text-sm text-gray-500">{error}</p>
                <button
                    onClick={fetchTaxRates}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    Coba Lagi
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                    {toast.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('nav.taxRates') || 'Pajak'}</h1>
                    <p className="mt-1 text-sm text-gray-500">Kelola tarif pajak untuk invoice dan transaksi</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => { resetForm(); setShowForm(true) }}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        Tambah Pajak
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Total Pajak</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{taxRates.length}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Aktif</p>
                    <p className="mt-1 text-2xl font-bold text-green-600">{totalActive}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">PPN (VAT)</p>
                    <p className="mt-1 text-2xl font-bold text-blue-600">{totalVAT}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">PPh (Income Tax)</p>
                    <p className="mt-1 text-2xl font-bold text-green-600">{totalIncomeTax}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari pajak..."
                        className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                        <option value="all">Semua Tipe</option>
                        <option value="VAT">PPN (VAT)</option>
                        <option value="INCOME_TAX">PPh (Income Tax)</option>
                        <option value="OTHER">Lainnya</option>
                    </select>
                </div>
            </div>

            {/* Create/Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900">
                            {editingTaxRate ? 'Edit Data Pajak' : 'Tambah Data Pajak'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pajak *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="PPN 11%"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kode *</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="PPN"
                                    disabled={!!editingTaxRate}
                                />
                                <p className="mt-1 text-xs text-gray-500">Huruf besar, angka, underscore</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tarif (%) *</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={formData.rate}
                                    onChange={(e) => setFormData({ ...formData, rate: Number(e.target.value) })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="VAT">PPN (VAT)</option>
                                    <option value="INCOME_TAX">PPh (Income Tax)</option>
                                    <option value="OTHER">Lainnya</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isDefault"
                                    checked={formData.isDefault}
                                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="isDefault" className="text-sm text-gray-700">Jadikan Default</label>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => { setShowForm(false); resetForm() }}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={editingTaxRate ? handleUpdate : handleCreate}
                                disabled={!formData.name || !formData.code || formData.rate < 0}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {editingTaxRate ? 'Simpan' : 'Buat'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop Table */}
            <div className="hidden rounded-lg border border-gray-200 bg-white md:block">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-gray-200 bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 font-medium text-gray-600">Nama</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Kode</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Tarif</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Tipe</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Default</th>
                                {isAdmin && <th className="px-4 py-3 font-medium text-gray-600">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTaxRates.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
                                        Tidak ada data pajak ditemukan
                                    </td>
                                </tr>
                            ) : (
                                filteredTaxRates.map((tr) => (
                                    <tr key={tr.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">{tr.name}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{tr.code}</code>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            <span className="inline-flex items-center gap-1">
                                                <Percent className="h-3 w-3" />
                                                {tr.rate}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeConfig[tr.type]?.color || 'bg-gray-100 text-gray-700'}`}>
                                                {typeConfig[tr.type]?.label || tr.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => isAdmin && handleToggleActive(tr)}
                                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tr.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                    } ${isAdmin ? 'cursor-pointer hover:opacity-80' : ''}`}
                                            >
                                                {tr.isActive ? 'Aktif' : 'Nonaktif'}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            {tr.isDefault ? (
                                                <button
                                                    onClick={() => isAdmin && handleSetDefault(tr)}
                                                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 cursor-pointer hover:opacity-80"
                                                >
                                                    <Check className="h-3 w-3" />
                                                    Default
                                                </button>
                                            ) : (
                                                isAdmin && (
                                                    <button
                                                        onClick={() => handleSetDefault(tr)}
                                                        className="text-xs text-gray-400 hover:text-blue-600"
                                                    >
                                                        Set Default
                                                    </button>
                                                )
                                            )}
                                        </td>
                                        {isAdmin && (
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => openEditForm(tr)}
                                                        className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                                                        title="Edit"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(tr.id)}
                                                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="space-y-3 md:hidden">
                {filteredTaxRates.length === 0 ? (
                    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
                        Tidak ada data pajak ditemukan
                    </div>
                ) : (
                    filteredTaxRates.map((tr) => (
                        <div key={tr.id} className="rounded-lg border border-gray-200 bg-white p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-medium text-gray-900">{tr.name}</h3>
                                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{tr.code}</code>
                                        <span className="inline-flex items-center gap-1">
                                            <Percent className="h-3 w-3" />
                                            {tr.rate}%
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeConfig[tr.type]?.color || 'bg-gray-100 text-gray-700'}`}>
                                        {typeConfig[tr.type]?.label || tr.type}
                                    </span>
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tr.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        {tr.isActive ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                    {tr.isDefault && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                            <Check className="h-3 w-3" />
                                            Default
                                        </span>
                                    )}
                                </div>
                            </div>
                            {isAdmin && (
                                <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
                                    <button
                                        onClick={() => handleToggleActive(tr)}
                                        className="text-xs text-gray-500 hover:text-blue-600"
                                    >
                                        {tr.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                    </button>
                                    <span className="text-gray-300">|</span>
                                    <button
                                        onClick={() => openEditForm(tr)}
                                        className="text-xs text-gray-500 hover:text-blue-600"
                                    >
                                        Edit
                                    </button>
                                    <span className="text-gray-300">|</span>
                                    <button
                                        onClick={() => handleDelete(tr.id)}
                                        className="text-xs text-gray-500 hover:text-red-600"
                                    >
                                        Hapus
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={showConfirmDialog}
                onClose={() => { setShowConfirmDialog(false); setConfirmAction(null) }}
                onConfirm={async () => {
                    if (confirmAction) await confirmAction()
                    setShowConfirmDialog(false)
                    setConfirmAction(null)
                }}
                title="Konfirmasi Hapus"
                message={confirmMessage}
            />
        </div>
    )
}
