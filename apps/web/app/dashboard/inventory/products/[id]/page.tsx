'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { ArrowLeft, Pencil, Package, ClipboardList, AlertTriangle, Trash2, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface ProductDetail {
    id: string
    sku: string
    name: string
    description: string
    category: string
    price: number
    cost: number
    stock: number
    minStock: number
    unit: string
    supplier: string
    status: string
    createdAt: string
}

const statusConfig: Record<string, { color: string }> = {
    active: { color: 'bg-green-100 text-green-800' },
    inactive: { color: 'bg-red-100 text-red-800' },
    draft: { color: 'bg-gray-100 text-gray-800' },
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
    const router = useRouter()
    const [product, setProduct] = useState<ProductDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        sku: '',
        category: '',
        unit: '',
        supplier: '',
        price: 0,
        cost: 0,
        stock: 0,
        minStock: 0,
    })
    const [editSaving, setEditSaving] = useState(false)

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await fetch(`/api/inventory/products/${params.id}`)
                const data = await response.json()
                if (data.success) {
                    setProduct(data.data)
                } else {
                    setError(t('inventory.productDetail.error'))
                }
            } catch {
                setError(t('inventory.productDetail.errorLoad'))
            } finally {
                setLoading(false)
            }
        }
        fetchProduct()
    }, [params.id, t])

    const openEditForm = () => {
        if (!product) return
        setEditForm({
            name: product.name,
            description: product.description || '',
            sku: product.sku,
            category: product.category,
            unit: product.unit,
            supplier: product.supplier || '',
            price: Number(product.price),
            cost: Number(product.cost),
            stock: product.stock,
            minStock: product.minStock,
        })
        setIsEditing(true)
    }

    const handleEditSave = async () => {
        setEditSaving(true)
        try {
            const res = await fetch(`/api/inventory/products/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: t('inventory.productDetail.updateSuccess'), type: 'success' })
                setIsEditing(false)
                // Refresh product data
                const updated = await fetch(`/api/inventory/products/${params.id}`)
                const updatedData = await updated.json()
                if (updatedData.success) {
                    setProduct(updatedData.data)
                }
            } else {
                setToast({ message: data.error || t('inventory.productDetail.updateError'), type: 'error' })
            }
        } catch {
            setToast({ message: t('inventory.productDetail.updateError'), type: 'error' })
        } finally {
            setEditSaving(false)
        }
    }

    const handleDelete = async () => {
        setShowDeleteConfirm(true)
    }

    const confirmDelete = async () => {
        try {
            const res = await fetch(`/api/inventory/products/${params.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                setToast({ message: t('inventory.productDetail.deleteSuccess'), type: 'success' })
                router.push('/dashboard/inventory/products')
            } else {
                setToast({ message: data.error || t('inventory.productDetail.deleteError'), type: 'error' })
            }
        } catch {
            setToast({ message: t('inventory.productDetail.deleteError'), type: 'error' })
        }
    }

    if (loading) {
        return (
            <div className="p-6">
                <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
                <div className="mt-4 h-48 animate-pulse rounded-xl bg-gray-100" />
            </div>
        )
    }

    if (error || !product) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <p className="text-lg text-gray-600">{error || t('inventory.productDetail.error')}</p>
                    <Link href="/dashboard/inventory/products" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
                        ← {t('inventory.productDetail.backToProducts')}
                    </Link>
                </div>
            </div>
        )
    }

    const statusInfo = statusConfig[product.status] || { color: 'bg-gray-100 text-gray-800' }
    const stockStatus = product.stock <= 0
        ? { label: t('inventory.productDetail.stockOut'), color: 'text-red-600', bg: 'bg-red-50' }
        : product.stock <= product.minStock
            ? { label: t('inventory.productDetail.stockLow'), color: 'text-yellow-600', bg: 'bg-yellow-50' }
            : { label: t('inventory.productDetail.stockOk'), color: 'text-green-600', bg: 'bg-green-50' }
    const price = Number(product.price);
    const cost = Number(product.cost);
    const margin = price > 0 ? ((price - cost) / price * 100).toFixed(1) : '0'

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div>
                <Link href="/dashboard/inventory/products" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="h-4 w-4" />
                    {t('inventory.productDetail.backToProducts')}
                </Link>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
                        <p className="text-sm text-gray-500">{t('inventory.productDetail.sku')}: {product.sku} • {product.category}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusInfo.color}`}>
                            {t(`inventory.products.${product.status}`)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Product Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('inventory.productDetail.productInfo')}</h3>
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm text-gray-500">{t('inventory.productDetail.sku')}</p>
                                <p className="font-mono font-medium text-gray-900">{product.sku}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('inventory.productDetail.category')}</p>
                                <Link href="/dashboard/inventory/categories" className="font-medium text-blue-600 hover:underline">{product.category}</Link>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('inventory.productDetail.unit')}</p>
                                <p className="font-medium text-gray-900">{product.unit}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('inventory.productDetail.supplier')}</p>
                                <Link href="/dashboard/inventory/suppliers" className="font-medium text-blue-600 hover:underline">{product.supplier}</Link>
                            </div>
                        </div>
                        {product.description && (
                            <div className="mt-4">
                                <p className="text-sm text-gray-500">{t('inventory.productDetail.description')}</p>
                                <p className="mt-1 text-sm text-gray-700">{product.description}</p>
                            </div>
                        )}
                    </div>

                    {/* Pricing */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('inventory.productDetail.pricing')}</h3>
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="rounded-lg bg-green-50 p-4">
                                <p className="text-sm text-green-600">{t('inventory.productDetail.sellPrice')}</p>
                                <p className="text-xl font-bold text-green-700">{formatCurrency(Number(product.price))}</p>
                            </div>
                            <div className="rounded-lg bg-blue-50 p-4">
                                <p className="text-sm text-blue-600">{t('inventory.productDetail.buyPrice')}</p>
                                <p className="text-xl font-bold text-blue-700">{formatCurrency(Number(product.cost))}</p>
                            </div>
                            <div className="rounded-lg bg-purple-50 p-4">
                                <p className="text-sm text-purple-600">{t('inventory.productDetail.margin')}</p>
                                <p className="text-xl font-bold text-purple-700">{margin}%</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Stock Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('inventory.productDetail.stockStatus')}</h3>
                        <div className="mt-4">
                            <div className={`rounded-lg p-4 ${stockStatus.bg}`}>
                                <p className={`text-sm ${stockStatus.color}`}>{stockStatus.label}</p>
                                <p className="text-3xl font-bold text-gray-900">{product.stock}</p>
                                <p className="text-sm text-gray-500">{product.unit} {t('inventory.productDetail.available')}</p>
                            </div>
                            <div className="mt-4 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">{t('inventory.productDetail.minStock')}</span>
                                    <span className="font-medium text-gray-900">{product.minStock} {product.unit}</span>
                                </div>
                                <div className="w-full rounded-full bg-gray-200 h-2">
                                    <div
                                        className={`h-2 rounded-full ${product.stock <= 0 ? 'bg-red-500' : product.stock <= product.minStock ? 'bg-yellow-500' : 'bg-green-500'
                                            }`}
                                        style={{ width: `${Math.min(100, (product.stock / (product.minStock * 3)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('inventory.productDetail.detail')}</h3>
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('inventory.productDetail.productId')}</span>
                                <span className="font-mono text-sm text-gray-900">{product.id}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('inventory.productDetail.createdAt')}</span>
                                <span className="text-sm text-gray-900">{formatDate(product.createdAt)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('inventory.supplierDetail.actions')}</h3>
                        <div className="mt-4 space-y-3">
                            <button
                                onClick={openEditForm}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                <Pencil className="h-4 w-4" />
                                {t('inventory.productDetail.edit')}
                            </button>
                            <button
                                onClick={() => router.push('/dashboard/inventory/stock')}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <ClipboardList className="h-4 w-4" />
                                {t('inventory.productDetail.stockHistory')}
                            </button>
                            <span className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed" title={t('common.comingSoon')}>
                                <Package className="h-4 w-4" />
                                {t('inventory.productDetail.restock')}
                            </span>
                            {canMutate && (
                                <button onClick={handleDelete} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
                                    <Trash2 className="h-4 w-4" />
                                    {t('inventory.productDetail.delete')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast notification */}
            {toast && (
                <div className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                    {toast.message}
                    <button onClick={() => setToast(null)} className="ml-2"><X className="h-4 w-4 inline" /></button>
                </div>
            )}

            {/* Delete Confirm Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={confirmDelete}
                title="Konfirmasi Hapus"
                message={t('inventory.productDetail.confirmDelete')}
                confirmText="Hapus"
                cancelText="Batal"
                variant="danger"
            />
        </div>
    )
}
