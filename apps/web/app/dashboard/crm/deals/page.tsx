'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Trash2, Check, X, TrendingUp } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'

type Deal = {
    id: string
    title: string
    value: number
    stage: string
    probability: number
    closeDate: string | null
    notes: string | null
    contactName?: string
    contactId?: string | null
    createdAt: string
}

const stageStyles: Record<string, string> = {
    DISCOVERY: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    PROPOSAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    NEGOTIATION: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    CLOSING: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    CLOSED_WON: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    CLOSED_LOST: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const filterStages = ['all', 'DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'CLOSING']

const stageProbabilities: Record<string, number> = {
    DISCOVERY: 10,
    PROPOSAL: 30,
    NEGOTIATION: 50,
    CLOSING: 75,
    CLOSED_WON: 100,
    CLOSED_LOST: 0,
}

const initialFormState = {
    title: '',
    value: '',
    stage: 'DISCOVERY',
    closeDate: '',
    notes: '',
    contactId: '',
}

export default function DealsPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
    const [deals, setDeals] = useState<Deal[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterStage, setFilterStage] = useState<string>('all')
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

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    useEffect(() => {
        fetchDeals()
    }, [])

    const fetchDeals = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/crm/deals')
            const data = await response.json()
            if (data.success) {
                setDeals(data.data)
            } else {
                setError(t('common.error'))
            }
        } catch {
            setError(t('common.error'))
        } finally {
            setLoading(false)
        }
    }

    const filtered = deals.filter((d) => {
        const matchStage = filterStage === 'all' || d.stage === filterStage
        const matchSearch = searchQuery === '' ||
            d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (d.contactName || '').toLowerCase().includes(searchQuery.toLowerCase())
        return matchStage && matchSearch
    })

    const handleDelete = async (id: string) => {
        setConfirmTitle('Konfirmasi Hapus')
        setConfirmMessage('Apakah Anda yakin ingin menghapus deal ini?')
        setConfirmAction(() => async () => {
            try {
                const response = await fetch(`/api/crm/deals/${id}`, { method: 'DELETE' })
                const result = await response.json()
                if (result.success) {
                    fetchDeals()
                    setToast({ message: 'Deal berhasil dihapus', type: 'success' })
                } else {
                    setToast({ message: `Gagal menghapus: ${result.error}`, type: 'error' })
                }
            } catch {
                setToast({ message: 'Gagal menghapus deal', type: 'error' })
            }
        })
        setShowConfirmDialog(true)
    }

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setForm(prev => {
            const updated = { ...prev, [name]: value }
            // Auto-set probability based on stage
            if (name === 'stage' && stageProbabilities[value] !== undefined) {
                // Keep current probability if user has manually set it
            }
            return updated
        })
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }))
        }
    }

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {}
        if (!form.title.trim()) {
            errors.title = 'Judul deal wajib diisi'
        }
        if (form.value && isNaN(Number(form.value))) {
            errors.value = 'Nilai harus berupa angka'
        }
        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleCreateDeal = async () => {
        if (!validateForm()) return
        setSubmitting(true)
        try {
            const payload: Record<string, unknown> = {
                title: form.title.trim(),
                stage: form.stage || 'DISCOVERY',
                probability: stageProbabilities[form.stage] || 10,
            }
            if (form.value) payload.value = Number(form.value)
            if (form.closeDate) payload.closeDate = form.closeDate
            if (form.notes.trim()) payload.notes = form.notes.trim()
            if (form.contactId.trim()) payload.contactId = form.contactId.trim()

            const response = await fetch('/api/crm/deals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const result = await response.json()
            if (result.success) {
                setShowCreateModal(false)
                setForm(initialFormState)
                fetchDeals()
                setToast({ message: 'Deal berhasil dibuat', type: 'success' })
            } else {
                setToast({ message: `Gagal membuat deal: ${result.error || 'Terjadi kesalahan'}`, type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal membuat deal', type: 'error' })
        } finally {
            setSubmitting(false)
        }
    }

    const totalValue = deals.reduce((s, d) => s + Number(d.value), 0)
    const weightedValue = deals.reduce((s, d) => s + (Number(d.value) * d.probability / 100), 0)
    const avgWinProb = deals.length > 0 ? Math.round(deals.reduce((s, d) => s + d.probability, 0) / deals.length) : 0

    const getStageLabel = (stage: string) => t(`crm.deals.stages.${stage}`)

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
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={fetchDeals}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        {t('common.retry')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('crm.deals.title')}</h1>
                    <p className="text-gray-500">{deals.length} {t('crm.deals.subtitle')} · {t('crm.deals.totalValue')}: {formatCurrency(totalValue)}</p>
                </div>
                {canMutate && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        {t('crm.deals.newDeal')}
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('crm.deals.totalDeals')}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{deals.length}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('crm.deals.totalValue')}</p>
                    <p className="mt-1 text-xl font-bold text-green-600">{formatCurrency(totalValue)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('crm.deals.weightedValue')}</p>
                    <p className="mt-1 text-xl font-bold text-blue-600">{formatCurrency(weightedValue)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('crm.deals.avgWinProb')}</p>
                    <p className="mt-1 text-2xl font-bold text-purple-600">{avgWinProb}%</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center dark:border-gray-700 dark:bg-gray-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('crm.deals.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto">
                    {filterStages.map((stage) => (
                        <button
                            key={stage}
                            onClick={() => setFilterStage(stage)}
                            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterStage === stage
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                                }`}
                        >
                            {stage === 'all' ? t('crm.deals.filterAll') : getStageLabel(stage)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Kartu deal untuk tampilan mobile */}
            <div className="md:hidden space-y-3">
                {filtered.length === 0 ? (
                    <EmptyState
                        icon={TrendingUp}
                        title={t('crm.deals.empty') || 'Belum ada deal'}
                        description="Buat deal pertama Anda untuk mulai melacak penjualan"
                    />
                ) : (
                    filtered.map((deal) => (
                        <div key={deal.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Link href={`/dashboard/crm/deals/${deal.id}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                                        {deal.title}
                                    </Link>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{deal.contactName || '-'}</p>
                                </div>
                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${stageStyles[deal.stage] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
                                    {getStageLabel(deal.stage)}
                                </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">{t('crm.deals.table.value')}:</span>
                                    <span className="ml-1 font-medium text-gray-900 dark:text-white">{formatCurrency(Number(deal.value))}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">{t('crm.deals.table.winProb')}:</span>
                                    <span className="ml-1">{deal.probability}%</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">{t('crm.deals.table.weighted')}:</span>
                                    <span className="ml-1 font-medium text-green-600">{formatCurrency(Number(deal.value) * deal.probability / 100)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">{t('crm.deals.table.expectedClose')}:</span>
                                    <span className="ml-1">{deal.closeDate ? formatDate(deal.closeDate) : '-'}</span>
                                </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                                <Link href={`/dashboard/crm/deals/${deal.id}`} className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                                    {t('common.view') || 'Lihat'}
                                </Link>
                                <button
                                    onClick={() => handleDelete(deal.id)}
                                    className="text-sm text-red-600 hover:text-red-800 dark:text-red-400"
                                >
                                    {t('common.delete') || 'Hapus'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Tabel deal untuk tampilan desktop */}
            <div className="hidden md:block rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('crm.deals.table.name')}</th>
                                <th className="hidden md:table-cell px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('crm.deals.table.company')}</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">{t('crm.deals.table.value')}</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">{t('crm.deals.table.stage')}</th>
                                <th className="hidden lg:table-cell px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">{t('crm.deals.table.winProb')}</th>
                                <th className="hidden lg:table-cell px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">{t('crm.deals.table.weighted')}</th>
                                <th className="hidden md:table-cell px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('crm.deals.table.expectedClose')}</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12">
                                        <EmptyState
                                            icon={TrendingUp}
                                            title={t('crm.deals.empty') || 'Belum ada deal'}
                                            description="Buat deal pertama Anda untuk mulai melacak penjualan"
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((deal) => (
                                    <tr key={deal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <Link href={`/dashboard/crm/deals/${deal.id}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                                                {deal.title}
                                            </Link>
                                        </td>
                                        <td className="hidden md:table-cell px-4 py-3 text-gray-600 dark:text-gray-400">{deal.contactName || '-'}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(Number(deal.value))}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${stageStyles[deal.stage] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
                                                {getStageLabel(deal.stage)}
                                            </span>
                                        </td>
                                        <td className="hidden lg:table-cell whitespace-nowrap px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="h-2 w-16 rounded-full bg-gray-200 dark:bg-gray-600">
                                                    <div
                                                        className="h-full rounded-full bg-blue-500"
                                                        style={{ width: `${deal.probability}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{deal.probability}%</span>
                                            </div>
                                        </td>
                                        <td className="hidden lg:table-cell whitespace-nowrap px-4 py-3 text-center font-medium text-green-600">
                                            {formatCurrency(Number(deal.value) * deal.probability / 100)}
                                        </td>
                                        <td className="hidden md:table-cell whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">{deal.closeDate ? formatDate(deal.closeDate) : '-'}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center">
                                            {canMutate && (
                                                <button
                                                    onClick={() => handleDelete(deal.id)}
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

            {/* Create Deal Modal */}
            <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setForm(initialFormState); setFormErrors({}) }} title="Tambah Deal Baru" size="lg">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Judul Deal <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="title"
                            value={form.title}
                            onChange={handleFormChange}
                            placeholder="Judul deal"
                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${formErrors.title ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {formErrors.title && <p className="mt-1 text-xs text-red-500">{formErrors.title}</p>}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nilai Deal (Rp)</label>
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                            <select
                                name="stage"
                                value={form.stage}
                                onChange={handleFormChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="DISCOVERY">Discovery</option>
                                <option value="PROPOSAL">Proposal</option>
                                <option value="NEGOTIATION">Negosiasi</option>
                                <option value="CLOSING">Closing</option>
                                <option value="CLOSED_WON">Deal Won</option>
                                <option value="CLOSED_LOST">Deal Lost</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Target Closing</label>
                            <input
                                type="date"
                                name="closeDate"
                                value={form.closeDate}
                                onChange={handleFormChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact ID (opsional)</label>
                            <input
                                type="text"
                                name="contactId"
                                value={form.contactId}
                                onChange={handleFormChange}
                                placeholder="ID kontak terkait"
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
                            placeholder="Catatan tentang deal ini..."
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
                            onClick={handleCreateDeal}
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Menyimpan...' : 'Simpan Deal'}
                        </button>
                    </div>
                </div>
            </Modal>

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
