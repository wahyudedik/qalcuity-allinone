'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface LeadDetail {
    id: string
    name: string
    email: string
    phone: string
    company: string
    source: string
    status: string
    score: number
    notes: string
    createdAt: string
    activities: Array<{ date: string; type: string; description: string }>
}

const statusConfig: Record<string, { label: string; color: string }> = {
    new: { label: 'Baru', color: 'bg-blue-100 text-blue-800' },
    contacted: { label: 'Dihubungi', color: 'bg-yellow-100 text-yellow-800' },
    qualified: { label: 'Kualifikasi', color: 'bg-green-100 text-green-800' },
    unqualified: { label: 'Tidak Kualifikasi', color: 'bg-red-100 text-red-800' },
}

const activityTypeIcons: Record<string, string> = {
    call: '📞',
    email: '📧',
    meeting: '🤝',
    note: '📝',
    form: '📋',
}

export default function LeadDetailPage({ params }: { params: { id: string } }) {
    const [lead, setLead] = useState<LeadDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchLead = async () => {
            try {
                const response = await fetch(`/api/crm/leads/${params.id}`)
                const data = await response.json()
                if (data.success) {
                    setLead(data.data)
                } else {
                    setError('Lead tidak ditemukan')
                }
            } catch {
                setError('Gagal memuat data lead')
            } finally {
                setLoading(false)
            }
        }
        fetchLead()
    }, [params.id])

    if (loading) {
        return (
            <div className="p-6">
                <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
                <div className="mt-4 h-48 animate-pulse rounded-xl bg-gray-100" />
            </div>
        )
    }

    if (error || !lead) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <p className="text-lg text-gray-600">{error || 'Data tidak tersedia'}</p>
                    <Link href="/dashboard/crm/leads" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
                        ← Kembali ke Leads
                    </Link>
                </div>
            </div>
        )
    }

    const statusInfo = statusConfig[lead.status] || { label: lead.status, color: 'bg-gray-100 text-gray-800' }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div>
                <Link href="/dashboard/crm/leads" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                    ← Kembali ke Leads
                </Link>
                <div className="mt-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
                        <p className="text-sm text-gray-500">{lead.company}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                        </span>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Skor</p>
                            <p className="text-2xl font-bold text-gray-900">{lead.score}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Contact Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Informasi Kontak</h3>
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium text-gray-900">{lead.email}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Telepon</p>
                                <p className="font-medium text-gray-900">{lead.phone}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Perusahaan</p>
                                <p className="font-medium text-gray-900">{lead.company}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Sumber</p>
                                <p className="font-medium text-gray-900">{lead.source}</p>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {lead.notes && (
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h3 className="text-lg font-semibold text-gray-900">Catatan</h3>
                            <p className="mt-4 text-sm text-gray-700">{lead.notes}</p>
                        </div>
                    )}

                    {/* Activities */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Aktivitas</h3>
                        {lead.activities.length > 0 ? (
                            <div className="mt-4 space-y-4">
                                {lead.activities.map((activity, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        <span className="text-lg">{activityTypeIcons[activity.type] || '📝'}</span>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                                            <p className="text-xs text-gray-500">{formatDate(activity.date)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-4 text-sm text-gray-500">Belum ada aktivitas</p>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Quick Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Detail</h3>
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">ID Lead</span>
                                <span className="font-mono text-sm text-gray-900">{lead.id}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Tanggal Dibuat</span>
                                <span className="text-sm text-gray-900">{formatDate(lead.createdAt)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Sumber</span>
                                <span className="text-sm text-gray-900">{lead.source}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Aksi</h3>
                        <div className="mt-4 space-y-3">
                            <button className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                                📞 Hubungi Lead
                            </button>
                            <button className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                📧 Kirim Email
                            </button>
                            <button className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                🤝 Jadwalkan Meeting
                            </button>
                            <button className="w-full rounded-lg border border-green-200 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50">
                                ✅ Konversi ke Deal
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
