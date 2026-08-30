'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { Search, Plus, Star, AlertTriangle, Building2, Trash2, X, Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'

type Supplier = {
    id: string
    name: string
    contactPerson: string
    email: string
    phone: string
    address: string
    city: string
    rating: number
    notes: string
    totalOrders: number
    isActive: boolean
    createdAt: string
}

interface SupplierFormData {
    name: string
    contactPerson: string
    email: string
    phone: string
    address: string
    city: string
    notes: string
}

interface FormErrors {
    name?: string
    contactPerson?: string
    email?: string
    phone?: string
    address?: string
}

function validateSupplierForm(data: SupplierFormData): FormErrors {
    const errors: FormErrors = {}

    if (!data.name || data.name.trim().length === 0) {
        errors.name = 'Nama supplier wajib diisi'
    }

    if (!data.contactPerson || data.contactPerson.trim().length === 0) {
        errors.contactPerson = 'Nama kontak wajib diisi'
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.email = 'Format email tidak valid'
    }

    if (data.phone && !/^(\+62|62|0)8[1-9][0-9]{6,11}$/.test(data.phone.replace(/[\s-]/g, ''))) {
        errors.phone = 'Format telepon Indonesia tidak valid (contoh: 081234567890)'
    }

    if (!data.address || data.address.trim().length === 0) {
        errors.address = 'Alamat wajib diisi'
    }

    return errors
}

export default function SuppliersPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Form modal state
    const [showForm, setShowForm] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
    const [formData, setFormData] = useState<SupplierFormData>({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        notes: '',
    })
    const [formErrors, setFormErrors] = useState<FormErrors>({})
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchSuppliers = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await fetch('/api/inventory/suppliers')
            const data = await response.json()
            if (data.success) {
                setSuppliers(data.data)
            } else {
                setError(data.error || 'Gagal memuat data supplier')
            }
        } catch {
            setError('Gagal memuat data supplier. Periksa koneksi jaringan Anda.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSuppliers()
    }, [fetchSuppliers])

    const filtered = suppliers.filter((s) => {
        const matchStatus = filterStatus === 'all' ||
            (filterStatus === 'active' && s.isActive) ||
            (filterStatus === 'inactive' && !s.isActive)
        const matchSearch = searchQuery === '' ||
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.email.toLowerCase().includes(searchQuery.toLowerCase())
        return matchStatus && matchSearch
    })

    const stats = {
        total: suppliers.length,
        active: suppliers.filter(s => s.isActive).length,
        inactive: suppliers.filter(s => !s.isActive).length,
        totalSpent: suppliers.reduce((sum, s) => sum + (s.totalOrders * 1000000), 0), // Estimated
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus supplier ini?')) return
        try {
            const response = await fetch(`/api/inventory/suppliers?id=${id}`, { method: 'DELETE' })
            const result = await response.json()
            if (result.success) {
                fetchSuppliers()
                setToast({ message: result.message || 'Supplier berhasil dihapus', type: 'success' })
            } else {
                setToast({ message: `Gagal menghapus: ${result.error}`, type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menghapus supplier', type: 'error' })
        }
    }

    const openCreateForm = () => {
        setEditingSupplier(null)
        setFormData({
            name: '',
            contactPerson: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            notes: '',
        })
        setFormErrors({})
        setShowForm(true)
    }

    const openEditForm = (supplier: Supplier) => {
        setEditingSupplier(supplier)
        setFormData({
            name: supplier.name,
            contactPerson: supplier.contactPerson,
            email: supplier.email,
            phone: supplier.phone,
            address: supplier.address,
            city: supplier.city || '',
            notes: supplier.notes || '',
        })
        setFormErrors({})
        setShowForm(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const errors = validateSupplierForm(formData)
        setFormErrors(errors)
        if (Object.keys(errors).length > 0) return

        setSubmitting(true)
        try {
            const url = editingSupplier
                ? `/api/inventory/suppliers/${editingSupplier.id}`
                : '/api/inventory/suppliers'
            const method = editingSupplier ? 'PUT' : 'POST'

            const payload = editingSupplier
                ? { id: editingSupplier.id, ...formData }
                : formData

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const result = await res.json()

            if (result.success) {
                setShowForm(false)
                fetchSuppliers()
                setToast({
                    message: editingSupplier ? 'Supplier berhasil diupdate' : 'Supplier berhasil ditambahkan',
                    type: 'success',
                })
            } else {
                setToast({ message: result.error || 'Gagal menyimpan data', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menyimpan data supplier', type: 'error' })
        } finally {
            setSubmitting(false)
        }
    }

    const handleFormChange = (field: keyof SupplierFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
        if (formErrors[field as keyof FormErrors]) {
            setFormErrors((prev) => ({ ...prev, [field]: undefined }))
        }
    }

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`h-4 w-4 ${i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
            />
        ))
    }

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
                        ))}
                    </div>
                    <div className="h-96 bg-gray-200 rounded-xl"></div>
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
                    <button
                        onClick={fetchSuppliers}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        {t('inventory.suppliers.retry') || 'Coba Lagi'}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('inventory.suppliers.title') || 'Supplier'}</h1>
                    <p className="text-gray-500">{stats.total} {t('inventory.suppliers.subtitle') || 'supplier terdaftar'}</p>
                </div>
                {canMutate && (
                    <button
                    onClick={openCreateForm}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                    <Plus className="h-4 w-4" />
                    {t('inventory.suppliers.addSupplier') || 'Tambah Supplier'}
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('inventory.suppliers.totalSuppliers') || 'Total Supplier'}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('inventory.suppliers.active') || 'Aktif'}</p>
                    <p className="mt-1 text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('inventory.suppliers.inactive') || 'Nonaktif'}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-500">{stats.inactive}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('inventory.suppliers.totalSpend') || 'Total Pengeluaran'}</p>
                    <p className="mt-1 text-xl font-bold text-blue-600">{formatCurrency(stats.totalSpent)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('inventory.suppliers.searchPlaceholder') || 'Cari nama atau kontak...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'active', 'inactive'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {status === 'all' ? (t('inventory.suppliers.allStatuses') || 'Semua') : status === 'active' ? (t('inventory.suppliers.active') || 'Aktif') : (t('inventory.suppliers.inactive') || 'Nonaktif')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Suppliers Table */}
            {/* Kartu Supplier untuk tampilan mobile */}
            <div className="md:hidden space-y-3">
                {filtered.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                        <Building2 className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                        {t('inventory.suppliers.noSuppliers') || 'Tidak ada supplier'}
                    </div>
                ) : (
                    filtered.map((supplier) => (
                        <div key={supplier.id} className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <Link href={`/dashboard/inventory/suppliers/${supplier.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                                        {supplier.name}
                                    </Link>
                                    <p className="text-sm text-gray-500">{supplier.contactPerson}</p>
                                </div>
                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${supplier.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {supplier.isActive ? (t('inventory.suppliers.active') || 'Aktif') : (t('inventory.suppliers.inactive') || 'Nonaktif')}
                                </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500">{t('inventory.suppliers.rating') || 'Rating'}:</span>
                                    <span className="ml-1 flex items-center gap-1">
                                        {renderStars(supplier.rating)}
                                        <span className="text-xs text-gray-500">({supplier.rating})</span>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('inventory.suppliers.totalOrder') || 'Total Order'}:</span>
                                    <span className="ml-1 font-medium">{supplier.totalOrders}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Email:</span>
                                    <span className="ml-1 text-xs">{supplier.email}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Telp:</span>
                                    <span className="ml-1 text-xs">{supplier.phone}</span>
                                </div>
                            </div>
                            <div className="mt-3 flex justify-end gap-3">
                                <button
                                    onClick={() => openEditForm(supplier)}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(supplier.id)}
                                    className="text-sm text-red-500 hover:text-red-700"
                                >
                                    {t('common.delete') || 'Hapus'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Tabel Supplier untuk tampilan desktop */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 font-medium text-gray-600">{t('inventory.suppliers.supplier') || 'Supplier'}</th>
                                <th className="px-4 py-3 font-medium text-gray-600">{t('inventory.suppliers.contact') || 'Kontak'}</th>
                                <th className="px-4 py-3 font-medium text-gray-600">{t('inventory.suppliers.rating') || 'Rating'}</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">{t('inventory.suppliers.totalOrder') || 'Total Order'}</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-600">{t('inventory.suppliers.status') || 'Status'}</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-600"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                                        <Building2 className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                                        {t('inventory.suppliers.noSuppliers') || 'Tidak ada supplier'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((supplier) => (
                                    <tr key={supplier.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div>
                                                <Link href={`/dashboard/inventory/suppliers/${supplier.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                                                    {supplier.name}
                                                </Link>
                                                <p className="text-xs text-gray-500">{supplier.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="text-gray-900">{supplier.contactPerson}</p>
                                                <p className="text-xs text-gray-500">{supplier.phone}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                {renderStars(supplier.rating)}
                                                <span className="ml-1 text-xs text-gray-500">({supplier.rating})</span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{supplier.totalOrders}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${supplier.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {supplier.isActive ? (t('inventory.suppliers.active') || 'Aktif') : (t('inventory.suppliers.inactive') || 'Nonaktif')}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openEditForm(supplier)}
                                                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                                >
                                                    Edit
                                                </button>
                                                {canMutate && (
                                                    <button
                                                    onClick={() => handleDelete(supplier.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                    title="Hapus"
                                                    >
                                                    <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {editingSupplier ? 'Edit Supplier' : 'Tambah Supplier Baru'}
                            </h2>
                            <button onClick={() => setShowForm(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nama Supplier <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleFormChange('name', e.target.value)}
                                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                    placeholder="Nama perusahaan / supplier"
                                />
                                {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
                            </div>

                            {/* Contact Person */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nama Kontak <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.contactPerson}
                                    onChange={(e) => handleFormChange('contactPerson', e.target.value)}
                                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.contactPerson ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                    placeholder="Nama person yang bisa dihubungi"
                                />
                                {formErrors.contactPerson && <p className="mt-1 text-xs text-red-600">{formErrors.contactPerson}</p>}
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleFormChange('email', e.target.value)}
                                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                    placeholder="email@supplier.com"
                                />
                                {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>}
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleFormChange('phone', e.target.value)}
                                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                    placeholder="081234567890"
                                />
                                {formErrors.phone && <p className="mt-1 text-xs text-red-600">{formErrors.phone}</p>}
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Alamat <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => handleFormChange('address', e.target.value)}
                                    rows={2}
                                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.address ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                    placeholder="Alamat lengkap supplier"
                                />
                                {formErrors.address && <p className="mt-1 text-xs text-red-600">{formErrors.address}</p>}
                            </div>

                            {/* City */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kota</label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => handleFormChange('city', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Kota"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => handleFormChange('notes', e.target.value)}
                                    rows={2}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Catatan tambahan (opsional)"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" disabled={submitting}>
                                    Batal
                                </button>
                                <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {submitting ? 'Menyimpan...' : (editingSupplier ? 'Update' : 'Simpan')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                    {toast.type === 'success' ? '✓' : '✕'} {toast.message}
                </div>
            )}
        </div>
    )
}
