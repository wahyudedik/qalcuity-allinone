'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { Search, Plus, MoreHorizontal, Eye, Package, Trash2, Loader2, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type Category = {
    id: string
    name: string
    description: string
    productCount: number
    totalValue: number
}

export default function CategoriesPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const router = useRouter()
    const canMutate = session?.user?.role !== 'VIEWER'
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null)
    const [confirmTitle, setConfirmTitle] = useState('Konfirmasi Hapus')
    const [confirmMessage, setConfirmMessage] = useState('')
    const [menuCategoryId, setMenuCategoryId] = useState<string | null>(null)
    const [editCategory, setEditCategory] = useState<Category | null>(null)
    const [editName, setEditName] = useState('')
    const [editDesc, setEditDesc] = useState('')

    // Add category modal
    const [showAddModal, setShowAddModal] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [newCategoryDesc, setNewCategoryDesc] = useState('')
    const [addLoading, setAddLoading] = useState(false)

    useEffect(() => {
        fetchCategories()
    }, [])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchCategories = async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/inventory/categories')
            const data = await res.json()
            if (data.success) {
                setCategories(data.data)
            } else {
                setError(data.error || 'Gagal memuat data kategori')
            }
        } catch {
            setError('Gagal terhubung ke server')
        } finally {
            setLoading(false)
        }
    }

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCategoryName.trim()) return

        try {
            setAddLoading(true)
            const res = await fetch('/api/inventory/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newCategoryName.trim(),
                    description: newCategoryDesc.trim(),
                }),
            })
            const data = await res.json()
            if (data.success) {
                setCategories(prev => [...prev, data.data])
                setShowAddModal(false)
                setNewCategoryName('')
                setNewCategoryDesc('')
                setToast({ message: `Kategori "${data.data.name}" berhasil ditambahkan`, type: 'success' })
            } else {
                setToast({ message: data.error || 'Gagal menambahkan kategori', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal terhubung ke server', type: 'error' })
        } finally {
            setAddLoading(false)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        setConfirmTitle('Konfirmasi Hapus')
        setConfirmMessage(`Apakah Anda yakin ingin menghapus kategori "${name}"?`)
        setConfirmAction(() => async () => {
            try {
                const response = await fetch(`/api/inventory/categories?id=${id}`, {
                    method: 'DELETE',
                })
                const data = await response.json()

                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Gagal menghapus kategori')
                }

                setCategories(prev => prev.filter(c => c.id !== id))
                setToast({ message: `Kategori "${name}" berhasil dihapus`, type: 'success' })
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Gagal menghapus kategori'
                setToast({ message, type: 'error' })
            }
        })
    }

    const filtered = categories.filter((c) =>
            searchQuery === '' || c.name.toLowerCase().includes(searchQuery.toLowerCase())
        )

        const totalProducts = categories.reduce((s, c) => s + c.productCount, 0)

        if (loading) {
            return (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{t('inventory.categories.title')}</h1>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                        <p className="text-sm text-gray-500">Memuat data kategori...</p>
                    </div>
                </div>
            )
        }

        if (error) {
            return (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{t('inventory.categories.title')}</h1>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center">
                        <p className="text-sm text-red-600 mb-3">{error}</p>
                        <button
                            onClick={fetchCategories}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            Coba Lagi
                        </button>
                    </div>
                </div>
            )
        }

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('inventory.categories.title')}</h1>
                        <p className="text-gray-500">{categories.length} {t('inventory.categories.categoriesCount')} · {totalProducts} {t('inventory.categories.productsCount')}</p>
                    </div>
                    {canMutate && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" />
                            {t('inventory.categories.addCategory')}
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 relative">
                    <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('inventory.categories.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                {/* Categories Grid */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Package className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Belum ada kategori</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Buat kategori untuk mengorganisir produk Anda</p>
                        {canMutate && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                Tambah Kategori
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filtered.map((cat) => (
                            <div key={cat.id} className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                                        <p className="mt-1 text-xs text-gray-500">{cat.description}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {canMutate && (
                                            <button
                                                onClick={() => handleDelete(cat.id, cat.name)}
                                                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                                aria-label="Hapus kategori"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                        <div className="relative">
                                            <button
                                                onClick={() => setMenuCategoryId(menuCategoryId === cat.id ? null : cat.id)}
                                                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                                aria-label={t('inventory.categories.dots')}
                                            >
                                                <MoreHorizontal className="h-5 w-5" />
                                            </button>
                                            {menuCategoryId === cat.id && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setMenuCategoryId(null)} />
                                                    <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                                        <button
                                                            onClick={() => { setEditCategory(cat); setEditName(cat.name); setEditDesc(cat.description); setMenuCategoryId(null) }}
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => { handleDelete(cat.id, cat.name); setMenuCategoryId(null) }}
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            Hapus
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{cat.productCount} {t('inventory.categories.productsCount')}</p>
                                        <p className="text-xs text-gray-500">{formatCurrency(cat.totalValue)}</p>
                                    </div>
                                    <button
                                        onClick={() => router.push(`/dashboard/inventory/products?category=${encodeURIComponent(cat.name)}`)}
                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                    >
                                        <Eye className="h-3 w-3" />
                                        {t('inventory.categories.view')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Category Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Tambah Kategori Baru</h3>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <form onSubmit={handleAddCategory} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Nama Kategori <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder="Masukkan nama kategori"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Deskripsi
                                    </label>
                                    <textarea
                                        value={newCategoryDesc}
                                        onChange={(e) => setNewCategoryDesc(e.target.value)}
                                        placeholder="Deskripsi kategori (opsional)"
                                        rows={3}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddModal(false)
                                            setNewCategoryName('')
                                            setNewCategoryDesc('')
                                        }}
                                        className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={addLoading || !newCategoryName.trim()}
                                        className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {addLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Simpan Kategori
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Category Modal */}
                {editCategory && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                            <h3 className="mb-4 text-lg font-semibold text-gray-900">Edit Kategori</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Nama</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Deskripsi</label>
                                    <input
                                        type="text"
                                        value={editDesc}
                                        onChange={(e) => setEditDesc(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    onClick={() => setEditCategory(null)}
                                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!editName.trim()) return
                                        try {
                                            const res = await fetch(`/api/inventory/categories/${editCategory.id}`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ name: editName, description: editDesc }),
                                            })
                                            if (res.ok) {
                                                setToast({ message: 'Kategori berhasil diupdate', type: 'success' })
                                                setEditCategory(null)
                                                fetchCategories()
                                            } else {
                                                setToast({ message: 'Gagal mengupdate kategori', type: 'error' })
                                            }
                                        } catch {
                                            setToast({ message: 'Gagal mengupdate kategori', type: 'error' })
                                        }
                                    }}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                >
                                    Simpan
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toast Notification */}
                {toast && (
                    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                        {toast.message}
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
