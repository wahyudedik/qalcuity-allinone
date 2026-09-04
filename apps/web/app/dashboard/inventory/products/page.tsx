'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { Search, Plus, Download, Package, AlertTriangle, Trash2, Check, X, Loader2, ArrowUp, ArrowDown } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'

type Product = {
    id: string
    sku: string
    name: string
    description: string | null
    categoryName: string | null
    categoryId: string | null
    price: number
    cost: number
    stock: number
    minStock: number
    unit: string
    isActive: boolean
    createdAt: string
}

type Category = {
    id: string
    name: string
}

interface ProductFormData {
    name: string
    sku: string
    description: string
    price: number
    cost: number
    stock: number
    minStock: number
    unit: string
    categoryId: string
}

interface FormErrors {
    name?: string
    sku?: string
    price?: string
    cost?: string
    stock?: string
    minStock?: string
    categoryId?: string
}

function validateProductForm(data: ProductFormData): FormErrors {
    const errors: FormErrors = {}

    if (!data.name || data.name.trim().length < 2) {
        errors.name = 'Nama produk harus minimal 2 karakter'
    }

    if (!data.sku || data.sku.trim().length === 0) {
        errors.sku = 'SKU wajib diisi'
    }

    if (data.price < 0) {
        errors.price = 'Harga jual tidak boleh negatif'
    }

    if (data.cost < 0) {
        errors.cost = 'Harga beli tidak boleh negatif'
    }

    if (data.stock < 0) {
        errors.stock = 'Stok tidak boleh negatif'
    }

    if (data.minStock < 0) {
        errors.minStock = 'Stok minimum tidak boleh negatif'
    }

    return errors
}

export default function ProductsPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterCategory, setFilterCategory] = useState('all')
    const [filterStatus, setFilterStatus] = useState('all')
    const [sortField, setSortField] = useState<'name' | 'sku' | 'price'>('name')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null)
    const [confirmTitle, setConfirmTitle] = useState('Konfirmasi Hapus')
    const [confirmMessage, setConfirmMessage] = useState('')
    const importInputRef = useRef<HTMLInputElement>(null)

    // Form modal state
    const [showForm, setShowForm] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        sku: '',
        description: '',
        price: 0,
        cost: 0,
        stock: 0,
        minStock: 0,
        unit: 'pcs',
        categoryId: '',
    })
    const [formErrors, setFormErrors] = useState<FormErrors>({})
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await fetch('/api/inventory/products')
            const data = await response.json()
            if (data.success) {
                setProducts(data.data)
            } else {
                setError(data.error || 'Gagal memuat data produk')
            }
        } catch {
            setError('Gagal memuat data produk. Periksa koneksi jaringan Anda.')
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchCategories = useCallback(async () => {
        try {
            const response = await fetch('/api/inventory/categories')
            const data = await response.json()
            if (data.success && data.data) {
                setCategories(data.data)
            }
        } catch {
            // Categories are optional, silently fail
        }
    }, [])

    useEffect(() => {
        fetchProducts()
        fetchCategories()
    }, [fetchProducts, fetchCategories])

    const categoryNames = ['all', ...Array.from(new Set(products.map((p) => p.categoryName || 'Uncategorized')))]

    const filtered = products.filter((p) => {
        const matchCat = filterCategory === 'all' || (p.categoryName || 'Uncategorized') === filterCategory
        const matchStatus = filterStatus === 'all' ||
            (filterStatus === 'active' && p.isActive) ||
            (filterStatus === 'inactive' && !p.isActive)
        const matchSearch = searchQuery === '' ||
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchQuery.toLowerCase())
        return matchCat && matchStatus && matchSearch
    })

    const sorted = [...filtered].sort((a, b) => {
        let aVal: string | number, bVal: string | number
        if (sortField === 'name') { aVal = a.name; bVal = b.name }
        else if (sortField === 'sku') { aVal = a.sku; bVal = b.sku }
        else { aVal = Number(a.price); bVal = Number(b.price) }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
        }
        const cmp = String(aVal).localeCompare(String(bVal), 'id')
        return sortDirection === 'asc' ? cmp : -cmp
    })

    const toggleSort = (field: 'name' | 'sku' | 'price') => {
        if (sortField === field) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
    }

    const SortIcon = ({ field }: { field: 'name' | 'sku' | 'price' }) => {
        if (sortField !== field) return null
        return sortDirection === 'asc'
            ? <ArrowUp className="ml-1 h-3 w-3 inline" />
            : <ArrowDown className="ml-1 h-3 w-3 inline" />
    }

    const handleDelete = async (id: string) => {
        setConfirmTitle('Konfirmasi Hapus')
        setConfirmMessage('Apakah Anda yakin ingin menghapus produk ini?')
        setConfirmAction(() => async () => {
            try {
                const response = await fetch(`/api/inventory/products?id=${id}`, { method: 'DELETE' })
                const result = await response.json()
                if (result.success) {
                    fetchProducts()
                    setToast({ message: result.message || 'Produk berhasil dihapus', type: 'success' })
                } else {
                    setToast({ message: `Gagal menghapus: ${result.error}`, type: 'error' })
                }
            } catch {
                setToast({ message: 'Gagal menghapus produk', type: 'error' })
            }
        })
        setShowConfirmDialog(true)
    }

    const openCreateForm = () => {
        setEditingProduct(null)
        setFormData({
            name: '',
            sku: '',
            description: '',
            price: 0,
            cost: 0,
            stock: 0,
            minStock: 0,
            unit: 'pcs',
            categoryId: '',
        })
        setFormErrors({})
        setShowForm(true)
    }

    const openEditForm = (product: Product) => {
        setEditingProduct(product)
        setFormData({
            name: product.name,
            sku: product.sku,
            description: product.description || '',
            price: product.price,
            cost: product.cost,
            stock: product.stock,
            minStock: product.minStock,
            unit: product.unit,
            categoryId: product.categoryId || '',
        })
        setFormErrors({})
        setShowForm(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const errors = validateProductForm(formData)
        setFormErrors(errors)
        if (Object.keys(errors).length > 0) return

        setSubmitting(true)
        try {
            const url = editingProduct
                ? `/api/inventory/products/${editingProduct.id}`
                : '/api/inventory/products'
            const method = editingProduct ? 'PUT' : 'POST'

            const payload = editingProduct
                ? { id: editingProduct.id, ...formData }
                : formData

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const result = await res.json()

            if (result.success) {
                setShowForm(false)
                fetchProducts()
                setToast({
                    message: editingProduct ? 'Produk berhasil diupdate' : 'Produk berhasil ditambahkan',
                    type: 'success',
                })
            } else {
                setToast({ message: result.error || 'Gagal menyimpan data', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menyimpan data produk', type: 'error' })
        } finally {
            setSubmitting(false)
        }
    }

    const handleFormChange = (field: keyof ProductFormData, value: string | number) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
        if (formErrors[field as keyof FormErrors]) {
            setFormErrors((prev) => ({ ...prev, [field]: undefined }))
        }
    }

    const stats = {
        total: products.length,
        active: products.filter(p => p.isActive).length,
        lowStock: products.filter(p => p.stock <= p.minStock && p.stock > 0).length,
        outOfStock: products.filter(p => p.stock === 0).length,
        totalValue: products.reduce((sum, p) => sum + (Number(p.price) * p.stock), 0),
    }

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        {[1, 2, 3, 4, 5].map(i => (
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
                        onClick={fetchProducts}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        {t('inventory.products.retry') || 'Coba Lagi'}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('inventory.products.title') || 'Produk'}</h1>
                    <p className="text-gray-500">{stats.total} {t('inventory.products.subtitle') || 'produk terdaftar'}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => importInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <Download className="h-4 w-4" />
                        {t('inventory.products.import') || 'Import'}
                    </button>
                    {canMutate && (
                        <button
                            onClick={openCreateForm}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" />
                            {t('inventory.products.addProduct') || 'Tambah Produk'}
                        </button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('inventory.products.totalProducts') || 'Total Produk'}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('inventory.products.activeCount') || 'Aktif'}</p>
                    <p className="mt-1 text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('inventory.products.lowStockCount') || 'Stok Rendah'}</p>
                    <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('inventory.products.outOfStockCount') || 'Habis'}</p>
                    <p className="mt-1 text-2xl font-bold text-red-600">{stats.outOfStock}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('inventory.products.stockValue') || 'Nilai Stok'}</p>
                    <p className="mt-1 text-xl font-bold text-blue-600">{formatCurrency(stats.totalValue)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('inventory.products.searchPlaceholder') || 'Cari nama atau SKU...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                    {categoryNames.map((c) => (
                        <option key={c} value={c}>{c === 'all' ? (t('inventory.products.allCategories') || 'Semua Kategori') : c}</option>
                    ))}
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                    <option value="all">{t('inventory.products.allStatuses') || 'Semua Status'}</option>
                    <option value="active">{t('inventory.products.active') || 'Aktif'}</option>
                    <option value="inactive">{t('inventory.products.inactive') || 'Tidak Aktif'}</option>
                </select>
            </div>

            {/* Kartu produk untuk tampilan mobile */}
            <div className="md:hidden space-y-3">
                {sorted.length === 0 ? (
                    <EmptyState
                        icon={Package}
                        title={t('inventory.products.noProducts') || 'Tidak ada produk'}
                        description={searchQuery || filterCategory !== 'all' || filterStatus !== 'all' ? 'Coba ubah filter atau kata kunci pencarian' : 'Mulai tambahkan produk pertama Anda'}
                        actionLabel={canMutate ? (t('inventory.products.addProduct') || 'Tambah Produk') : undefined}
                        onAction={canMutate ? openCreateForm : undefined}
                    />
                ) : (
                    sorted.map((product) => (
                        <div key={product.id} className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Link href={`/dashboard/inventory/products/${product.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                                        {product.name}
                                    </Link>
                                    <p className="text-xs font-mono text-gray-500">{product.sku}</p>
                                </div>
                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {product.isActive ? (t('inventory.products.active') || 'Aktif') : (t('inventory.products.inactive') || 'Nonaktif')}
                                </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500">{t('inventory.products.category') || 'Kategori'}:</span>
                                    <span className="ml-1 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                                        {product.categoryName || 'Uncategorized'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('inventory.products.stock') || 'Stok'}:</span>
                                    <span className={`ml-1 font-medium ${product.stock <= product.minStock ? (product.stock === 0 ? 'text-red-600' : 'text-yellow-600') : 'text-gray-900'}`}>
                                        {product.stock} {product.unit}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('inventory.products.sellPrice') || 'Harga Jual'}:</span>
                                    <span className="ml-1 font-medium">{formatCurrency(Number(product.price))}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('inventory.products.buyPrice') || 'Harga Beli'}:</span>
                                    <span className="ml-1">{formatCurrency(Number(product.cost))}</span>
                                </div>
                            </div>
                            <div className="mt-3 flex gap-3">
                                <button
                                    onClick={() => openEditForm(product)}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(product.id)}
                                    className="text-sm font-medium text-red-600 hover:text-red-700"
                                >
                                    Hapus
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Tabel produk untuk tampilan desktop */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="cursor-pointer px-4 py-3 font-medium text-gray-600 select-none hover:text-gray-900" onClick={() => toggleSort('sku')}>
                                    {t('inventory.products.sku') || 'SKU'}<SortIcon field="sku" />
                                </th>
                                <th className="cursor-pointer px-4 py-3 font-medium text-gray-600 select-none hover:text-gray-900" onClick={() => toggleSort('name')}>
                                    {t('inventory.products.name') || 'Nama'}<SortIcon field="name" />
                                </th>
                                <th className="px-4 py-3 font-medium text-gray-600">{t('inventory.products.category') || 'Kategori'}</th>
                                <th className="cursor-pointer px-4 py-3 text-right font-medium text-gray-600 select-none hover:text-gray-900" onClick={() => toggleSort('price')}>
                                    {t('inventory.products.sellPrice') || 'Harga Jual'}<SortIcon field="price" />
                                </th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">{t('inventory.products.buyPrice') || 'Harga Beli'}</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">{t('inventory.products.stock') || 'Stok'}</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">{t('inventory.products.minStock') || 'Min Stok'}</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-600">{t('inventory.products.status') || 'Status'}</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-600"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sorted.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12">
                                        <EmptyState
                                            icon={Package}
                                            title={t('inventory.products.noProducts') || 'Tidak ada produk'}
                                            description={searchQuery || filterCategory !== 'all' || filterStatus !== 'all' ? 'Coba ubah filter atau kata kunci pencarian' : 'Mulai tambahkan produk pertama Anda'}
                                            actionLabel={canMutate ? (t('inventory.products.addProduct') || 'Tambah Produk') : undefined}
                                            onAction={canMutate ? openCreateForm : undefined}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                sorted.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{product.sku}</td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <Link href={`/dashboard/inventory/products/${product.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                                                    {product.name}
                                                </Link>
                                                <p className="text-xs text-gray-500 truncate max-w-[200px]">{product.description}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                                                {product.categoryName || 'Uncategorized'}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(Number(product.price))}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-gray-500">{formatCurrency(Number(product.cost))}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <span className={`font-medium ${product.stock <= product.minStock ? (product.stock === 0 ? 'text-red-600' : 'text-yellow-600') : 'text-gray-900'}`}>
                                                {product.stock}
                                            </span>
                                            <span className="text-gray-500 ml-1">{product.unit}</span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-gray-500">{product.minStock}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {product.isActive ? (t('inventory.products.active') || 'Aktif') : (t('inventory.products.inactive') || 'Nonaktif')}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openEditForm(product)}
                                                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                                >
                                                    Edit
                                                </button>
                                                {canMutate && (
                                                    <button
                                                        onClick={() => handleDelete(product.id)}
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
            <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'} size="md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nama Produk <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleFormChange('name', e.target.value)}
                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                }`}
                            placeholder="Nama produk"
                        />
                        {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
                    </div>

                    {/* SKU */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            SKU <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.sku}
                            onChange={(e) => handleFormChange('sku', e.target.value)}
                            className={`w-full rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 ${formErrors.sku ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                }`}
                            placeholder="Contoh: WDT-001"
                        />
                        {formErrors.sku && <p className="mt-1 text-xs text-red-600">{formErrors.sku}</p>}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleFormChange('description', e.target.value)}
                            rows={2}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Deskripsi produk (opsional)"
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                        <select
                            value={formData.categoryId}
                            onChange={(e) => handleFormChange('categoryId', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">Pilih kategori</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Price */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Harga Jual (Rp) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => handleFormChange('price', Number(e.target.value))}
                                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.price ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                    }`}
                                min="0"
                            />
                            {formErrors.price && <p className="mt-1 text-xs text-red-600">{formErrors.price}</p>}
                        </div>

                        {/* Cost */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Harga Beli (Rp) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={formData.cost}
                                onChange={(e) => handleFormChange('cost', Number(e.target.value))}
                                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.cost ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                    }`}
                                min="0"
                            />
                            {formErrors.cost && <p className="mt-1 text-xs text-red-600">{formErrors.cost}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        {/* Stock */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Stok <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={formData.stock}
                                onChange={(e) => handleFormChange('stock', Number(e.target.value))}
                                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.stock ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                    }`}
                                min="0"
                            />
                            {formErrors.stock && <p className="mt-1 text-xs text-red-600">{formErrors.stock}</p>}
                        </div>

                        {/* Min Stock */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Min Stok</label>
                            <input
                                type="number"
                                value={formData.minStock}
                                onChange={(e) => handleFormChange('minStock', Number(e.target.value))}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                min="0"
                            />
                        </div>

                        {/* Unit */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
                            <select
                                value={formData.unit}
                                onChange={(e) => handleFormChange('unit', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="pcs">pcs</option>
                                <option value="kg">kg</option>
                                <option value="liter">liter</option>
                                <option value="box">box</option>
                                <option value="set">set</option>
                                <option value="unit">unit</option>
                            </select>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" disabled={submitting}>
                            Batal
                        </button>
                        <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {submitting ? 'Menyimpan...' : (editingProduct ? 'Update' : 'Simpan')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Hidden file input for Import */}
            <input
                ref={importInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                        setToast({ message: `File "${file.name}" berhasil dipilih. Mengunggah...`, type: 'success' })
                    }
                }}
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

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={showConfirmDialog}
                onClose={() => { setShowConfirmDialog(false); setConfirmAction(null) }}
                onConfirm={async () => { if (confirmAction) await confirmAction(); setShowConfirmDialog(false); setConfirmAction(null) }}
                title={confirmTitle}
                message={confirmMessage}
                confirmText="Hapus"
                cancelText="Batal"
                variant="danger"
            />
        </div>
    )
}
