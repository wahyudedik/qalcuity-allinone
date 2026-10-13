import { prisma } from '@/lib/db'
import { formatDateID } from '@/lib/export'
import { BadgeCheck, Ban, FileText, ShieldQuestion } from 'lucide-react'

export const dynamic = 'force-dynamic'

const TYPE_LABEL: Record<string, string> = {
    PENGANTAR: 'Surat Pengantar',
    DOMISILI: 'Surat Keterangan Domisili',
    SKTM: 'Surat Keterangan Tidak Mampu',
    KETERANGAN_LAIN: 'Surat Keterangan Lainnya',
}

/**
 * Halaman verifikasi publik surat pengantar komunitas.
 *
 * SECURITY: token adalah capability-URL 128-bit hex, unique GLOBAL di database.
 * Halaman ini TIDAK memerlukan login dan TIDAK memfilter tenantId — siapa pun
 * yang memiliki link dapat memverifikasi keaslian surat. NIK TIDAK PERNAH
 * ditampilkan di halaman ini (hanya nomor surat, jenis, nama pemohon,
 * keperluan, dan status).
 */
async function verifyLetter(token: string) {
    try {
        // Catatan: TIDAK ada relasi signedByUser di model — penandatangan diambil
        // dari snapshot signedByName (immutable saat ISSUE).
        return await prisma.communityLetter.findUnique({
            where: { verifyToken: token },
            include: {
                member: { select: { fullName: true } },
            },
        })
    } catch {
        return null
    }
}

function NotFound() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    <ShieldQuestion className="h-7 w-7 text-gray-400" />
                </div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Surat tidak ditemukan
                </h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Tidak ada surat yang terdaftar dengan tautan verifikasi ini. Pastikan tautan
                    yang Anda buka lengkap dan sesuai dengan yang tertera pada surat.
                </p>
            </div>
        </main>
    )
}

export default async function VerifyCommunityLetterPage({
    params,
}: {
    params: { token: string }
}) {
    const token = params?.token ?? ''
    // Token hex 128-bit (32 char) — invalid format pasti tidak ada di DB.
    if (!/^[a-f0-9]{32}$/i.test(token)) return <NotFound />

    const letter = await verifyLetter(token)
    if (!letter || !letter.verifyToken) return <NotFound />

    const isIssued = letter.status === 'ISSUED'
    const isRevoked = letter.status === 'REVOKED'

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                {/* Kop verifikator */}
                <div className="border-b border-gray-200 px-8 py-6 text-center dark:border-gray-800">
                    <h1 className="text-lg font-bold tracking-wide text-gray-900 dark:text-gray-100">
                        QALCUITY
                    </h1>
                    <p className="mt-0.5 text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        Verifikasi Surat Pengantar
                    </p>
                </div>

                <div className="px-8 py-6">
                    {/* Badge status besar */}
                    <div className="mb-6 flex justify-center">
                        {isIssued ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-6 py-2.5 text-base font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <BadgeCheck className="h-6 w-6" />
                                SAH & VALID
                            </span>
                        ) : isRevoked ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-6 py-2.5 text-base font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                <Ban className="h-6 w-6" />
                                TIDAK BERLAKU
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-6 py-2.5 text-base font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                <FileText className="h-6 w-6" />
                                DRAF — BELUM RESMI
                            </span>
                        )}
                    </div>

                    {isRevoked && letter.revokeReason && (
                        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                            <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
                                Alasan Pembatalan
                            </p>
                            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{letter.revokeReason}</p>
                        </div>
                    )}

                    {/* Detail surat */}
                    <dl className="space-y-3">
                        <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 dark:border-gray-800">
                            <dt className="text-sm text-gray-500 dark:text-gray-400">Nomor Surat</dt>
                            <dd className="text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {letter.letterNumber ?? '(Draf)'}
                            </dd>
                        </div>
                        <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 dark:border-gray-800">
                            <dt className="text-sm text-gray-500 dark:text-gray-400">Jenis Surat</dt>
                            <dd className="text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                                {TYPE_LABEL[letter.letterType] ?? letter.letterType}
                            </dd>
                        </div>
                        <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 dark:border-gray-800">
                            <dt className="text-sm text-gray-500 dark:text-gray-400">Nama Pemohon</dt>
                            <dd className="text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                                {letter.member?.fullName ?? '-'}
                            </dd>
                        </div>
                        <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 dark:border-gray-800">
                            <dt className="text-sm text-gray-500 dark:text-gray-400">Keperluan</dt>
                            <dd className="max-w-[60%] text-right text-sm text-gray-900 dark:text-gray-100">
                                {letter.purpose}
                            </dd>
                        </div>
                        {letter.destination && (
                            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 dark:border-gray-800">
                                <dt className="text-sm text-gray-500 dark:text-gray-400">Tujuan</dt>
                                <dd className="max-w-[60%] text-right text-sm text-gray-900 dark:text-gray-100">
                                    {letter.destination}
                                </dd>
                            </div>
                        )}
                        {letter.issuedAt && (
                            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 dark:border-gray-800">
                                <dt className="text-sm text-gray-500 dark:text-gray-400">Tanggal Terbit</dt>
                                <dd className="text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {formatDateID(letter.issuedAt)}
                                </dd>
                            </div>
                        )}
                        {letter.signedByName && (
                            <div className="flex items-start justify-between gap-4">
                                <dt className="text-sm text-gray-500 dark:text-gray-400">Penandatangan</dt>
                                <dd className="text-right text-sm text-gray-900 dark:text-gray-100">
                                    {letter.signedByName}
                                </dd>
                            </div>
                        )}
                        {letter.revokedAt && (
                            <div className="flex items-start justify-between gap-4">
                                <dt className="text-sm text-gray-500 dark:text-gray-400">Tanggal Dibatalkan</dt>
                                <dd className="text-right text-sm font-medium text-red-600 dark:text-red-400">
                                    {formatDateID(letter.revokedAt)}
                                </dd>
                            </div>
                        )}
                    </dl>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 bg-gray-50 px-8 py-4 text-center dark:border-gray-800 dark:bg-gray-950/50">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        Halaman verifikasi resmi Qalcuity. Status surat di atas mencerminkan data
                        terkini di sistem.
                    </p>
                </div>
            </div>
        </main>
    )
}
