'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface DealDetail {
    id: string
    name: string
    company: string
    contactName: string
    value: number
    currency: string
    stage: string
    probability: number
    expectedCloseDate: string
    createdAt: string
    notes: string
    activities: Array<{ date: string; type: string; description: string }>
}

const stageConfig: Record<string, { label: string; color: string }> = {
    Discovery: { label: 'Discovery', color: 'bg-gray-100 text-gray-700' },
    Proposal: { label: 'Proposal', color: 'bg-blue-100 text-blue-700' },
    Negosiasi: { label: 'Negosiasi', color: 'bg-yellow-100 text-yellow-700' },
    Closing: { label: 'Closing', color: 'bg-green-100 text-green-700' },
}

export default function DealDetailPage({ params }: { params: { id: string } }) {
    const [deal, setDeal] = useState<DealDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchDeal = async () => {
            try {
                setLoading(true)
                const res = await fetch(`/api/crm/deals/${params.id}`)
                const data = await res.json()
                if (data.success) {
                    setDeal(data.data)
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

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
                <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
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

    const weightedValue = deal.value * (deal.probability / 100)

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Link href="/dashboard/crm/deals" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Kembali ke Deals
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{deal.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stageConfig[deal.stage]?.color || 'bg-gray-100 text-gray-700'}`}>
                            {stageConfig[deal.stage]?.label || deal.stage}
                        </span>
                        <span className="text-sm text-gray-500">• {deal.company}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Edit
                    </button>
                    <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                        Menang Deal
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="text-sm text-gray-500">Nilai Deal</div>
                            <div className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(deal.value)}</div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="text-sm text-gray-500">Probabilitas</div>
                            <div className="mt-1 text-xl font-bold text-blue-600">{deal.probability}%</div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="text-sm text-gray-500">Weighted Value</div>
                            <div className="mt-1 text-xl font-bold text-green-600">{formatCurrency(weightedValue)}</div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="text-sm text-gray-500">Est. Close</div>
                            <div className="mt-1 text-xl font-bold text-gray-900">{deal.expectedCloseDate}</div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Catatan</h2>
                        <p className="text-sm text-gray-600">{deal.notes}</p>
                    </div>

                    {/* Activities */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Aktivitas</h2>
                        <div className="space-y-4">
                            {deal.activities.map((activity, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                    <div className="mt-1 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                                        {activity.type === 'call' && '📞'}
                                        {activity.type === 'email' && '📧'}
                                        {activity.type === 'meeting' && '🤝'}
                                        {activity.type === 'task' && '📋'}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-900">{activity.description}</p>
                                        <p className="text-xs text-gray-500">{activity.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="mt-4 text-sm text-blue-600 hover:text-blue-700">+ Tambah Aktivitas</button>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Deal Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Informasi Deal</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-gray-500">Perusahaan</p>
                                <p className="text-sm font-medium text-gray-900">{deal.company}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Kontak</p>
                                <p className="text-sm font-medium text-gray-900">{deal.contactName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Stage</p>
                                <p className="text-sm font-medium text-gray-900">{deal.stage}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Probabilitas</p>
                                <p className="text-sm font-medium text-gray-900">{deal.probability}%</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Estimasi Close</p>
                                <p className="text-sm font-medium text-gray-900">{deal.expectedCloseDate}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Dibuat</p>
                                <p className="text-sm font-medium text-gray-900">{deal.createdAt}</p>
                            </div>
                        </div>
                    </div>

                    {/* Weighted Value */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Analisis Deal</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Nilai Deal</span>
                                <span className="text-sm font-medium text-gray-900">{formatCurrency(deal.value)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Probabilitas</span>
                                <span className="text-sm font-medium text-gray-900">{deal.probability}%</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-2">
                                <span className="text-sm font-medium text-gray-900">Weighted Value</span>
                                <span className="text-sm font-bold text-green-600">{formatCurrency(weightedValue)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Catatan</h3>
                        <p className="text-sm text-gray-600">{deal.notes}</p>
                    </div>

                    {/* Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Aksi</h3>
                        <div className="space-y-2">
                            <button className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Ubah Stage
                            </button>
                            <button className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Kirim Proposal
                            </button>
                            <button className="w-full rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50">
                                Kalah Deal
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
