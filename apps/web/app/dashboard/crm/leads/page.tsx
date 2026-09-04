'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'
import { Download, Plus, Search, Trash2, Check, X, UserPlus } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Modal } from '@/components/ui/modal'
import { ImportModal } from '@/components/crm/import-modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'

type Lead = {
    id: string
    name: string
    company: string
    email: string
    phone: string
    source: string
    value: number
    status: string
    assignedTo: string
    createdAt: string
}

const statusStyles: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800',
    contacted: 'bg-yellow-100 text-yellow-800',
    qualified: 'bg-green-100 text-green-800',
    unqualified: 'bg-gray-100 text-gray-500',
}

const statusLabels: Record<string, string> = {
    new: 'Baru',
    contacted: 'Dihubungi',
    qualified: 'Kualifikasi',
    unqualified: 'Tidak Layak',
}

const sourceColors: Record<string, string> = {
    Website: 'bg-blue-50 text-blue-700',
    Referral: 'bg-green-50 text-green-700',
    LinkedIn: 'bg-indigo-50 text-indigo-700',
    'Google Ads': 'bg-red-50 text-red-700',
    Event: 'bg-purple-50 text-purple-700',
    'Facebook Ads': 'bg-blue-50 text-blue-700',
}

const initialFormState = {
    name: '',
    email: '',
    phone: '',
    company: '',
    source: '',
    status: 'NEW',
    value: '',
    notes: '',
}

export default function LeadsPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
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
    const handleImportComplete = () => { fetchLeads() }

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    useEffect(() => {
        fetchLeads()
    }, [])

    const fetchLeads = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/crm/leads')
            const data = await response.json()
            if (data.success) {
                setLeads(data.data)
            } else {
                setError('Gagal memuat data leads')
            }
        } catch {
            setError('Terjadi kesalahan saat memuat data')
        } finally {
            setLoading(false)
        }
    }

    const filtered = leads.filter((l) => {
        const matchStatus = filterStatus === 'all' || l.status === filterStatus
        const matchSearch = searchQuery === '' ||
            l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.company.toLowerCase().includes(searchQuery.toLowerCase())
        return matchStatus && matchSearch
    })

    const handleDelete = async (id: string) => {
        setConfirmTitle('Konfirmasi Hapus')
        setConfirmMessage('Apakah Anda yakin ingin menghapus lead ini?')
        setConfirmAction(() => async () => {
            try {
                const response = await fetch(`/api/crm/leads/${id}`, { method: 'DELETE' })
                const result = await response.json()
                if (result.success) {
                    fetchLeads()
                    setToast({ message: 'Lead berhasil dihapus', type: 'success' })
                } else {
                    setToast({ message: `Gagal menghapus: ${result.error}`, type: 'error' })
                }
            } catch {
                setToast({ message: 'Gagal menghapus lead', type: 'error' })
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
        if (form.value && isNaN(Number(form.value))) {
            errors.value = 'Nilai harus berupa angka'
        }
        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleCreateLead = async () => {
        if (!validateForm()) return
        setSubmitting(true)
        try {
            const payload: Record<string, unknown> = {
                name: form.name.trim(),
                status: form.status || 'NEW',
            }
            if (form.email.trim()) payload.email = form.email.trim()
            if (form.phone.trim()) payload.phone = form.phone.trim()
            if (form.company.trim()) payload.company = form.company.trim()
            if (form.source.trim()) payload.source = form.source.trim()
            if (form.value) payload.value = Number(form.value)
            if (form.notes.trim()) payload.notes = form.notes.trim()

            const response = await fetch('/api/crm/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const result = await response.json()
            if (result.success) {
                setShowCreateModal(false)
                setForm(initialFormState)
                fetchLeads()
                setToast({ message: 'Lead berhasil dibuat', type: 'success' })
            } else {
                setToast({ message: `Gagal membuat lead: ${result.error || 'Terjadi kesalahan'}`, type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal membuat lead', type: 'error' })
        } finally {
            setSubmitting(false)
        }
    }

    const handleImport = () => {
        setShowImportModal(true)
    }

    const stats = {
        total: leads.length,
        new: leads.filter((l) => l.status === 'new').length,
        contacted: leads.filter((l) => l.status === 'contacted').length,
        qualified: leads.filter((l) => l.status === 'qualified').length,
        totalValue: leads.reduce((sum, l) => sum + Number(l.value || 0), 0),
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
                        onClick={fetchLeads}
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
                    <h1 className="text-2xl font-bold text-gray-900">{t('crm.leads.title')}</h1>
                    <p className="text-gray-500">{t('crm.leads.subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleImport}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <Download className="h-4 w-4" />
                        {t('crm.leads.import')}
                    </button>
                    {canMutate && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" />
                            {t('crm.leads.addLead')}
                        </button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Total Leads</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Baru</p>
                    <p className="mt-1 text-2xl font-bold text-blue-600">{stats.new}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Dihubungi</p>
                    <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.contacted}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Kualifikasi</p>
                    <p className="mt-1 text-2xl font-bold text-green-600">{stats.qualified}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Total Nilai</p>
                    <p className="mt-1 text-2xl font-bold text-purple-600">{formatCurrency(stats.totalValue)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('crm.leads.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {['all', 'new', 'contacted', 'qualified', 'unqualified'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {status === 'all' ? 'Semua' : statusLabels[status] || status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Kartu lead untuk tampilan mobile */}
            <div className="md:hidden space-y-3">
                {filtered.length === 0 ? (
                    <EmptyState
                        icon={UserPlus}
                        title={t('crm.leads.empty') || 'Belum ada lead'}
                        description="Tambah lead pertama Anda untuk mulai melacak prospek penjualan"
                    />
                ) : (
                    filtered.map((lead) => (
                        <div key={lead.id} className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Link href={`/dashboard/crm/leads/${lead.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                                        {lead.name}
                                    </Link>
                                    <p className="text-sm text-gray-500">{lead.company}</p>
                                </div>
                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[lead.status] || 'bg-gray-100 text-gray-700'}`}>
                                    {statusLabels[lead.status] || lead.status}
                                </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500">{t('crm.leads.table.email')}:</span>
                                    <span className="ml-1">{lead.email}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('crm.leads.table.phone')}:</span>
                                    <span className="ml-1">{lead.phone}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('crm.leads.table.source')}:</span>
                                    <span className={`ml-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sourceColors[lead.source] || 'bg-gray-50 text-gray-700'}`}>
                                        {lead.source}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('crm.leads.table.value')}:</span>
                                    <span className="ml-1 font-medium">{formatCurrency(Number(lead.value || 0))}</span>
                                </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                                <Link href={`/dashboard/crm/leads/${lead.id}`} className="text-sm text-blue-600 hover:text-blue-800">
                                    {t('common.view') || 'Lihat'}
                                </Link>
                                <button
                                    onClick={() => handleDelete(lead.id)}
                                    className="text-sm text-red-600 hover:text-red-800"
                                >
                                    {t('common.delete') || 'Hapus'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Tabel lead untuk tampilan desktop */}
            <div className="hidden md:block rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 font-medium text-gray-500">{t('crm.leads.table.name')}</th>
                                <th className="hidden md:table-cell px-4 py-3 font-medium text-gray-500">{t('crm.leads.table.company')}</th>
                                <th className="hidden lg:table-cell px-4 py-3 font-medium text-gray-500">{t('crm.leads.table.email')}</th>
                                <th className="hidden lg:table-cell px-4 py-3 font-medium text-gray-500">{t('crm.leads.table.phone')}</th>
                                <th className="hidden md:table-cell px-4 py-3 font-medium text-gray-500">{t('crm.leads.table.source')}</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">{t('crm.leads.table.value')}</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-500">{t('crm.leads.table.status')}</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-500"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12">
                                        <EmptyState
                                            icon={UserPlus}
                                            title={t('crm.leads.empty') || 'Belum ada lead'}
                                            description="Tambah lead pertama Anda untuk mulai melacak prospek penjualan"
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-4 py-3 font-medium">
                                            <Link href={`/dashboard/crm/leads/${lead.id}`} className="text-blue-600 hover:text-blue-800">
                                                {lead.name}
                                            </Link>
                                        </td>
                                        <td className="hidden md:table-cell px-4 py-3">{lead.company}</td>
                                        <td className="hidden lg:table-cell whitespace-nowrap px-4 py-3 text-gray-500">{lead.email}</td>
                                        <td className="hidden lg:table-cell whitespace-nowrap px-4 py-3 text-gray-500">{lead.phone}</td>
                                        <td className="hidden md:table-cell px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${sourceColors[lead.source] || 'bg-gray-50 text-gray-700'}`}>
                                                {lead.source}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{formatCurrency(Number(lead.value || 0))}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[lead.status] || 'bg-gray-100 text-gray-700'}`}>
                                                {statusLabels[lead.status] || lead.status}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center">
                                            {canMutate && (
                                                <button
                                                    onClick={() => handleDelete(lead.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                    title="Hapus"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Lead Modal */}
            <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setForm(initialFormState); setFormErrors({}) }} title="Tambah Lead Baru" size="lg">
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
                            placeholder="Nama lead"
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
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Perusahaan</label>
                            <input
                                type="text"
                                name="company"
                                value={form.company}
                                onChange={handleFormChange}
                                placeholder="PT Maju Bersama"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sumber</label>
                            <select
                                name="source"
                                value={form.source}
                                onChange={handleFormChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">Pilih sumber</option>
                                <option value="Website">Website</option>
                                <option value="Referral">Referral</option>
                                <option value="LinkedIn">LinkedIn</option>
                                <option value="Google Ads">Google Ads</option>
                                <option value="Facebook Ads">Facebook Ads</option>
                                <option value="Event">Event</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                name="status"
                                value={form.status}
                                onChange={handleFormChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="NEW">Baru</option>
                                <option value="CONTACTED">Dihubungi</option>
                                <option value="QUALIFIED">Kualifikasi</option>
                                <option value="UNQUALIFIED">Tidak Layak</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nilai (Rp)</label>
                            <input
                                type="number"
                                name="value"
                                value={form.value}
                                onChange={handleFormChange}
                                placeholder="0"
                                min="0"
                                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${formErrors.value ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {formErrors.value && <p className="mt-1 text-xs text-red-500">{formErrors.value}</p>}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                        <textarea
                            name="notes"
                            value={form.notes}
                            onChange={handleFormChange}
                            rows={3}
                            placeholder="Catatan tentang lead ini..."
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
                            onClick={handleCreateLead}
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Menyimpan...' : 'Simpan Lead'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Import Modal */}
            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                type="leads"
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
