'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Home, Mail, Phone, Receipt, ShieldCheck, ShieldAlert, User } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatCurrencyIDR, formatDateID } from '@/lib/export'

interface MemberDetail {
    id: string
    code: string
    fullName: string
    gender: string | null
    birthPlace: string | null
    birthDate: string | null
    address: string | null
    rtRw: string | null
    houseStatus: string | null
    phone: string | null
    email: string | null
    status: string
    joinedAt: string | null
    notes: string | null
    userId: string | null
    userName: string | null
    nikStored: boolean
    nomorKkStored: boolean
}

interface BillRow {
    id: string
    billNumber: string
    period: string
    amountDue: number
    amountPaid: number
    status: string
    dueDate: string | null
    paidAt: string | null
    duesType: { id: string; code: string; name: string }
}

function statusBadge(status: string) {
    if (status === 'ACTIVE') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    if (status === 'INACTIVE') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

function billStatusBadge(t: (k: string) => string, status: string) {
    if (status === 'PAID') return { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: t('community.bills.status.paid') }
    if (status === 'PARTIAL') return { cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: t('community.bills.status.partial') }
    if (status === 'VOID') return { cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', label: t('community.bills.status.void') }
    return { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: t('community.bills.status.unpaid') }
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
    return (
        <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
            <span className="mt-0.5 text-gray-400">{icon}</span>
            <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
                <p className="mt-0.5 break-words text-sm text-gray-900 dark:text-gray-100">{value || '—'}</p>
            </div>
        </div>
    )
}

export default function CommunityMemberDetailPage() {
    const params = useParams<{ id: string }>()
    const id = params?.id
    const { t } = useTranslation()
    const { addToast } = useToast()

    const [member, setMember] = useState<MemberDetail | null>(null)
    const [bills, setBills] = useState<BillRow[]>([])
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    const fetchAll = useCallback(async () => {
        if (!id) return
        setLoading(true)
        try {
            const [memberRes, billsRes] = await Promise.all([
                fetch(`/api/community/members/${id}`),
                fetch(`/api/community/bills?memberId=${encodeURIComponent(id)}&limit=50`),
            ])
            if (memberRes.status === 404) {
                setNotFound(true)
                return
            }
            if (!memberRes.ok) throw new Error()
            const memberJson = await memberRes.json()
            setMember(memberJson.data)

            if (billsRes.ok) {
                const billsJson = await billsRes.json()
                setBills(billsJson.data ?? [])
            }
        } catch {
            addToast(t('common.error.load'), 'error')
        } finally {
            setLoading(false)
        }
    }, [id, addToast, t])

    useEffect(() => {
        void fetchAll()
    }, [fetchAll])

    if (loading) {
        return (
            <div className="space-y-4 p-6">
                <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                <div className="h-40 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="h-64 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
            </div>
        )
    }

    if (notFound || !member) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={User}
                    title={t('community.common.notFound')}
                    description=""
                />
                <div className="mt-4 text-center">
                    <Link href="/dashboard/community/members" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline">
                        <ArrowLeft className="h-4 w-4" />
                        {t('community.members.title')}
                    </Link>
                </div>
            </div>
        )
    }

    const outstandingTotal = bills
        .filter((b) => b.status === 'UNPAID' || b.status === 'PARTIAL')
        .reduce((sum, b) => sum + (b.amountDue - b.amountPaid), 0)

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Link
                    href="/dashboard/community/members"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {t('community.members.title')}
                </Link>
            </div>

            {/* Header */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <User className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="truncate text-xl font-bold text-gray-900 dark:text-gray-100">{member.fullName}</h1>
                        <p className="font-mono text-sm text-gray-500 dark:text-gray-400">{member.code}</p>
                    </div>
                    <span className={`ml-auto rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(member.status)}`}>
                        {member.status === 'ACTIVE'
                            ? t('community.members.status.active')
                            : member.status === 'INACTIVE'
                                ? t('community.members.status.inactive')
                                : t('community.members.status.moved')}
                    </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <InfoItem icon={<Home className="h-4 w-4" />} label={t('community.members.table.address')} value={member.address} />
                    <InfoItem icon={<Home className="h-4 w-4" />} label={t('community.members.table.rtRw')} value={member.rtRw} />
                    <InfoItem
                        icon={<Home className="h-4 w-4" />}
                        label={t('community.members.table.houseStatus')}
                        value={
                            member.houseStatus
                                ? member.houseStatus === 'OWNER'
                                    ? t('community.members.houseStatus.owner')
                                    : t('community.members.houseStatus.rent')
                                : null
                        }
                    />
                    <InfoItem icon={<Phone className="h-4 w-4" />} label={t('community.members.table.phone')} value={member.phone} />
                    <InfoItem icon={<Mail className="h-4 w-4" />} label={t('community.members.table.email')} value={member.email} />
                    <InfoItem
                        icon={<User className="h-4 w-4" />}
                        label={t('community.members.form.gender')}
                        value={member.gender === 'MALE' ? t('community.members.gender.male') : member.gender === 'FEMALE' ? t('community.members.gender.female') : null}
                    />
                    <InfoItem icon={<User className="h-4 w-4" />} label={t('community.members.form.birthPlace')} value={member.birthPlace} />
                    <InfoItem icon={<User className="h-4 w-4" />} label={t('community.members.form.birthDate')} value={member.birthDate ? formatDateID(member.birthDate) : null} />
                    <InfoItem icon={<User className="h-4 w-4" />} label={t('community.members.table.joinedAt')} value={member.joinedAt ? formatDateID(member.joinedAt) : null} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {member.nikStored ? (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {t('community.members.nikStored')}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            {t('community.members.nikMissing')}
                        </span>
                    )}
                    {member.userName && (
                        <span>{t('community.members.form.linkUser')}: {member.userName}</span>
                    )}
                    {member.notes && <span>{member.notes}</span>}
                </div>
            </div>

            {/* Bill history */}
            <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        <Receipt className="h-5 w-5 text-blue-600" />
                        {t('community.bills.title')}
                    </h2>
                    {outstandingTotal > 0 && (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            {t('community.bills.table.outstanding')}: {formatCurrencyIDR(outstandingTotal)}
                        </span>
                    )}
                </div>

                {bills.length === 0 ? (
                    <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        {t('community.bills.empty')}
                    </p>
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className="space-y-2 md:hidden">
                            {bills.map((bill) => {
                                const badge = billStatusBadge(t, bill.status)
                                return (
                                    <div key={bill.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{bill.billNumber}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{bill.duesType?.name}</p>
                                            </div>
                                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                                        </div>
                                        <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-600 dark:text-gray-300">
                                            <div><dt className="text-gray-400">{t('community.bills.table.period')}</dt><dd>{bill.period}</dd></div>
                                            <div><dt className="text-gray-400">{t('community.bills.table.amountDue')}</dt><dd>{formatCurrencyIDR(bill.amountDue)}</dd></div>
                                            <div><dt className="text-gray-400">{t('community.bills.table.amountPaid')}</dt><dd>{formatCurrencyIDR(bill.amountPaid)}</dd></div>
                                            <div><dt className="text-gray-400">{t('community.bills.table.outstanding')}</dt><dd>{formatCurrencyIDR(bill.amountDue - bill.amountPaid)}</dd></div>
                                        </dl>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Desktop table */}
                        <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 md:block">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.bills.table.billNumber')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.bills.table.duesType')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.bills.table.period')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.bills.table.amountDue')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.bills.table.amountPaid')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.bills.table.outstanding')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.bills.table.status')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.bills.table.paidAt')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {bills.map((bill) => {
                                        const badge = billStatusBadge(t, bill.status)
                                        return (
                                            <tr key={bill.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-gray-900 dark:text-gray-100">{bill.billNumber}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{bill.duesType?.name}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{bill.period}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">{formatCurrencyIDR(bill.amountDue)}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">{formatCurrencyIDR(bill.amountPaid)}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrencyIDR(bill.amountDue - bill.amountPaid)}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm">
                                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{bill.paidAt ? formatDateID(bill.paidAt) : '—'}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </section>
        </div>
    )
}
