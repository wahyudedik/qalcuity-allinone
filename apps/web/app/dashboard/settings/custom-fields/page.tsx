'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { FileText, Plus, Trash2, Loader2, CheckCircle, X, GripVertical, Type, Hash, Calendar, ToggleLeft, List } from 'lucide-react'

type CustomField = {
    id: string
    tenantId: string
    entity: string
    fieldName: string
    fieldLabel: string
    fieldType: string
    required: boolean
    options: string[] | null
    defaultValue: string | null
    sortOrder: number
    isActive: boolean
    createdAt: string
    updatedAt: string
}

const ENTITY_OPTIONS = [
    { value: 'product', label: 'Product' },
    { value: 'invoice', label: 'Invoice' },
    { value: 'quotation', label: 'Quotation' },
    { value: 'purchase_order', label: 'Purchase Order' },
    { value: 'contact', label: 'Contact' },
    { value: 'lead', label: 'Lead' },
    { value: 'employee', label: 'Employee' },
    { value: 'customer', label: 'Customer' },
]

const FIELD_TYPE_OPTIONS = [
    { value: 'text', label: 'Text', icon: Type },
    { value: 'number', label: 'Number', icon: Hash },
    { value: 'date', label: 'Date', icon: Calendar },
    { value: 'select', label: 'Select', icon: List },
    { value: 'boolean', label: 'Boolean', icon: ToggleLeft },
]

const FIELD_TYPE_ICONS: Record<string, typeof Type> = {
    text: Type,
    number: Hash,
    date: Calendar,
    select: List,
    boolean: ToggleLeft,
}

export default function CustomFieldsSettingsPage() {
    const { t } = useTranslation()
    const [fields, setFields] = useState<CustomField[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [filterEntity, setFilterEntity] = useState<string>('')
    const [deleting, setDeleting] = useState<string | null>(null)
    const [creating, setCreating] = useState(false)

    const [newField, setNewField] = useState({
        entity: 'product',
        fieldName: '',
        fieldLabel: '',
        fieldType: 'text',
        required: false,
        options: '',
        defaultValue: '',
    })

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchFields = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const url = filterEntity ? `/api/settings/custom-fields?entity=${filterEntity}` : '/api/settings/custom-fields'
            const res = await fetch(url)
            const data = await res.json()
            if (data.success) {
                setFields(data.data)
            } else {
                setError(data.error || 'Gagal memuat custom fields')
            }
        } catch {
            setError('Gagal terhubung ke server')
        } finally {
            setLoading(false)
        }
    }, [filterEntity])

    useEffect(() => {
        fetchFields()
    }, [fetchFields])

    const handleCreate = async () => {
        if (!newField.fieldName.trim() || !newField.fieldLabel.trim()) {
            setToast({ message: 'Nama field dan label wajib diisi', type: 'error' })
            return
        }

        setCreating(true)
        try {
            const body: Record<string, unknown> = {
                entity: newField.entity,
                fieldName: newField.fieldName.trim().toLowerCase().replace(/\s+/g, '_'),
                fieldLabel: newField.fieldLabel.trim(),
                fieldType: newField.fieldType,
                required: newField.required,
            }

            if (newField.fieldType === 'select' && newField.options) {
                body.options = newField.options.split(',').map(o => o.trim()).filter(Boolean)
            }

            if (newField.defaultValue) {
                body.defaultValue = newField.defaultValue
            }

            const res = await fetch('/api/settings/custom-fields', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: 'Custom field berhasil dibuat', type: 'success' })
                setShowCreateModal(false)
                setNewField({ entity: 'product', fieldName: '', fieldLabel: '', fieldType: 'text', required: false, options: '', defaultValue: '' })
                fetchFields()
            } else {
                setToast({ message: data.error || 'Gagal membuat custom field', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal terhubung ke server', type: 'error' })
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async (fieldId: string, fieldLabel: string) => {
        if (!confirm(`Hapus custom field "${fieldLabel}"?`)) return

        setDeleting(fieldId)
        try {
            const res = await fetch(`/api/settings/custom-fields/${fieldId}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                setToast({ message: `Custom field "${fieldLabel}" berhasil dihapus`, type: 'success' })
                fetchFields()
            } else {
                setToast({ message: data.error || 'Gagal menghapus custom field', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal terhubung ke server', type: 'error' })
        } finally {
            setDeleting(null)
        }
    }

    // Group fields by entity
    const groupedFields = fields.reduce((acc, field) => {
        if (!acc[field.entity]) acc[field.entity] = []
        acc[field.entity].push(field)
        return acc
    }, {} as Record<string, CustomField[]>)

    const entityLabels: Record<string, string> = {}
    ENTITY_OPTIONS.forEach(e => { entityLabels[e.value] = e.label })

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-96"></div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-12 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8">
                <div className="flex flex-col items-center text-center">
                    <FileText className="h-12 w-12 text-red-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Gagal Memuat Custom Fields</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button onClick={fetchFields} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Coba Lagi
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <X className="h-5 w-5" />}
                    <span className="text-sm font-medium">{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Custom Fields</h2>
                    <p className="text-gray-600 mt-1">Kelola field kustom untuk setiap entitas bisnis</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Tambah Field
                </button>
            </div>

            {/* Filter */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Filter Entitas:</span>
                    <select
                        value={filterEntity}
                        onChange={e => setFilterEntity(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">Semua Entitas</option>
                        {ENTITY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Fields List */}
            {fields.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Custom Fields</h3>
                    <p className="text-gray-600 mb-4">Tambahkan field kustom untuk menyesuaikan data dengan kebutuhan bisnis Anda.</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-4 w-4 inline mr-1" />
                        Tambah Field Pertama
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(groupedFields).map(([entity, entityFields]) => (
                        <div key={entity} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                                <h3 className="font-semibold text-gray-900">{entityLabels[entity] || entity}</h3>
                                <p className="text-sm text-gray-500">{entityFields.length} field</p>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {entityFields.map(field => {
                                    const FieldIcon = FIELD_TYPE_ICONS[field.fieldType] || Type
                                    return (
                                        <div key={field.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <GripVertical className="h-4 w-4 text-gray-300" />
                                                <div className="p-1.5 rounded bg-gray-100">
                                                    <FieldIcon className="h-4 w-4 text-gray-600" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-gray-900 text-sm">{field.fieldLabel}</span>
                                                        <span className="text-xs text-gray-400">({field.fieldName})</span>
                                                        {field.required && (
                                                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded font-medium">Wajib</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs text-gray-500">{field.fieldType}</span>
                                                        {field.options && (
                                                            <span className="text-xs text-gray-400">• Opsi: {field.options.join(', ')}</span>
                                                        )}
                                                        {field.defaultValue && (
                                                            <span className="text-xs text-gray-400">• Default: {field.defaultValue}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(field.id, field.fieldLabel)}
                                                disabled={deleting === field.id}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {deleting === field.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Tambah Custom Field</h3>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                            {/* Entity */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Entitas *</label>
                                <select
                                    value={newField.entity}
                                    onChange={e => setNewField(prev => ({ ...prev, entity: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {ENTITY_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Field Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Field (ID) *</label>
                                <input
                                    type="text"
                                    value={newField.fieldName}
                                    onChange={e => setNewField(prev => ({ ...prev, fieldName: e.target.value }))}
                                    placeholder="contoh: warna_produk"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Field Label */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
                                <input
                                    type="text"
                                    value={newField.fieldLabel}
                                    onChange={e => setNewField(prev => ({ ...prev, fieldLabel: e.target.value }))}
                                    placeholder="contoh: Warna Produk"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Field Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Field *</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {FIELD_TYPE_OPTIONS.map(opt => {
                                        const Icon = opt.icon
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => setNewField(prev => ({ ...prev, fieldType: opt.value }))}
                                                className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${newField.fieldType === opt.value
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <Icon className={`h-5 w-5 ${newField.fieldType === opt.value ? 'text-blue-600' : 'text-gray-400'}`} />
                                                <span className={`text-xs font-medium ${newField.fieldType === opt.value ? 'text-blue-700' : 'text-gray-600'}`}>
                                                    {opt.label}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Options (for select type) */}
                            {newField.fieldType === 'select' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Opsi (pisahkan dengan koma)</label>
                                    <input
                                        type="text"
                                        value={newField.options}
                                        onChange={e => setNewField(prev => ({ ...prev, options: e.target.value }))}
                                        placeholder="Merah, Biru, Hijau"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            )}

                            {/* Default Value */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Default Value</label>
                                <input
                                    type="text"
                                    value={newField.defaultValue}
                                    onChange={e => setNewField(prev => ({ ...prev, defaultValue: e.target.value }))}
                                    placeholder="Opsional"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Required */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={newField.required}
                                    onChange={e => setNewField(prev => ({ ...prev, required: e.target.checked }))}
                                    className="h-4 w-4 text-blue-600 rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">Wajib diisi</span>
                            </label>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={creating || !newField.fieldName.trim() || !newField.fieldLabel.trim()}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                                Tambah Field
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
