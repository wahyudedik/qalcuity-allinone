'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { formatCurrency } from '@/lib/utils'

interface QuotationItem {
    description: string
    quantity: number
    unitPrice: number
}

interface QuotationFormProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: {
        customerName: string
        customerEmail: string
        validUntil: string
        items: QuotationItem[]
        notes: string
        terms: string
    }) => void
}

export function QuotationForm({ isOpen, onClose, onSubmit }: QuotationFormProps) {
    const [formData, setFormData] = useState({
        customerName: '',
        customerEmail: '',
        validUntil: '',
        notes: '',
        terms: 'Pembayaran dalam 30 hari setelah invoice diterbitkan',
    })
    const [items, setItems] = useState<QuotationItem[]>([
        { description: '', quantity: 1, unitPrice: 0 },
    ])

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit({ ...formData, items })
        setFormData({ customerName: '', customerEmail: '', validUntil: '', notes: '', terms: 'Pembayaran dalam 30 hari setelah invoice diterbitkan' })
        setItems([{ description: '', quantity: 1, unitPrice: 0 }])
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Buat Quotation Baru" size="xl">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Customer Info */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Customer *</label>
                        <input
                            type="text"
                            required
                            value={formData.customerName}
                            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="PT Maju Jaya"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Customer *</label>
                        <input
                            type="email"
                            required
                            value={formData.customerEmail}
                            onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="procurement@majujaya.co.id"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Berlaku Sampai *</label>
                        <input
                            type="date"
                            required
                            value={formData.validUntil}
                            onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
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
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
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
                                        value={item.quantity}
                                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                        placeholder="Qty"
                                    />
                                </div>
                                <div className="w-40">
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={item.unitPrice || ''}
                                        onChange={(e) => updateItem(index, 'unitPrice', parseInt(e.target.value) || 0)}
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
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
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

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        Buat Quotation
                    </button>
                </div>
            </form>
        </Modal>
    )
}
