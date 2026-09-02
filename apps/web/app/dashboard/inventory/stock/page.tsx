'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { Search, Plus, Package, AlertTriangle, X } from 'lucide-react'
import { useSession } from 'next-auth/react'

type StockItem = {
    id: string
    sku: string
    name: string
    stock: number
    minStock: number
    unit: string
    unitPrice: number
    category: string
    status: string
}

type Product = {
    id: string
    sku: string
    name: string
    category: string
    unitPrice: number
    stock: number
    minStock: number
    unit: string
    status: string
}

const statusStyles: Record<string, string> = {
    ok: 'bg-green-100 text-green-800',
    low: 'bg-yellow-100 text-yellow-800',
    out: 'bg-red-100 text-red-800',
}

export default function StockPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
    const [stock, setStock] = useState<StockItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [showAdjustModal, setShowAdjustModal] = useState(false)
    const [adjustProductId, setAdjustProductId] = useState('')
    const [adjustQuantity, setAdjustQuantity] = useState<number>(0)
    const [adjustReason, setAdjustReason] = useState('')
    const [adjustSubmitting, setAdjustSubmitting] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        fetchStock()
    }, [])

    const fetchStock = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/inventory/products')
            const data = await response.json()
            if (data.success) {
                const stockItems: StockItem[] = data.data.map((product: Product) => ({
                    id: product.id,
                    sku: product.sku,
                    name: product.name,
                    stock: product.stock,
                    minStock: product.minStock,
                    unit: product.unit,
                    unitPrice: product.unitPrice,
                    category: product.category,
                    status: product.stock === 0 ? 'out' : product.stock <= product.minStock ? 'low' : 'ok',
                }))
                setStock(stockItems)
            } else {
                setError(t('inventory.stock.error'))
            }
        } catch {
            setError(t('inventory.stock.errorHint'))
        } finally {
            setLoading(false)
        }
    }

    const filtered = stock.filter((s) => {
        const matchStatus = filterStatus === 'all' || s.status === filterStatus
        const matchSearch = searchQuery === '' ||
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.sku.toLowerCase().includes(searchQuery.toLowerCase())
        return matchStatus && matchSearch
    })

    const stats = {
        total: stock.length,
        ok: stock.filter(s => s.status === 'ok').length,
        low: stock.filter(s => s.status === 'low').length,
        out: stock.filter(s => s.status === 'out').length,
        totalValue: stock.reduce((sum, s) => sum + (Number(s.unitPrice) * s.stock), 0),
    }

    const statusLabels: Record<string, string> = {
        ok: t('inventory.stock.ok'),
        low: t('inventory.stock.low'),
        out: t('inventory.stock.out'),
    }

    const handleAdjustStock = async () => {
        if (!adjustProductId || adjustQuantity === 0 || !adjustReason.trim()) return
        setAdjustSubmitting(true)
        try {
            const product = stock.find(s => s.id === adjustProductId)
            if (!product) {
                setToast({ message: t('inventory.stock.adjustError'), type: 'error' })
                return
            }
            const newStock = product.stock + adjustQuantity
            if (newStock < 0) {
                setToast({ message: t('inventory.stock.adjustNegative'), type: 'error' })
                return
            }
            const res = await fetch(`/api/inventory/products/${adjustProductId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stock: newStock }),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: t('inventory.stock.adjustSuccess'), type: 'success' })
                setShowAdjustModal(false)
                setAdjustProductId('')
                setAdjustQuantity(0)
                setAdjustReason('')
                fetchStock()
            } else {
                setToast({ message: data.error || t('inventory.stock.adjustError'), type: 'error' })
            }
        } catch {
            setToast({ message: t('inventory.stock.adjustError'), type: 'error' })
        } finally {
            setAdjustSubmitting(false)
        }
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
                        onClick={fetchStock}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        {t('inventory.stock.retry')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('inventory.stock.title')}</h1>
                    <p className="text-gray-500">{t('inventory.stock.subtitle')}</p>
                </div>
                {canMutate && (
                    <button
                        onClick={() => setShowAdjustModal(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        {t('inventory.stock.adjustStok')}
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('inventory.stock.totalItems')}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('inventory.stock.ok')}</p>
                    <p className="mt-1 text-2xl font-bold text-green-600">{stats.ok}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('inventory.stock.low')}</p>
                    <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.low}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('inventory.stock.out')}</p>
                    <p className="mt-1 text-2xl font-bold text-red-600">{stats.out}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('inventory.stock.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {['all', 'ok', 'low', 'out'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === s
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {s === 'all' ? t('inventory.stock.allStatuses') : statusLabels[s] || s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Kartu Stock untuk tampilan mobile */}
            <div className="md:hidden space-y-3">
                {filtered.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                        <Package className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                        {t('inventory.stock.noData')}
                    </div>
                ) : (
                    filtered.map((item) => (
                        <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="font-medium text-gray-900">{item.name}</div>
                                    <div className="font-mono text-xs text-gray-500">{item.sku}</div>
                                </div>
                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[item.status] || 'bg-gray-100 text-gray-700'}`}>
                                    {statusLabels[item.status] || item.status}
                                </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500">{t('inventory.stock.category')}:</span>
                                    <span className="ml-1 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{item.category}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('inventory.stock.currentStock')}:</span>
                                    <span className={`ml-1 font-bold ${item.status === 'out' ? 'text-red-600' : item.status === 'low' ? 'text-yellow-600' : 'text-gray-900'}`}>
                                        {item.stock} {item.unit}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('inventory.stock.minStock')}:</span>
                                    <span className="ml-1">{item.minStock} {item.unit}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('inventory.stock.stockValue')}:</span>
                                    <span className="ml-1 font-medium">{formatCurrency(Number(item.unitPrice) * item.stock)}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Tabel Stock untuk tampilan desktop */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 font-medium text-gray-600">{t('inventory.stock.sku')}</th>
                                <th className="px-4 py-3 font-medium text-gray-600">{t('inventory.stock.productName')}</th>
                                <th className="px-4 py-3 font-medium text-gray-600">{t('inventory.stock.category')}</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">{t('inventory.stock.currentStock')}</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">{t('inventory.stock.minStock')}</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">{t('inventory.stock.stockValue')}</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-600">{t('inventory.stock.status')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                                        <Package className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                                        {t('inventory.stock.noData')}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{item.sku}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <span className={`font-bold ${item.status === 'out' ? 'text-red-600' : item.status === 'low' ? 'text-yellow-600' : 'text-gray-900'}`}>
                                                {item.stock}
                                            </span>
                                            <span className="text-gray-500 ml-1">{item.unit}</span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-gray-500">{item.minStock} {item.unit}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{formatCurrency(Number(item.unitPrice) * item.stock)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[item.status] || 'bg-gray-100 text-gray-700'}`}>
                                                {statusLabels[item.status] || item.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Stock Adjustment Modal */}
            {showAdjustModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">{t('inventory.stock.adjustStok')}</h3>
                            <button
                                onClick={() => setShowAdjustModal(false)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('inventory.stock.product')}</label>
                                <select
                                    value={adjustProductId}
                                    onChange={(e) => setAdjustProductId(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    {stock.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name} ({item.sku}) — {item.stock} {item.unit}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('inventory.stock.adjustQuantity')}</label>
                                <input
                                    type="number"
                                    value={adjustQuantity || ''}
                                    onChange={(e) => setAdjustQuantity(parseInt(e.target.value) || 0)}
                                    placeholder="0"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <p className="mt-1 text-xs text-gray-500">{t('inventory.stock.adjustQuantityHint')}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('inventory.stock.adjustReason')}</label>
                                <textarea
                                    value={adjustReason}
                                    onChange={(e) => setAdjustReason(e.target.value)}
                                    placeholder={t('inventory.stock.adjustReasonPlaceholder')}
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={() => setShowAdjustModal(false)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleAdjustStock}
                                disabled={adjustSubmitting || !adjustProductId || adjustQuantity === 0 || !adjustReason.trim()}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {adjustSubmitting ? t('common.loading') : t('common.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.message}
                    <button onClick={() => setToast(null)} className="ml-2"><X className="h-4 w-4 inline" /></button>
                </div>
            )}
        </div>
    )
}
