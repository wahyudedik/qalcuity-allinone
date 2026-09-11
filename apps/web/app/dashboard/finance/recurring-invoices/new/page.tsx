'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Loader2, Save } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface Contact {
    id: string
    name: string | null
    email: string | null
}

interface InvoiceItem {
    description: string
    quantity: number
    unitPrice: number
    productId?: string | null
}

const FREQUENCY_OPTIONS = [
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'BIWEEKLY', label: 'Biweekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'QUARTERLY', label: 'Quarterly' },
    { value: 'YEARLY', label: 'Yearly' },
]

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function NewRecurringInvoicePage() {
    const { t } = useTranslation()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [contacts, setContacts] = useState<Contact[]>([])

    const [form, setForm] = useState({
        contactId: '',
        frequency: 'MONTHLY',
        dayOfMonth: 1,
        dayOfWeek: 1,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        notes: '',
        taxRate: 0,
    })

    const [items, setItems] = useState<InvoiceItem[]>([
        { description: '', quantity: 1, unitPrice: 0 },
    ])

    useEffect(() => {
        fetchContacts()
    }, [])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchContacts = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/crm/contacts?limit=200')
            const data = await res.json()
            if (data.success) {
                setContacts(data.data || [])
            }
        } catch {
            // Ignore — contacts will be empty
        } finally {
            setLoading(false)
        }
    }

    const handleFormChange = (field: string, value: string | number) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    const handleItemChange = (index: number, field: string, value: string | number) => {
        setItems(prev => prev.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        ))
    }

    const addItem = () => {
        setItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0 }])
    }

    const removeItem = (index: number) => {
        if (items.length <= 1) return
        setItems(prev => prev.filter((_, i) => i !== index))
    }

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const taxAmount = subtotal * (form.taxRate / 100)
    const total = subtotal + taxAmount

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.contactId) {
            setToast({ message: 'Please select a contact first', type: 'error' })
            return
        }
        if (items.some(item => !item.description || item.quantity <= 0 || item.unitPrice <= 0)) {
            setToast({ message: 'Please fill in all items correctly', type: 'error' })
            return
        }

        try {
            setSaving(true)
            const res = await fetch('/api/finance/recurring-invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contactId: form.contactId,
                    frequency: form.frequency,
                    dayOfMonth: ['MONTHLY', 'QUARTERLY', 'YEARLY'].includes(form.frequency) ? form.dayOfMonth : undefined,
                    dayOfWeek: ['WEEKLY', 'BIWEEKLY'].includes(form.frequency) ? form.dayOfWeek : undefined,
                    startDate: form.startDate,
                    endDate: form.endDate || undefined,
                    notes: form.notes || undefined,
                    taxRate: form.taxRate,
                    items: items.map(item => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        productId: item.productId || undefined,
                    })),
                }),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: 'Recurring invoice template created successfully', type: 'success' })
                setTimeout(() => router.push('/dashboard/finance/recurring-invoices'), 1000)
            } else {
                setToast({ message: data.error || 'Failed to create template', type: 'error' })
            }
        } catch {
            setToast({ message: 'Failed to save data', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    const isWeekly = ['WEEKLY', 'BIWEEKLY'].includes(form.frequency)
    const isMonthlyPlus = ['MONTHLY', 'QUARTERLY', 'YEARLY'].includes(form.frequency)

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/finance/recurring-invoices" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Create Recurring Invoice Template</h1>
                    <p className="text-gray-600 mt-1">Create a template for automatically generated invoices</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-medium text-gray-900 mb-4">Basic Information</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact / Customer *</label>
                                <select
                                    value={form.contactId}
                                    onChange={(e) => handleFormChange('contactId', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    required
                                >
                                    <option value="">Select a contact...</option>
                                    {contacts.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ''}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Frequency *</label>
                                    <select
                                        value={form.frequency}
                                        onChange={(e) => handleFormChange('frequency', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    >
                                        {FREQUENCY_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {isWeekly && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Day of Week</label>
                                        <select
                                            value={form.dayOfWeek}
                                            onChange={(e) => handleFormChange('dayOfWeek', parseInt(e.target.value))}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        >
                                            {DAY_NAMES.map((name, idx) => (
                                                <option key={idx} value={idx}>{name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {isMonthlyPlus && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Day of Month</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={28}
                                            value={form.dayOfMonth}
                                            onChange={(e) => handleFormChange('dayOfMonth', parseInt(e.target.value) || 1)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date *</label>
                                    <input
                                        type="date"
                                        value={form.startDate}
                                        onChange={(e) => handleFormChange('startDate', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date (Optional)</label>
                                    <input
                                        type="date"
                                        value={form.endDate}
                                        onChange={(e) => handleFormChange('endDate', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium text-gray-900">Invoice Items</h3>
                            <button
                                type="button"
                                onClick={addItem}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Item
                            </button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-3 items-start p-3 bg-gray-50 rounded-lg">
                                    <div className="col-span-12 md:col-span-5">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Description *</label>
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                            placeholder="Item description"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-4 md:col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Qty *</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-5 md:col-span-3">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Unit Price *</label>
                                        <input
                                            type="number"
                                            min={0}
                                            step={100}
                                            value={item.unitPrice}
                                            onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1 flex items-end justify-center">
                                        <button
                                            type="button"
                                            onClick={() => removeItem(idx)}
                                            disabled={items.length <= 1}
                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-medium text-gray-900 mb-4">Notes</h3>
                        <textarea
                            rows={3}
                            value={form.notes}
                            onChange={(e) => handleFormChange('notes', e.target.value)}
                            placeholder="Notes for generated invoices..."
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                        />
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Summary */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-medium text-gray-900 mb-4">Summary</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="text-gray-900">Rp {subtotal.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-600">Tax</span>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.5}
                                        value={form.taxRate}
                                        onChange={(e) => handleFormChange('taxRate', parseFloat(e.target.value) || 0)}
                                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    />
                                    <span className="text-gray-500">%</span>
                                </div>
                                <span className="text-gray-900">Rp {taxAmount.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                                <span className="text-gray-900">Total</span>
                                <span className="text-blue-600">Rp {total.toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Frequency Info */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-medium text-gray-900 mb-3">Frequency Info</h3>
                        <div className="space-y-2 text-sm text-gray-600">
                            <p>Frequency: <span className="font-medium text-gray-900">{FREQUENCY_OPTIONS.find(o => o.value === form.frequency)?.label}</span></p>
                            {isWeekly && (
                                <p>Day: <span className="font-medium text-gray-900">{DAY_NAMES[form.dayOfWeek]}</span></p>
                            )}
                            {isMonthlyPlus && (
                                <p>Date: <span className="font-medium text-gray-900">{form.dayOfMonth} per period</span></p>
                            )}
                            <p>Start: <span className="font-medium text-gray-900">{form.startDate}</span></p>
                            {form.endDate && (
                                <p>End: <span className="font-medium text-gray-900">{form.endDate}</span></p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <button
                            type="submit"
                            disabled={saving || loading}
                            className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Template
                                </>
                            )}
                        </button>
                        <Link
                            href="/dashboard/finance/recurring-invoices"
                            className="w-full mt-3 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                        >
                            Cancel
                        </Link>
                    </div>
                </div>
            </form>
        </div>
    )
}
