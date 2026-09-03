'use client'

import { useState, useEffect } from 'react'
import { formatDateTime } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import {
    Warehouse,
    Plus,
    Search,
    MapPin,
    Phone,
    Mail,
    User,
    Package,
    ClipboardList,
    Edit,
    Trash2,
    X,
    Check,
    AlertTriangle,
    Building2,
} from 'lucide-react'

type WarehouseItem = {
    id: string
    name: string
    code: string
    address: string | null
    city: string | null
    phone: string | null
    email: string | null
    manager: string | null
    isActive: boolean
    isDefault: boolean
    productCount: number
    opnameCount: number
    createdAt: string
}

export default function WarehousesPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
    const [warehouses, setWarehouses] = useState<WarehouseItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Form state
    const [formName, setFormName] = useState('')
    const [formCode, setFormCode] = useState('')
    const [formAddress, setFormAddress] = useState('')
    const [formCity, setFormCity] = useState('')
    const [formPhone, setFormPhone] = useState('')
    const [formEmail, setFormEmail] = useState('')
    const [formManager, setFormManager] = useState('')
    const [formIsDefault, setFormIsDefault] = useState(false)

    useEffect(() => {
        fetchWarehouses()
    }, [])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchWarehouses = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/inventory/warehouses?limit=100')
            const data = await response.json()
            if (data.success) {
                setWarehouses(data.data)
            } else {
                setError(t('inventory.warehouses.error') || 'Gagal memuat data gudang')
            }
        } catch {
            setError(t('inventory.warehouses.errorHint') || 'Terjadi kesalahan')
        } finally {
            setLoading(false)
        }
    }

    const filtered = warehouses.filter((w) => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            w.name.toLowerCase().includes(q) ||
            w.code.toLowerCase().includes(q) ||
            (w.city && w.city.toLowerCase().includes(q))
        )
    })

    const resetForm = () => {
        setFormName('')
        setFormCode('')
        setFormAddress('')
        setFormCity('')
        setFormPhone('')
        setFormEmail('')
        setFormManager('')
        setFormIsDefault(false)
        setEditingId(null)
    }

    const openCreateModal = () => {
        resetForm()
        setShowModal(true)
    }

    const openEditModal = (warehouse: WarehouseItem) => {
        setFormName(warehouse.name)
        setFormCode(warehouse.code)
        setFormAddress(warehouse.address || '')
        setFormCity(warehouse.city || '')
        setFormPhone(warehouse.phone || '')
        setFormEmail(warehouse.email || '')
        setFormManager(warehouse.manager || '')
        setFormIsDefault(warehouse.isDefault)
        setEditingId(warehouse.id)
        setShowModal(true)
    }

    const handleSubmit = async () => {
        if (!formName.trim() || !formCode.trim()) {
            setToast({ message: 'Nama dan kode gudang wajib diisi', type: 'error' })
            return
        }
        setSubmitting(true)
        try {
            const payload = {
                name: formName.trim(),
                code: formCode.trim().toUpperCase(),
                address: formAddress.trim() || null,
                city: formCity.trim() || null,
                phone: formPhone.trim() || null,
                email: formEmail.trim() || null,
                manager: formManager.trim() || null,
                isDefault: formIsDefault,
            }

            const url = editingId
                ? `/api/inventory/warehouses/${editingId}`
                : '/api/inventory/warehouses'
            const method = editingId ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const data = await res.json()
            if (data.success) {
                setToast({
                    message: editingId ? 'Gudang berhasil diupdate' : 'Gudang berhasil dibuat',
                    type: 'success',
                })
                setShowModal(false)
                resetForm()
                fetchWarehouses()
            } else {
                setToast({ message: data.error || 'Gagal menyimpan gudang', type: 'error' })
            }
        } catch {
            setToast({ message: 'Terjadi kesalahan', type: 'error' })
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Hapus gudang "${name}"?`)) return
        try {
            const res = await fetch(`/api/inventory/warehouses/${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                setToast({ message: 'Gudang berhasil dihapus', type: 'success' })
                fetchWarehouses()
            } else {
                setToast({ message: data.error || 'Gagal menghapus gudang', type: 'error' })
            }
        } catch {
            setToast({ message: 'Terjadi kesalahan', type: 'error' })
        }
    }

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-500" />
                    <p className="text-red-600">{error}</p>
                    <button onClick={fetchWarehouses} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                        {t('common.retry') || 'Coba Lagi'}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('inventory.warehouses.title') || 'Gudang'}</h1>
                    <p className="text-gray-500">{t('inventory.warehouses.subtitle') || 'Kelola gudang dan lokasi penyimpanan'}</p>
                </div>
                {canMutate && (
                    <button onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                        <Plus className="h-4 w-4" />
                        {t('inventory.warehouses.create') || 'Tambah Gudang'}
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder={t('inventory.warehouses.search') || 'Cari gudang...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Total Gudang</p>
                    <p className="text-2xl font-bold text-gray-900">{warehouses.length}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Gudang Aktif</p>
                    <p className="text-2xl font-bold text-green-600">{warehouses.filter(w => w.isActive).length}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Total Produk</p>
                    <p className="text-2xl font-bold text-blue-600">{warehouses.reduce((sum, w) => sum + w.productCount, 0)}</p>
                </div>
            </div>

            {/* Warehouse Cards - Mobile */}
            <div className="md:hidden space-y-4">
                {filtered.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                        <Warehouse className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-2 text-gray-500">Belum ada gudang</p>
                    </div>
                ) : (
                    filtered.map((warehouse) => (
                        <div key={warehouse.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-gray-900">{warehouse.name}</h3>
                                        {warehouse.isDefault && (
                                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                                Default
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500">Kode: {warehouse.code}</p>
                                </div>
                                {canMutate && (
                                    <div className="flex gap-1">
                                        <button onClick={() => openEditModal(warehouse)} className="p-1 text-gray-400 hover:text-blue-600">
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        {!warehouse.isDefault && (
                                            <button onClick={() => handleDelete(warehouse.id, warehouse.name)} className="p-1 text-gray-400 hover:text-red-600">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                                {warehouse.address && (
                                    <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {warehouse.address}{warehouse.city ? `, ${warehouse.city}` : ''}</div>
                                )}
                                {warehouse.phone && (
                                    <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {warehouse.phone}</div>
                                )}
                                {warehouse.manager && (
                                    <div className="flex items-center gap-1"><User className="h-3 w-3" /> {warehouse.manager}</div>
                                )}
                            </div>
                            <div className="flex gap-4 text-xs text-gray-500">
                                <span><Package className="inline h-3 w-3" /> {warehouse.productCount} produk</span>
                                <span><ClipboardList className="inline h-3 w-3" /> {warehouse.opnameCount} opname</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Warehouse Table - Desktop */}
            <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gudang</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lokasi</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kontak</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            {canMutate && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={canMutate ? 6 : 5} className="px-6 py-12 text-center">
                                    <Building2 className="mx-auto h-12 w-12 text-gray-300" />
                                    <p className="mt-2 text-gray-500">Belum ada gudang</p>
                                </td>
                            </tr>
                        ) : (
                            filtered.map((warehouse) => (
                                <tr key={warehouse.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-gray-900">{warehouse.name}</p>
                                                {warehouse.isDefault && (
                                                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">Default</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500">{warehouse.code}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {warehouse.address || '-'}{warehouse.city ? `, ${warehouse.city}` : ''}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <div>{warehouse.phone || '-'}</div>
                                        <div>{warehouse.email || '-'}</div>
                                        <div className="text-xs text-gray-400">{warehouse.manager || ''}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {warehouse.productCount} produk
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${warehouse.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {warehouse.isActive ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </td>
                                    {canMutate && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => openEditModal(warehouse)} className="p-1 text-gray-400 hover:text-blue-600 rounded">
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                {!warehouse.isDefault && (
                                                    <button onClick={() => handleDelete(warehouse.id, warehouse.name)} className="p-1 text-gray-400 hover:text-red-600 rounded">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {editingId ? 'Edit Gudang' : 'Tambah Gudang Baru'}
                            </h2>
                            <button onClick={() => { setShowModal(false); resetForm() }} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Gudang *</label>
                                    <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="Gudang Utama" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kode *</label>
                                    <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value.toUpperCase())} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="GU-001" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                                <input type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="Jl. Contoh No. 123" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kota</label>
                                    <input type="text" value={formCity} onChange={(e) => setFormCity(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="Jakarta" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
                                    <input type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="021-1234567" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="gudang@contoh.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                                    <input type="text" value={formManager} onChange={(e) => setFormManager(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="Budi Santoso" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="isDefault" checked={formIsDefault} onChange={(e) => setFormIsDefault(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                <label htmlFor="isDefault" className="text-sm text-gray-700">Jadikan sebagai gudang default</label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                            <button onClick={() => { setShowModal(false); resetForm() }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                                Batal
                            </button>
                            <button onClick={handleSubmit} disabled={submitting} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                {submitting ? 'Menyimpan...' : (
                                    <>
                                        <Check className="h-4 w-4" />
                                        {editingId ? 'Update' : 'Simpan'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
