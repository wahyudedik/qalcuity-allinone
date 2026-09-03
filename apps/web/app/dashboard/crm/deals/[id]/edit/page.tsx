'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

interface DealData {
    id: string
    name: string
    company: string
    contactName: string
    contactId: string
    value: number
    currency: string
    stage: string
    probability: number
    expectedCloseDate: string
    notes: string
}

const stageOptions = [
    { value: 'DISCOVERY', label: 'Discovery' },
    { value: 'PROPOSAL', label: 'Proposal' },
    { value: 'NEGOTIATION', label: 'Negotiation' },
    { value: 'CLOSING', label: 'Closing' },
    { value: 'CLOSED_WON', label: 'Closed Won' },
    { value: 'CLOSED_LOST', label: 'Closed Lost' },
]

export default function DealEditPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [deal, setDeal] = useState<DealData | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    const [formData, setFormData] = useState({
        title: '',
        value: '',
        stage: 'DISCOVERY',
        probability: '50',
        closeDate: '',
        notes: '',
        contactId: '',
    })

    useEffect(() => {
        const fetchDeal = async () => {
            try {
                setLoading(true)
                const res = await fetch(`/api/crm/deals/${params.id}`)
                const data = await res.json()
                if (data.success) {
                    const d = data.data
                    setDeal(d)
                    setFormData({
                        title: d.name || '',
                        value: d.value ? String(d.value) : '',
                        stage: d.stage || 'DISCOVERY',
                        probability: d.probability ? String(d.probability) : '50',
                        closeDate: d.expectedCloseDate || '',
                        notes: d.notes || '',
                        contactId: d.contactId || '',
                    })
                } else {
                    setError('Deal tidak ditemukan')
                }
            } catch {
                setError('Gagal memuat data deal')
            } finally {
                setLoading(false)
            }
        }
        fetchDeal()
    }, [params.id])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title.trim()) {
            setToast({ message: 'Judul deal wajib diisi', type: 'error' })
            return
        }

        setSaving(true)
        try {
            const res = await fetch(`/api/crm/deals/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    value: formData.value ? Number(formData.value) : undefined,
                    stage: formData.stage,
                    probability: formData.probability ? Number(formData.probability) : undefined,
                    closeDate: formData.closeDate || null,
                    notes: formData.notes || null,
                    contactId: formData.contactId || null,
                }),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: 'Deal berhasil diperbarui', type: 'success' })
                setTimeout(() => {
                    router.push(`/dashboard/crm/deals/${params.id}`)
                }, 1000)
            } else {
                setToast({ message: data.error || 'Gagal memperbarui deal', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal memperbarui deal', type: 'error' })
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

    if (error || !deal) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500">{error || 'Deal tidak ditemukan'}</p>
                <Link href="/dashboard/crm/deals" className="mt-4 text-blue-600 hover:underline">
                    Kembali ke Deals
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
            <Link href={`/dashboard/crm/deals/${params.id}`} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Detail Deal
            </Link>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Edit Deal</h1>
                <p className="text-gray-500">Perbarui informasi deal</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="max-w-2xl">
                <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
                    {/* Title */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Judul Deal *</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Contoh: Penjualan Software ke PT ABC"
                        />
                    </div>

                    {/* Value & Stage */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Nilai Deal (Rp)</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.value}
                                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Stage</label>
                            <select
                                value={formData.stage}
                                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {stageOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Probability & Close Date */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Probabilitas (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={formData.probability}
                                onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Tanggal Close Estimasi</label>
                            <input
                                type="date"
                                value={formData.closeDate}
                                onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Catatan</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={4}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Catatan tambahan tentang deal ini..."
                        />
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
                        href={`/dashboard/crm/deals/${params.id}`}
                        className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Batal
                    </Link>
                </div>
            </form>
        </div>
    )
}
