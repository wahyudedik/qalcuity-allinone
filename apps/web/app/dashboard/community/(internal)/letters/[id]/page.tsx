'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft,
    BadgeCheck,
    Ban,
    Copy,
    Download,
    ExternalLink,
    FileText,
    Hash,
    ShieldCheck,
    Undo2,
    User,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { usePermission } from '@/lib/use-permission'
import { useToast } from '@/components/ui/toast'
import { formatDateID } from '@/lib/export'

interface LetterDetail {
    id: string
    letterNumber: string | null
    letterType: string
    memberId: string
    purpose: string
    destination: string | null
    notes: string | null
    status: string
    issuedAt: string | null
    signedBy: string | null
    signedByName: string | null
    revokedAt: string | null
    revokedBy: string | null
    revokeReason: string | null
    verifyToken: string | null
    verifyUrl: string | null
    createdAt: string
    updatedAt: string
    hasSnapshot: boolean
    hasNik: boolean
    member: {
        id: string
        code: string
        fullName: string
        address: string | null
        rtRw: string | null
        phone: string | null
        gender: string | null
        birthDate: string | null
        birthPlace: string | null
        email: string | null
        status: string
        nikStored: boolean
    } | null
}

/** Label error respons API — `error` bisa string (route lama) atau { message } (handleApiError). */
function apiErrorMessage(json: Record<string, unknown> | null | undefined): string {
    const err = json?.error
    if (typeof err === 'string' && err) return err
    if (err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string') {
        return (err as { message: string }).message
    }
    if (typeof json?.message === 'string' && json.message) return json.message
    return 'Error'
}

export default function CommunityLetterDetailPage() {
    const params = useParams<{ id: string }>()
    const id = params?.id ?? ''
    const router = useRouter()
    const { t } = useTranslation()
    const { addToast } = useToast()
    const { hasPermission } = usePermission()
    const canManage = hasPermission('community:manage')
    const canApprove = hasPermission('community:approve')

    const [letter, setLetter] = useState<LetterDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    const [issueOpen, setIssueOpen] = useState(false)
    const [issuing, setIssuing] = useState(false)
    const [revokeOpen, setRevokeOpen] = useState(false)
    const [revokeReason, setRevokeReason] = useState('')
    const [revoking, setRevoking] = useState(false)
    const [pdfLoading, setPdfLoading] = useState(false)

    const fetchLetter = useCallback(async () => {
        if (!id) return
        try {
            setLoading(true)
            const res = await fetch(`/api/community/letters/${id}`, { credentials: 'include' })
            if (res.status === 404) {
                setNotFound(true)
                return
            }
            if (!res.ok) {
                const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
                addToast(apiErrorMessage(json), 'error')
                return
            }
            const json = (await res.json()) as { data?: LetterDetail }
            setLetter(json.data ?? null)
            if (!json.data) setNotFound(true)
        } catch {
            addToast('Error', 'error')
        } finally {
            setLoading(false)
        }
    }, [id, addToast])

    useEffect(() => {
        void fetchLetter()
    }, [fetchLetter])

    const handleIssue = async () => {
        if (!letter) return
        try {
            setIssuing(true)
            const res = await fetch(`/api/community/letters/${letter.id}/issue`, {
                method: 'POST',
                credentials: 'include',
            })
            const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
            if (!res.ok) {
                addToast(apiErrorMessage(json), 'error')
                return
            }
            addToast(t('community.letters.toast.issued'), 'success')
            setIssueOpen(false)
            await fetchLetter()
        } catch {
            addToast('Error', 'error')
        } finally {
            setIssuing(false)
        }
    }

    const handleRevoke = async () => {
        if (!letter) return
        const reason = revokeReason.trim()
        if (reason.length < 3 || reason.length > 500) {
            addToast(t('community.letters.revokeForm.reasonInvalid'), 'error')
            return
        }
        try {
            setRevoking(true)
            const res = await fetch(`/api/community/letters/${letter.id}/revoke`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ reason }),
            })
            const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
            if (!res.ok) {
                addToast(apiErrorMessage(json), 'error')
                return
            }
            addToast(t('community.letters.toast.revoked'), 'success')
            setRevokeOpen(false)
            setRevokeReason('')
            await fetchLetter()
        } catch {
            addToast('Error', 'error')
        } finally {
            setRevoking(false)
        }
    }

    const handleDownloadPdf = async () => {
        if (!letter) return
        try {
            setPdfLoading(true)
            const res = await fetch(`/api/community/letters/${letter.id}/pdf`, { credentials: 'include' })
            if (!res.ok) {
                const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
                addToast(apiErrorMessage(json), 'error')
                return
            }
            const disposition = res.headers.get('Content-Disposition') ?? ''
            const match = /filename="?([^";]+)"?/i.exec(disposition)
            const filename =
                match?.[1] ?? (letter.letterNumber ? `${letter.letterNumber}.pdf` : `DRAF-${letter.id}.pdf`)
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
        } catch {
            addToast('Error', 'error')
        } finally {
            setPdfLoading(false)
        }
    }

    const handleCopyVerify = async () => {
        if (!letter?.verifyUrl) return
        try {
            await navigator.clipboard.writeText(letter.verifyUrl)
            addToast(t('community.letters.toast.linkCopied'), 'success')
        } catch {
            addToast(t('community.letters.toast.copyFailed'), 'error')
        }
    }

    const statusBadge = (status: string) => {
        switch (status) {
            case 'ISSUED':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        {t('community.letters.status.issued')}
                    </span>
                )
            case 'REVOKED':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <Ban className="h-3.5 w-3.5" />
                        {t('community.letters.status.revoked')}
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {t('community.letters.status.draft')}
                    </span>
                )
        }
    }

    const typeLabel = (letterType: string) => {
        switch (letterType) {
            case 'PENGANTAR':
                return t('community.letters.type.pengantar')
            case 'DOMISILI':
                return t('community.letters.type.domisili')
            case 'SKTM':
                return t('community.letters.type.sktm')
            case 'KETERANGAN_LAIN':
                return t('community.letters.type.lainnya')
            default:
                return letterType
        }
    }

    const genderLabel = (gender: string | null) => {
        if (gender === 'MALE') return t('community.letters.detail.male')
        if (gender === 'FEMALE') return t('community.letters.detail.female')
        return '-'
    }

    if (!canManage) {
        return (
            <div className="p-6">
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-8 text-center dark:border-yellow-800 dark:bg-yellow-900/20">
                    <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-yellow-500" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {t('community.letters.accessDenied.title')}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {t('community.letters.accessDenied.desc')}
                    </p>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-48 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="h-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
            </div>
        )
    }

    if (notFound || !letter) {
        return (
            <div className="p-6">
                <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                    <FileText className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {t('community.common.notFound')}
                    </h2>
                    <Link
                        href="/dashboard/community/letters"
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t('community.letters.title')}
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/community/letters"
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t('community.letters.back')}
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {letter.letterNumber ?? t('community.letters.draftNumber')}
                    </h1>
                    {statusBadge(letter.status)}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {letter.status !== 'REVOKED' && (
                        <button
                            type="button"
                            onClick={() => void handleDownloadPdf()}
                            disabled={pdfLoading}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            <Download className="h-4 w-4" />
                            {pdfLoading ? t('community.common.loading') : t('community.letters.downloadPdf')}
                        </button>
                    )}
                    {letter.status === 'ISSUED' && letter.verifyUrl && (
                        <button
                            type="button"
                            onClick={() => void handleCopyVerify()}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            <Copy className="h-4 w-4" />
                            {t('community.letters.copyVerify')}
                        </button>
                    )}
                    {letter.status === 'DRAFT' && canApprove && (
                        <button
                            type="button"
                            onClick={() => setIssueOpen(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                        >
                            <BadgeCheck className="h-4 w-4" />
                            {t('community.letters.issue')}
                        </button>
                    )}
                    {letter.status === 'ISSUED' && canApprove && (
                        <button
                            type="button"
                            onClick={() => setRevokeOpen(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                        >
                            <Ban className="h-4 w-4" />
                            {t('community.letters.revoke')}
                        </button>
                    )}
                </div>
            </div>

            {/* Info surat */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <FileText className="h-4 w-4" />
                    {t('community.letters.detail.letterInfo')}
                </h2>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400">
                            {t('community.letters.table.letterNumber')}
                        </dt>
                        <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {letter.letterNumber ?? t('community.letters.draftNumber')}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400">
                            {t('community.letters.table.letterType')}
                        </dt>
                        <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {typeLabel(letter.letterType)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400">{t('community.letters.detail.purpose')}</dt>
                        <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">{letter.purpose}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400">
                            {t('community.letters.table.destination')}
                        </dt>
                        <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                            {letter.destination ?? '-'}
                        </dd>
                    </div>
                    {letter.notes && (
                        <div className="sm:col-span-2">
                            <dt className="text-xs text-gray-500 dark:text-gray-400">
                                {t('community.letters.form.notes')}
                            </dt>
                            <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">{letter.notes}</dd>
                        </div>
                    )}
                    <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400">{t('community.letters.detail.createdAt')}</dt>
                        <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                            {formatDateID(letter.createdAt)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400">{t('community.letters.detail.updatedAt')}</dt>
                        <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                            {formatDateID(letter.updatedAt)}
                        </dd>
                    </div>
                </dl>
            </div>

            {/* Pemohon */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <User className="h-4 w-4" />
                    {t('community.letters.detail.memberInfo')}
                </h2>
                {letter.member ? (
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-xs text-gray-500 dark:text-gray-400">
                                {t('community.letters.table.memberCode')}
                            </dt>
                            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                                {letter.member.code}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-gray-500 dark:text-gray-400">
                                {t('community.letters.table.member')}
                            </dt>
                            <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                                {letter.member.fullName}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-gray-500 dark:text-gray-400">
                                {t('community.letters.detail.gender')}
                            </dt>
                            <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                                {genderLabel(letter.member.gender)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-gray-500 dark:text-gray-400">
                                {t('community.letters.detail.birthDate')}
                            </dt>
                            <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                                {letter.member.birthDate ? formatDateID(letter.member.birthDate) : '-'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-gray-500 dark:text-gray-400">
                                {t('community.letters.detail.nikStatus')}
                            </dt>
                            <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                                {letter.member.nikStored
                                    ? t('community.letters.detail.nikStored')
                                    : t('community.letters.detail.nikMissing')}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-gray-500 dark:text-gray-400">{t('community.letters.detail.phone')}</dt>
                            <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                                {letter.member.phone ?? '-'}
                            </dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-xs text-gray-500 dark:text-gray-400">
                                {t('community.letters.detail.address')}
                            </dt>
                            <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                                {letter.member.address ?? '-'}
                                {letter.member.rtRw ? ` (RT/RW ${letter.member.rtRw})` : ''}
                            </dd>
                        </div>
                    </dl>
                ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('community.common.noData')}</p>
                )}
            </div>

            {/* Riwayat & verifikasi */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <Hash className="h-4 w-4" />
                        {t('community.letters.detail.history')}
                    </h2>
                    <ul className="space-y-3 text-sm">
                        <li className="flex items-start justify-between gap-3">
                            <span className="text-gray-500 dark:text-gray-400">
                                {t('community.letters.detail.createdAt')}
                            </span>
                            <span className="text-right text-gray-900 dark:text-gray-100">
                                {formatDateID(letter.createdAt)}
                            </span>
                        </li>
                        {letter.issuedAt && (
                            <li className="flex items-start justify-between gap-3">
                                <span className="text-gray-500 dark:text-gray-400">
                                    {t('community.letters.detail.issuedAt')}
                                </span>
                                <span className="text-right text-gray-900 dark:text-gray-100">
                                    {formatDateID(letter.issuedAt)}
                                    {letter.signedByName ? ` — ${letter.signedByName}` : ''}
                                </span>
                            </li>
                        )}
                        {letter.revokedAt && (
                            <>
                                <li className="flex items-start justify-between gap-3">
                                    <span className="text-gray-500 dark:text-gray-400">
                                        {t('community.letters.detail.revokedAt')}
                                    </span>
                                    <span className="text-right text-gray-900 dark:text-gray-100">
                                        {formatDateID(letter.revokedAt)}
                                    </span>
                                </li>
                                {letter.revokeReason && (
                                    <li className="flex items-start justify-between gap-3">
                                        <span className="text-gray-500 dark:text-gray-400">
                                            {t('community.letters.detail.revokeReason')}
                                        </span>
                                        <span className="max-w-xs text-right text-red-600 dark:text-red-400">
                                            {letter.revokeReason}
                                        </span>
                                    </li>
                                )}
                            </>
                        )}
                    </ul>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <ShieldCheck className="h-4 w-4" />
                        {t('community.letters.detail.verification')}
                    </h2>
                    {letter.status === 'ISSUED' && letter.verifyUrl ? (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {t('community.letters.detail.verifyDesc')}
                            </p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={letter.verifyUrl}
                                    className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300"
                                />
                                <button
                                    type="button"
                                    onClick={() => void handleCopyVerify()}
                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    <Copy className="h-4 w-4" />
                                    {t('community.letters.copyVerify')}
                                </button>
                                <a
                                    href={letter.verifyUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {letter.status === 'DRAFT'
                                ? t('community.letters.detail.verifyDraft')
                                : t('community.letters.detail.verifyRevoked')}
                        </p>
                    )}
                </div>
            </div>

            {/* Modal Issue */}
            {issueOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {t('community.letters.issueConfirm.title')}
                        </h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {t('community.letters.issueConfirm.desc')}
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIssueOpen(false)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {t('community.common.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleIssue()}
                                disabled={issuing}
                                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                                <BadgeCheck className="h-4 w-4" />
                                {issuing ? t('community.common.loading') : t('community.letters.issue')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Revoke */}
            {revokeOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {t('community.letters.revokeForm.title')}
                        </h3>
                        <label className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('community.letters.revokeForm.reason')}
                            <textarea
                                value={revokeReason}
                                onChange={(e) => setRevokeReason(e.target.value)}
                                rows={3}
                                maxLength={500}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                            />
                            <span className="mt-1 block text-xs text-gray-400">{revokeReason.length}/500</span>
                        </label>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setRevokeOpen(false)
                                    setRevokeReason('')
                                }}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {t('community.common.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleRevoke()}
                                disabled={revoking}
                                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                <Undo2 className="h-4 w-4" />
                                {revoking ? t('community.common.loading') : t('community.letters.revokeForm.submit')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
