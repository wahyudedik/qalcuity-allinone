'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { Download, Plus, Search, LayoutGrid, List, Trash2, Check, X, Users } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Modal } from '@/components/ui/modal'
import { ImportModal } from '@/components/crm/import-modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'

type Contact = {
    id: string
    name: string
    company: string
    type: string
    email: string
    phone: string
    position: string
    address: string
    notes: string
    totalDeals: number
    totalValue: number
    lastContact: string
    createdAt: string
}

const typeStyles: Record<string, string> = {
    customer: 'bg-green-100 text-green-800',
    supplier: 'bg-blue-100 text-blue-800',
    partner: 'bg-purple-100 text-purple-800',
    lead: 'bg-yellow-100 text-yellow-800',
}

const initialFormState = {
    name: '',
    email: '',
    phone: '',
    type: 'CUSTOMER',
    company: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    taxId: '',
    notes: '',
}

export default function ContactsPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
    const [contacts, setContacts] = useState<Contact[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterType, setFilterType] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null)
    const [confirmTitle, setConfirmTitle] = useState('Konfirmasi Hapus')
    const [confirmMessage, setConfirmMessage] = useState('')

    // Create modal state
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [form, setForm] = useState(initialFormState)
    const [submitting, setSubmitting] = useState(false)
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

    // Import modal state
    const [showImportModal, setShowImportModal] = useState(false)
    const handleImportComplete = () => { fetchContacts() }

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    useEffect(() => {
        fetchContacts()
    }, [])

    const fetchContacts = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/crm/contacts')
            const data = await response.json()
            if (data.success) {
                setContacts(data.data)
            } else {
                setError(t('crm.contacts.fetchError'))
            }
        } catch {
            setError(t('crm.contacts.fetchError'))
        } finally {
            setLoading(false)
        }
    }

    const filtered = contacts.filter((c) => {
        const matchType = filterType === 'all' || c.type?.toLowerCase() === filterType
        const matchSearch = searchQuery === '' ||
            (c.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (c.company?.toLowerCase() || '').includes(searchQuery.toLowerCase())
        return matchType && matchSearch
    })

    const handleDelete = async (id: string) => {
        setConfirmTitle('Konfirmasi Hapus')
        setConfirmMessage('Apakah Anda yakin ingin menghapus kontak ini?')
        setConfirmAction(() => async () => {
            try {
                const response = await fetch(`/api/crm/contacts/${id}`, { method: 'DELETE' })
                const result = await response.json()
                if (result.success) {
                    fetchContacts()
                    setToast({ message: t('crm.contacts.deleteSuccess'), type: 'success' })
                } else {
                    setToast({ message: t('crm.contacts.deleteFailed'), type: 'error' })
                }
            } catch {
                setToast({ message: t('crm.contacts.deleteFailed'), type: 'error' })
            }
        })
        setShowConfirmDialog(true)
    }

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setForm(prev => ({ ...prev, [name]: value }))
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }))
        }
    }

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {}
        if (!form.name.trim()) {
            errors.name = 'Nama wajib diisi'
        }
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            errors.email = 'Format email tidak valid'
        }
        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleCreateContact = async () => {
        if (!validateForm()) return
        setSubmitting(true)
        try {
            const payload: Record<string, unknown> = {
                name: form.name.trim(),
                type: form.type || 'CUSTOMER',
            }
            if (form.company.trim()) payload.company = form.company.trim()
            if (form.email.trim()) payload.email = form.email.trim()
            if (form.phone.trim()) payload.phone = form.phone.trim()
            if (form.address.trim()) payload.address = form.address.trim()
            if (form.city.trim()) payload.city = form.city.trim()
            if (form.province.trim()) payload.province = form.province.trim()
            if (form.postalCode.trim()) payload.postalCode = form.postalCode.trim()
            if (form.taxId.trim()) payload.taxId = form.taxId.trim()
            if (form.notes.trim()) payload.notes = form.notes.trim()

            const response = await fetch('/api/crm/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const result = await response.json()
            if (result.success) {
                setShowCreateModal(false)
                setForm(initialFormState)
                fetchContacts()
                setToast({ message: t('crm.contacts.createSuccess'), type: 'success' })
            } else {
                setToast({ message: t('crm.contacts.createFailed'), type: 'error' })
            }
        } catch {
            setToast({ message: t('crm.contacts.createFailed'), type: 'error' })
        } finally {
            setSubmitting(false)
        }
    }

    const handleImport = () => {
        setShowImportModal(true)
    }

    const stats = {
        total: contacts.length,
        customers: contacts.filter((c) => c.type === 'customer').length,
        suppliers: contacts.filter((c) => c.type === 'supplier').length,
        partners: contacts.filter((c) => c.type === 'partner').length,
        leads: contacts.filter((c) => c.type === 'lead').length,
    }

    const typeLabels: Record<string, string> = {
        customer: t('crm.contacts.typeCustomer'),
        supplier: t('crm.contacts.typeSupplier'),
        partner: t('crm.contacts.typePartner'),
        lead: t('crm.contacts.typeLead'),
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
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={fetchContacts}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('crm.contacts.title')}</h1>
                    <p className="text-gray-500">{stats.total} {t('crm.contacts.subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleImport}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <Download className="h-4 w-4" />
                        {t('crm.contacts.import')}
                    </button>
                    {canMutate && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" />
                            {t('crm.contacts.addContact')}
                        </button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{typeLabels.customer}</p>
                    <p className="mt-1 text-2xl font-bold text-green-600">{stats.customers}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{typeLabels.supplier}</p>
                    <p className="mt-1 text-2xl font-bold text-blue-600">{stats.suppliers}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{typeLabels.partner}</p>
                    <p className="mt-1 text-2xl font-bold text-purple-600">{stats.partners}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{typeLabels.lead}</p>
                    <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.leads}</p>
                </div>
            </div>

            {/* Filters & View Toggle */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('crm.contacts.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    {['all', 'customer', 'supplier', 'partner', 'lead'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterType === type
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {type === 'all' ? 'Semua' : typeLabels[type] || type}
                        </button>
                    ))}
                </div>
                <div className="flex gap-1 rounded-lg border border-gray-200 p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`rounded px-2 py-1 text-xs ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
                        title={t('crm.contacts.gridView')}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`rounded px-2 py-1 text-xs ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
                        title={t('crm.contacts.listView')}
                    >
                        <List className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
                filtered.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title={t('crm.contacts.empty')}
                        description={t('crm.contacts.emptyDescription')}
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((contact) => (
                            <Link
                                key={contact.id}
                                href={`/dashboard/crm/contacts/${contact.id}`}
                                className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                                            {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{contact.name}</p>
                                            <p className="text-sm text-gray-500">{contact.company}</p>
                                        </div>
                                    </div>
                                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${typeStyles[contact.type] || 'bg-gray-100 text-gray-700'}`}>
                                        {typeLabels[contact.type] || contact.type}
                                    </span>
                                </div>
                                <div className="mt-4 space-y-2 text-sm text-gray-600">
                                    <p>{contact.email}</p>
                                    <p>{contact.phone}</p>
                                    <p>{contact.position}</p>
                                </div>
                                {contact.totalDeals > 0 && (
                                    <div className="mt-4 border-t border-gray-100 pt-3">
                                        <p className="text-xs text-gray-500">{contact.totalDeals} {t('crm.contacts.activeDeals')}</p>
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                )
            )}

            {/* List View */}
            {viewMode === 'list' && (
                <>
                    {/* Kartu kontak untuk tampilan mobile */}
                    <div className="md:hidden space-y-3">
                        {filtered.length === 0 ? (
                            <EmptyState
                                icon={Users}
                                title={t('crm.contacts.empty')}
                                description={t('crm.contacts.emptyDescription')}
                            />
                        ) : filtered.map((contact) => (
                            <Link
                                key={contact.id}
                                href={`/dashboard/crm/contacts/${contact.id}`}
                                className="block rounded-xl border border-gray-200 bg-white p-4"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-medium text-gray-900">{contact.name}</h3>
                                        <p className="text-sm text-gray-500">{contact.company}</p>
                                    </div>
                                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${typeStyles[contact.type] || 'bg-gray-100 text-gray-700'}`}>
                                        {typeLabels[contact.type] || contact.type}
                                    </span>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-gray-500">{t('crm.contacts.table.email')}:</span>
                                        <span className="ml-1">{contact.email}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">{t('crm.contacts.table.phone')}:</span>
                                        <span className="ml-1">{contact.phone}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">{t('crm.contacts.table.position')}:</span>
                                        <span className="ml-1">{contact.position}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Tabel kontak untuk tampilan desktop */}
                    <div className="hidden md:block rounded-xl border border-gray-200 bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50">
                                        <th className="px-4 py-3 font-medium text-gray-500">{t('crm.contacts.table.name')}</th>
                                        <th className="hidden md:table-cell px-4 py-3 font-medium text-gray-500">{t('crm.contacts.table.company')}</th>
                                        <th className="hidden lg:table-cell px-4 py-3 font-medium text-gray-500">{t('crm.contacts.table.email')}</th>
                                        <th className="hidden lg:table-cell px-4 py-3 font-medium text-gray-500">{t('crm.contacts.table.phone')}</th>
                                        <th className="hidden md:table-cell px-4 py-3 font-medium text-gray-500">{t('crm.contacts.table.type')}</th>
                                        <th className="hidden lg:table-cell px-4 py-3 font-medium text-gray-500">{t('crm.contacts.table.position')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-12">
                                                <EmptyState
                                                    icon={Users}
                                                    title={t('crm.contacts.empty')}
                                                    description={t('crm.contacts.emptyDescription')}
                                                />
                                            </td>
                                        </tr>
                                    ) : filtered.map((contact) => (
                                        <tr key={contact.id} className="cursor-pointer hover:bg-gray-50">
                                            <td className="whitespace-nowrap px-4 py-3">
                                                <Link href={`/dashboard/crm/contacts/${contact.id}`} className="font-medium text-blue-600 hover:underline">
                                                    {contact.name}
                                                </Link>
                                            </td>
                                            <td className="hidden md:table-cell px-4 py-3">{contact.company}</td>
                                            <td className="hidden lg:table-cell whitespace-nowrap px-4 py-3 text-gray-500">{contact.email}</td>
                                            <td className="hidden lg:table-cell whitespace-nowrap px-4 py-3 text-gray-500">{contact.phone}</td>
                                            <td className="hidden md:table-cell px-4 py-3">
                                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${typeStyles[contact.type] || 'bg-gray-100 text-gray-700'}`}>
                                                    {typeLabels[contact.type] || contact.type}
                                                </span>
                                            </td>
                                            <td className="hidden lg:table-cell px-4 py-3 text-gray-500">{contact.position}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Create Contact Modal */}
            <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setForm(initialFormState); setFormErrors({}) }} title="Tambah Kontak Baru" size="lg">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nama <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleFormChange}
                            placeholder="Nama kontak"
                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${formErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleFormChange}
                                placeholder="email@contoh.com"
                                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${formErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {formErrors.email && <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
                            <input
                                type="text"
                                name="phone"
                                value={form.phone}
                                onChange={handleFormChange}
                                placeholder="08123456789"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Perusahaan</label>
                        <input
                            type="text"
                            name="company"
                            value={form.company}
                            onChange={handleFormChange}
                            placeholder="PT Nama Perusahaan"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Kontak</label>
                        <select
                            name="type"
                            value={form.type}
                            onChange={handleFormChange}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="CUSTOMER">Pelanggan</option>
                            <option value="SUPPLIER">Pemasok</option>
                            <option value="PARTNER">Mitra</option>
                            <option value="LEAD">Prospek</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                        <textarea
                            name="address"
                            value={form.address}
                            onChange={handleFormChange}
                            rows={2}
                            placeholder="Alamat lengkap"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kota</label>
                            <input
                                type="text"
                                name="city"
                                value={form.city}
                                onChange={handleFormChange}
                                placeholder="Jakarta"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Provinsi</label>
                            <input
                                type="text"
                                name="province"
                                value={form.province}
                                onChange={handleFormChange}
                                placeholder="DKI Jakarta"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kode Pos</label>
                            <input
                                type="text"
                                name="postalCode"
                                value={form.postalCode}
                                onChange={handleFormChange}
                                placeholder="12345"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">NPWP</label>
                            <input
                                type="text"
                                name="taxId"
                                value={form.taxId}
                                onChange={handleFormChange}
                                placeholder="00.000.000.0-000.000"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                        <textarea
                            name="notes"
                            value={form.notes}
                            onChange={handleFormChange}
                            rows={3}
                            placeholder="Catatan tentang kontak ini..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            onClick={() => { setShowCreateModal(false); setForm(initialFormState); setFormErrors({}) }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleCreateContact}
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Menyimpan...' : 'Simpan Kontak'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Import Modal */}
            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                type="contacts"
                onImportComplete={handleImportComplete}
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
