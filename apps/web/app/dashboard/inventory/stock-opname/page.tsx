'use client'

import { useState, useEffect } from 'react'
import { formatDateTime } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import {
    ClipboardList,
    Plus,
    Search,
    Check,
    X,
    AlertTriangle,
    Warehouse,
    Package,
    FileText,
    Eye,
} from 'lucide-react'

type StockOpnameItem = {
    id: string
    opnameNumber: string
    status: string
    opnameDate: string
    notes: string | null
    totalDifference: number
    warehouseName: string
    warehouseCode: string
    itemCount: number
    createdAt: string
}

type WarehouseOption = {
    id: string
    name: string
    code: string
}

type ProductOption = {
    id: string
    name: string
    sku: string
    stock: number
    unit: string
}

type OpnameForm = {
    warehouseId: string
    notes: string
    items: Array<{
        productId: string
        physicalQuantity: number
        notes: string
    }>
}

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

export default function StockOpnamePage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
    const [opnames, setOpnames] = useState<StockOpnameItem[]>([])
    const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
    const [products, setProducts] = useState<ProductOption[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState('all')
    const [showModal, setShowModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    const [form, setForm] = useState<OpnameForm>({
        warehouseId: '',
        notes: '',
        items: [],
    })

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchData = async () => {
        try {
            setLoading(true)
            const [opnameRes, warehouseRes, productRes] = await Promise.all([
                fetch('/api/inventory/stock-opname?limit=100'),
                fetch('/api/inventory/warehouses?activeOnly=true&limit=100'),
                fetch('/api/inventory/products?limit=1000'),
            ])
            const [opnameJson, warehouseJson, productJson] = await Promise.all([
                opnameRes.json(),
                warehouseRes.json(),
                productRes.json(),
            ])
            if (opnameJson.success) setOpnames(opnameJson.data)
            if (warehouseJson.success) setWarehouses(warehouseJson.data)
            if (productJson.success) setProducts(productJson.data)
        } catch {
            setError('Gagal memuat data')
        } finally {
            setLoading(false)
        }
    }

    const filtered = opnames.filter((o) => filterStatus === 'all' || o.status === filterStatus)

    const addItem = () => {
        setForm((prev) => ({
            ...prev,
            items: [...prev.items, { productId: '', physicalQuantity: 0, notes: '' }],
        }))
    }

    const updateItem = (index: number, field: string, value: string | number) => {
        setForm((prev) => ({
            ...prev,
            items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
        }))
    }

    const removeItem = (index: number) => {
        setForm((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }))
    }

    const handleSubmit = async () => {
        if (form.items.length === 0) {
            setToast({ message: 'Minimal 1 item stock opname', type: 'error' })
            return
        }

        const hasEmptyProduct = form.items.some((item) => !item.productId)
        if (hasEmptyProduct) {
            setToast({ message: 'Semua item harus memilih produk', type: 'error' })
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch('/api/inventory/stock-opname', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    warehouseId: form.warehouseId || null,
                    notes: form.notes || null,
                    items: form.items,
                }),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: 'Stock opname berhasil dibuat', type: 'success' })
                setShowModal(false)
                setForm({ warehouseId: '', notes: '', items: [] })
                fetchData()
            } else {
                setToast({ message: data.error || 'Gagal membuat stock opname', type: 'error' })
            }
        } catch {
            setToast({ message: 'Terjadi kesalahan', type: 'error' })
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
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
                    <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                        {t('common.retry') || 'Coba Lagi'}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Stock Opname</h1>
                    <p className="text-gray-500">Inventory fisik vs sistem</p>
                </div>
                {canMutate && (
                    <button onClick={() => { setForm({ warehouseId: '', notes: '', items: [] }); setShowModal(true) }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                        <Plus className="h-4 w-4" />
                        Buat Opname
                    </button>
                )}
            </div>

            {/* Filter */}
            <div className="flex gap-2 overflow-x-auto">
                {['all', 'DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${filterStatus === status ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                    >
                        {status === 'all' ? 'Semua' : statusLabels[status] || status}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Opname</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gudang</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selisih</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center">
                                    <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
                                    <p className="mt-2 text-gray-500">Belum ada stock opname</p>
                                </td>
                            </tr>
                        ) : (
                            filtered.map((opname) => (
                                <tr key={opname.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium text-gray-900">{opname.opnameNumber}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {new Date(opname.opnameDate).toLocaleDateString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {opname.warehouseName}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {opname.itemCount} item
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={opname.totalDifference > 0 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                                            {opname.totalDifference} selisih
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[opname.status] || 'bg-gray-100 text-gray-800'}`}>
                                            {statusLabels[opname.status] || opname.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <h2 className="text-lg font-semibold text-gray-900">Buat Stock Opname Baru</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Gudang (Opsional)</label>
                                <select
                                    value={form.warehouseId}
                                    onChange={(e) => setForm((prev) => ({ ...prev, warehouseId: e.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="">Semua Gudang</option>
                                    {warehouses.map((w) => (
                                        <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                                    rows={2}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="Catatan opname..."
                                />
                            </div>

                            {/* Items */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">Item Stock Opname</label>
                                    <button onClick={addItem} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                                        <Plus className="h-4 w-4" /> Tambah Item
                                    </button>
                                </div>
                                {form.items.length === 0 ? (
                                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                                        <Package className="mx-auto h-8 w-8 text-gray-300" />
                                        <p className="mt-2 text-sm text-gray-500">Klik "Tambah Item" untuk memulai</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {form.items.map((item, index) => {
                                            const product = products.find((p) => p.id === item.productId)
                                            return (
                                                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                    <div className="flex-1">
                                                        <select
                                                            value={item.productId}
                                                            onChange={(e) => updateItem(index, 'productId', e.target.value)}
                                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                                        >
                                                            <option value="">Pilih Produk</option>
                                                            {products.map((p) => (
                                                                <option key={p.id} value={p.id}>{p.name} ({p.sku}) - Stok: {p.stock}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="w-32">
                                                        <input
                                                            type="number"
                                                            value={item.physicalQuantity}
                                                            onChange={(e) => updateItem(index, 'physicalQuantity', parseInt(e.target.value) || 0)}
                                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                                            placeholder="Qty fisik"
                                                            min={0}
                                                        />
                                                    </div>
                                                    <div className="w-24 text-center">
                                                        {product && (
                                                            <span className={`text-sm font-medium ${item.physicalQuantity !== product.stock ? 'text-red-600' : 'text-green-600'}`}>
                                                                {item.physicalQuantity - product.stock >= 0 ? '+' : ''}{item.physicalQuantity - product.stock}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button onClick={() => removeItem(index)} className="text-gray-400 hover:text-red-600">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                                Batal
                            </button>
                            <button onClick={handleSubmit} disabled={submitting || form.items.length === 0} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                {submitting ? 'Menyimpan...' : (
                                    <>
                                        <Check className="h-4 w-4" />
                                        Simpan Opname
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
