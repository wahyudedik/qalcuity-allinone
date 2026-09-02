'use client'

import { useState } from 'react'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { formatCurrency } from '@/lib/utils'
import { createPurchaseOrderSchema } from '@/lib/validation-schemas'

interface POItem {
    description: string
    quantity: number
    unitPrice: number
}

interface PurchaseOrderFormProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: {
        supplierName: string
        supplierEmail: string
        expectedDelivery: string
        items: POItem[]
        notes: string
    }) => void
}

export function PurchaseOrderForm({ isOpen, onClose, onSubmit }: PurchaseOrderFormProps) {
    const [formData, setFormData] = useState({
        supplierName: '',
        supplierEmail: '',
        expectedDelivery: '',
        notes: '',
    })
    const [items, setItems] = useState<POItem[]>([
        { description: '', quantity: 1, unitPrice: 0 },
    ])
    const [formError, setFormError] = useState<string | null>(null)

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, unitPrice: 0 }])
    }

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index))
        }
    }

    const updateItem = (index: number, field: keyof POItem, value: string | number) => {
        const newItems = [...items]
        newItems[index] = { ...newItems[index], [field]: value }
        setItems(newItems)
    }

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const ppn = subtotal * 0.11
    const total = subtotal + ppn

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Client-side Zod validation
        try {
            createPurchaseOrderSchema.parse({
                supplierName: formData.supplierName || undefined,
                supplierEmail: formData.supplierEmail || undefined,
                expectedDelivery: formData.expectedDelivery || undefined,
                notes: formData.notes || undefined,
                items: items.map(item => ({
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                })),
            })
        } catch (error) {
            if (error instanceof z.ZodError) {
                const firstError = error.issues[0]
                setFormError(firstError.message)
                return
            }
        }

        onSubmit({ ...formData, items })
        setFormData({ supplierName: '', supplierEmail: '', expectedDelivery: '', notes: '' })
        setItems([{ description: '', quantity: 1, unitPrice: 0 }])
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Buat Purchase Order Baru" size="xl">
            <form onSubmit={handleSubmit} className="space-y-6">
                {formError && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <span>{formError}</span>
                        <button type="button" onClick={() => setFormError(null)} className="ml-auto text-red-500 hover:text-red-700">&times;</button>
                    </div>
                )}
                {/* Supplier Info */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Supplier *</label>
                        <input
                            type="text"
                            required
                            value={formData.supplierName}
                            onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="PT Supplier Berkah"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Supplier *</label>
                        <input
                            type="email"
                            required
                            value={formData.supplierEmail}
                            onChange={(e) => setFormData({ ...formData, supplierEmail: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="order@supplierberkah.co.id"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Estimasi Pengiriman *</label>
                        <input
                            type="date"
                            required
                            value={formData.expectedDelivery}
                            onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Items */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700">Item yang Dipesan</label>
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

                {/* Notes */}
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
                        Buat Purchase Order
                    </button>
                </div>
            </form>
        </Modal>
    )
}
