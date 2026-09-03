'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface QuotationItem {
    description: string
    quantity: number
    unitPrice: number
}

interface QuotationData {
    id: string
    quotationNumber: string
    customerName: string
    customerEmail: string
    contactId: string
    items: Array<{ description: string; quantity: number; unitPrice: number }>
    subtotal: number
    tax: number
    total: number
    status: string
    validUntil: string
    notes: string
    terms: string
    discount: number
}

export default function QuotationEditPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [quotation, setQuotation] = useState<QuotationData | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    const [formData, setFormData] = useState({
        validUntil: '',
        notes: '',
        terms: '',
    })
    const [items, setItems] = useState<QuotationItem[]>([
        { description: '', quantity: 1, unitPrice: 0 },
    ])

    useEffect(() => {
        const fetchQuotation = async () => {
            try {
                setLoading(true)
                const res = await fetch(`/api/finance/quotations/${params.id}`)
                const data = await res.json()
                if (data.success) {
                    const q = data.data
                    setQuotation(q)
                    setFormData({
                        validUntil: q.validUntil || '',
                        notes: q.notes || '',
                        terms: q.terms || '',
                    })
                    if (q.items && q.items.length > 0) {
                        setItems(q.items.map((item: { description: string; quantity: number; unitPrice: number }) => ({
                            description: item.description,
                            quantity: Number(item.quantity),
                            unitPrice: Number(item.unitPrice),
                        })))
                    }
                } else {
                    setError('Quotation tidak ditemukan')
                }
            } catch {
                setError('Gagal memuat data quotation')
            } finally {
                setLoading(false)
            }
        }
        fetchQuotation()
    }, [params.id])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, unitPrice: 0 }])
    }

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index))
        }
    }

    const updateItem = (index: number, field: keyof QuotationItem, value: string | number) => {
        const newItems = [...items]
        newItems[index] = { ...newItems[index], [field]: value }
        setItems(newItems)
    }

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const ppn = subtotal * 0.11
    const total = subtotal + ppn

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validate items
        const hasEmptyItems = items.some(item => !item.description.trim())
        if (hasEmptyItems) {
            setToast({ message: 'Semua item harus memiliki deskripsi', type: 'error' })
            return
        }

        setSaving(true)
        try {
            const res = await fetch(`/api/finance/quotations/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    validUntil: formData.validUntil || undefined,
                    notes: formData.notes || undefined,
                    terms: formData.terms || undefined,
                    items: items.map(item => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                    })),
                }),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: 'Quotation berhasil diperbarui', type: 'success' })
                setTimeout(() => {
                    router.push(`/dashboard/finance/quotations/${params.id}`)
                }, 1000)
            } else {
                setToast({ message: data.error || 'Gagal memperbarui quotation', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal memperbarui quotation', type: 'error' })
        } finally {
            setSaving(false)
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

    if (error || !quotation) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500">{error || 'Quotation tidak ditemukan'}</p>
                <Link href="/dashboard/finance/quotations" className="mt-4 text-blue-600 hover:underline">
                    Kembali ke Quotations
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.message}
                </div>
            )}

            {/* Back Button */}
            <Link href={`/dashboard/finance/quotations/${params.id}`} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Detail Quotation
            </Link>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Edit Quotation</h1>
                <p className="text-gray-500">Perbarui informasi quotation {quotation.quotationNumber}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="max-w-3xl">
                <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
                    {/* Valid Until */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Berlaku Sampai</label>
                        <input
                            type="date"
                            value={formData.validUntil}
                            onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    {/* Items */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-gray-700">Item Penawaran</label>
                            <button
                                type="button"
                                onClick={addItem}
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                            >
                                <Plus className="h-4 w-4" />
                                Tambah Item
                            </button>
                        </div>
                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            required
                                            value={item.description}
                                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                            placeholder="Deskripsi item"
                                        />
                                    </div>
                                    <div className="w-24">
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            step="1"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, 'quantity', Number(e.target.value) || 1)}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                            placeholder="Qty"
                                        />
                                    </div>
                                    <div className="w-40">
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={item.unitPrice || ''}
                                            onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value) || 0)}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                            placeholder="Harga satuan"
                                        />
                                    </div>
                                    <div className="w-36 text-right text-sm text-gray-600 py-2">
                                        {formatCurrency(item.quantity * item.unitPrice)}
                                    </div>
                                    {items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="rounded-lg bg-gray-50 p-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="font-medium">{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">PPN (11%)</span>
                                <span className="font-medium">{formatCurrency(ppn)}</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-2">
                                <span className="font-semibold text-gray-900">Total</span>
                                <span className="font-bold text-gray-900">{formatCurrency(total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Terms & Notes */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Syarat & Ketentuan</label>
                            <textarea
                                value={formData.terms}
                                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                                rows={3}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Catatan tambahan (opsional)"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                    <Link
                        href={`/dashboard/finance/quotations/${params.id}`}
                        className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Batal
                    </Link>
                </div>
            </form>
        </div>
    )
}
