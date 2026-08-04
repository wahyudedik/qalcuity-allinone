'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface ContactDetail {
    id: string
    name: string
    email: string
    phone: string
    company: string
    position: string
    type: string
    address: string
    notes: string
    createdAt: string
}

const typeConfig: Record<string, { label: string; color: string }> = {
    customer: { label: 'Customer', color: 'bg-blue-100 text-blue-700' },
    supplier: { label: 'Supplier', color: 'bg-green-100 text-green-700' },
    partner: { label: 'Partner', color: 'bg-purple-100 text-purple-700' },
    lead: { label: 'Lead', color: 'bg-yellow-100 text-yellow-700' },
}

export default function ContactDetailPage({ params }: { params: { id: string } }) {
    const [contact, setContact] = useState<ContactDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchContact = async () => {
            try {
                setLoading(true)
                const res = await fetch(`/api/crm/contacts/${params.id}`)
                const data = await res.json()
                if (data.success) {
                    setContact(data.data)
                } else {
                    setError('Contact tidak ditemukan')
                }
            } catch {
                setError('Gagal memuat data contact')
            } finally {
                setLoading(false)
            }
        }
        fetchContact()
    }, [params.id])

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
                <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
            </div>
        )
    }

    if (error || !contact) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500">{error || 'Contact tidak ditemukan'}</p>
                <Link href="/dashboard/crm/contacts" className="mt-4 text-blue-600 hover:underline">
                    Kembali ke Contacts
                </Link>
            </div>
        )
    }
    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Link href="/dashboard/crm/contacts" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Kembali ke Contacts
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
                        {contact.name.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{contact.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeConfig[contact.type].color}`}>
                                {typeConfig[contact.type].label}
                            </span>
                            <span className="text-sm text-gray-500">• {contact.position}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Edit
                    </button>
                    <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                        Buat Deal Baru
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Contact Details */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detail Kontak</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Nama</p>
                                <p className="font-medium text-gray-900">{contact.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Perusahaan</p>
                                <p className="font-medium text-gray-900">{contact.company}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Posisi</p>
                                <p className="font-medium text-gray-900">{contact.position}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Tipe</p>
                                <p className="font-medium text-gray-900">{typeConfig[contact.type]?.label || contact.type}</p>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Catatan</h2>
                        <p className="text-sm text-gray-600">{contact.notes || 'Tidak ada catatan'}</p>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Contact Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Informasi Kontak</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-gray-500">Email</p>
                                <p className="text-sm font-medium text-gray-900">{contact.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Telepon</p>
                                <p className="text-sm font-medium text-gray-900">{contact.phone}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Perusahaan</p>
                                <p className="text-sm font-medium text-gray-900">{contact.company}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Alamat</p>
                                <p className="text-sm font-medium text-gray-900">{contact.address}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Sejak</p>
                                <p className="text-sm font-medium text-gray-900">{contact.createdAt}</p>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Catatan</h3>
                        <p className="text-sm text-gray-600">{contact.notes}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
