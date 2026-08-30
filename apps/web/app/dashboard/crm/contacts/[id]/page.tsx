'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, MapPin, Building2, Briefcase, Trash2 } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'

interface ContactDetail {
    id: string
    name: string
    email: string
    phone: string
    company: string
    position?: string
    type: string
    address: string
    notes: string
    createdAt: string
}

const typeConfig: Record<string, { color: string }> = {
    CUSTOMER: { color: 'bg-blue-100 text-blue-700' },
    SUPPLIER: { color: 'bg-green-100 text-green-700' },
    PARTNER: { color: 'bg-purple-100 text-purple-700' },
    LEAD: { color: 'bg-yellow-100 text-yellow-700' },
    BOTH: { color: 'bg-indigo-100 text-indigo-700' },
}

function getTypeColor(type: string | undefined | null): string {
    if (!type) return 'bg-gray-100 text-gray-700'
    const config = typeConfig[type] || typeConfig[type.toUpperCase()]
    return config?.color ?? 'bg-gray-100 text-gray-700'
}

export default function ContactDetailPage({ params }: { params: { id: string } }) {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
    const router = useRouter()
    const [contact, setContact] = useState<ContactDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        const contactId = params?.id
        if (!contactId) return

        const fetchContact = async () => {
            try {
                setLoading(true)
                const res = await fetch(`/api/crm/contacts/${contactId}`)
                const data = await res.json()
                if (data.success) {
                    setContact(data.data)
                } else {
                    setError(t('crm.contactDetail.error'))
                }
            } catch {
                setError(t('crm.contactDetail.errorLoad'))
            } finally {
                setLoading(false)
            }
        }
        fetchContact()
    }, [params?.id, t])

    const handleDelete = async () => {
        if (!window.confirm(t('crm.contactDetail.confirmDelete'))) return
        try {
            const res = await fetch(`/api/crm/contacts/${params.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                setToast({ message: t('crm.contactDetail.deleteSuccess'), type: 'success' })
                router.push('/dashboard/crm/contacts')
            } else {
                setToast({ message: data.error || t('crm.contactDetail.deleteError'), type: 'error' })
            }
        } catch {
            setToast({ message: t('crm.contactDetail.deleteError'), type: 'error' })
        }
    }

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
                <p className="text-gray-500">{error || t('crm.contactDetail.error')}</p>
                <Link href="/dashboard/crm/contacts" className="mt-4 text-blue-600 hover:underline">
                    {t('crm.contactDetail.backToContacts')}
                </Link>
            </div>
        )
    }
    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Link href="/dashboard/crm/contacts" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4" />
                {t('crm.contactDetail.backToContacts')}
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
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTypeColor(contact.type)}`}>
                                {t(`crm.contactDetail.${(contact.type || 'customer').toLowerCase()}`)}
                            </span>
                            {contact.position && (
                                <span className="text-sm text-gray-500">• {contact.position}</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        {t('crm.contactDetail.edit')}
                    </button>
                    {canMutate && (
                        <button onClick={handleDelete} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
                            <Trash2 className="inline h-4 w-4 mr-1" />
                            {t('crm.contactDetail.delete')}
                        </button>
                    )}
                    <Link href="/dashboard/crm/deals" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                        {t('crm.contactDetail.createNewDeal')}
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Contact Details */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('crm.contactDetail.title')}</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">{t('crm.contactDetail.name')}</p>
                                <p className="font-medium text-gray-900">{contact.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('crm.contactDetail.company')}</p>
                                <p className="font-medium text-gray-900">{contact.company}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('crm.contactDetail.position')}</p>
                                <p className="font-medium text-gray-900">{contact.position}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('crm.contactDetail.type')}</p>
                                <p className="font-medium text-gray-900">{t(`crm.contactDetail.${(contact.type || 'customer').toLowerCase()}`)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('crm.contactDetail.notes')}</h2>
                        <p className="text-sm text-gray-600">{contact.notes || t('crm.contactDetail.noNotes')}</p>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Contact Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('crm.contactDetail.contactInfo')}</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500">{t('crm.contactDetail.email')}</p>
                                    <p className="text-sm font-medium text-gray-900">{contact.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500">{t('crm.contactDetail.phone')}</p>
                                    <p className="text-sm font-medium text-gray-900">{contact.phone}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500">{t('crm.contactDetail.company')}</p>
                                    <p className="text-sm font-medium text-gray-900">{contact.company}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500">{t('crm.contactDetail.address')}</p>
                                    <p className="text-sm font-medium text-gray-900">{contact.address}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500">{t('crm.contactDetail.since')}</p>
                                    <p className="text-sm font-medium text-gray-900">{contact.createdAt}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('crm.contactDetail.notes')}</h3>
                        <p className="text-sm text-gray-600">{contact.notes}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
