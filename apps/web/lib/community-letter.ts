/**
 * Community Fase 2 — engine surat (letters) & kegiatan (events) helpers.
 * Referensi: plans/community-phase2-implementation.md §3.4, §3.6, §3.8, §5.4.
 *
 * Aturan keamanan (HARD):
 * - Nomor surat (`SRT/<PNG|DOM|SKT|KTR>/<YYYY>-<seq3>`) & `verifyToken` (32-hex)
 *   DI-ASSIGN saat ISSUE — DRAFT selalu `letterNumber: null`, `verifyToken: null`.
 *   Nomor collision-safe: max+bump di dalam transaksi + retry-once P2002 (caller).
 * - `bodySnapshot` dibekukan saat ISSUE; NIK plain (hasil `safeDecrypt`) HANYA
 *   hidup di snapshot ini untuk render PDF — TIDAK PERNAH ikut ke response JSON.
 * - Response JSON WAJIB melewati `serializeLetter()` yang membuang `bodySnapshot`
 *   dan menggantinya dengan flag `hasSnapshot`/`hasNik`.
 */

import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { safeDecrypt } from './encryption';
import { formatSeq3 } from './community';

// ─── Tipe surat (typed constants — §3.8) ─────────────────────────────────────

export interface LetterTypeDef {
    /** Nilai enum `CommunityLetter.letterType` (harus cocok dengan Zod schema). */
    type: string;
    /** Label surat Bahasa Indonesia (judul PDF). */
    labelId: string;
    /** Label surat English (UI i18n fallback). */
    labelEn: string;
    /** Kode untuk nomor surat: SRT/<numberCode>/<YYYY>-<seq3>. */
    numberCode: string;
    /** Pernyataan/kalimat isi surat spesifik jenis (di antara identitas & penutup). */
    bodyTemplate: string;
}

/**
 * 4 jenis surat — nomor: `SRT/<PNG|DOM|SKT|KTR>/<YYYY>-<seq3>`.
 * Kode `SKT` dipakai untuk type `SKTM` (konsisten dengan seed `SRT/SKT/2026-001`).
 */
export const LETTER_TYPES: Record<string, LetterTypeDef> = {
    PENGANTAR: {
        type: 'PENGANTAR',
        labelId: 'Surat Pengantar',
        labelEn: 'Letter of Introduction',
        numberCode: 'PNG',
        bodyTemplate:
            'adalah benar warga kami dan berkelakuan baik. Surat pengantar ini diberikan kepada yang bersangkutan untuk keperluan sebagaimana tersebut di atas.',
    },
    DOMISILI: {
        type: 'DOMISILI',
        labelId: 'Surat Keterangan Domisili',
        labelEn: 'Certificate of Domicile',
        numberCode: 'DOM',
        bodyTemplate:
            'benar-benar bertempat tinggal dan berdomisili di wilayah kami, sebagaimana alamat tersebut di atas.',
    },
    SKTM: {
        type: 'SKTM',
        labelId: 'Surat Keterangan Tidak Mampu',
        labelEn: 'Certificate of Financial Inability',
        numberCode: 'SKT',
        bodyTemplate:
            'benar tergolong keluarga kurang mampu / tidak mampu berdasarkan data yang kami miliki.',
    },
    KETERANGAN_LAIN: {
        type: 'KETERANGAN_LAIN',
        labelId: 'Surat Keterangan Lainnya',
        labelEn: 'Other Certificate',
        numberCode: 'KTR',
        bodyTemplate:
            'adalah benar warga kami, dan keterangan ini dibuat untuk keperluan sebagaimana tersebut di atas.',
    },
};

/** Kunci enum letterType (urut sesuai Zod schema). */
export const LETTER_TYPE_VALUES = ['PENGANTAR', 'DOMISILI', 'SKTM', 'KETERANGAN_LAIN'] as const;

export const LETTER_STATUSES = ['DRAFT', 'ISSUED', 'REVOKED'] as const;
export type LetterStatus = (typeof LETTER_STATUSES)[number];

/** Ambil definisi tipe surat; throw jika tidak dikenal (input sudah tervalidasi Zod). */
export function getLetterTypeDef(letterType: string): LetterTypeDef {
    const def = LETTER_TYPES[letterType];
    if (!def) throw new Error(`Unknown letter type: ${letterType}`);
    return def;
}

// ─── Nomor collision-safe (§3.4) ──────────────────────────────────────────────

/** Prefix nomor surat "SRT/<CODE>/<YYYY>-" (tanpa seq). */
export function letterNumberPrefix(numberCode: string, year: number): string {
    return `SRT/${numberCode}/${year}-`;
}

/** Prefix nomor kegiatan "KGT/<YYYY>-" (tanpa seq). */
export function eventNumberPrefix(year: number): string {
    return `KGT/${year}-`;
}

type LetterTx = Pick<Prisma.TransactionClient, 'communityLetter'>;
type EventTx = Pick<Prisma.TransactionClient, 'communityEvent'>;

/**
 * Nomor surat berikutnya: max seq pada prefix + 1 (formatSeq3).
 * WAJIB dipanggil di dalam transaksi; caller me-retry ×1 saat P2002
 * pada unique `[tenantId, letterNumber]` (race antar-penerbitan paralel).
 */
export async function nextLetterNumber(
    tx: LetterTx,
    tenantId: string,
    letterType: string,
    year: number
): Promise<string> {
    const prefix = letterNumberPrefix(getLetterTypeDef(letterType).numberCode, year);
    const rows = await tx.communityLetter.findMany({
        where: { tenantId, letterNumber: { startsWith: prefix } },
        select: { letterNumber: true },
    });
    let maxSeq = 0;
    for (const row of rows) {
        const seq = parseInt((row.letterNumber ?? '').slice(prefix.length), 10);
        if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
    }
    return `${prefix}${formatSeq3(maxSeq + 1)}`;
}

/**
 * Nomor kegiatan berikutnya: `KGT/<YYYY>-<seq3>` — max+bump, dipanggil dalam
 * transaksi saat CREATE; caller me-retry ×1 saat P2002 `[tenantId, eventNumber]`.
 */
export async function nextEventNumber(
    tx: EventTx,
    tenantId: string,
    year: number
): Promise<string> {
    const prefix = eventNumberPrefix(year);
    const rows = await tx.communityEvent.findMany({
        where: { tenantId, eventNumber: { startsWith: prefix } },
        select: { eventNumber: true },
    });
    let maxSeq = 0;
    for (const row of rows) {
        const seq = parseInt((row.eventNumber ?? '').slice(prefix.length), 10);
        if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
    }
    return `${prefix}${formatSeq3(maxSeq + 1)}`;
}

// ─── verifyToken (32-hex global unique) ───────────────────────────────────────

/** Token verifikasi 32-hex (128-bit) — kolom `verifyToken` unique global. */
export function generateVerifyToken(): string {
    return randomBytes(16).toString('hex');
}

/**
 * Generate token yang belum dipakai (collision-check di DB).
 * Race antar-request tetap ditangkap unique constraint → caller retry P2002.
 */
export async function generateUniqueVerifyToken(
    tx: LetterTx,
    maxAttempts = 5
): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
        const candidate = generateVerifyToken();
        // eslint-disable-next-line no-await-in-loop
        const taken = await tx.communityLetter.findFirst({
            where: { verifyToken: candidate },
            select: { id: true },
        });
        if (!taken) return candidate;
    }
    throw new Error('Unable to generate a unique verify token');
}

/** URL verifikasi publik: `${NEXTAUTH_URL}/verify/community-letter/<token>`. */
export function letterVerifyUrl(token: string): string {
    const base = (process.env.NEXTAUTH_URL || '').replace(/\/+$/, '');
    return `${base}/verify/community-letter/${token}`;
}

// ─── bodySnapshot (freeze saat ISSUE — §3.6) ─────────────────────────────────

export interface LetterSnapshotMember {
    code: string;
    fullName: string;
    /** NIK PLAIN hasil safeDecrypt — hanya untuk render PDF, tidak pernah ke JSON. */
    nik: string | null;
    address: string | null;
    rtRw: string | null;
    gender: string | null;
}

export interface LetterSnapshotRt {
    name: string;
    address: string | null;
    kelurahan: string | null;
    kecamatan: string | null;
    kabupaten: string | null;
    provinsi: string | null;
    rwNumber: string | null;
    kodePos: string | null;
    kopLine1: string | null;
    kopLine2: string | null;
}

/** Struktur `bodySnapshot` (version 1) — sama persis dengan seed Fase 2. */
export interface CommunityLetterSnapshot {
    version: 1;
    letterNumber: string | null;
    letterType: string;
    purpose: string;
    destination: string | null;
    issuedAt: string | null;
    signedByName: string | null;
    member: LetterSnapshotMember;
    rt: LetterSnapshotRt;
}

/** Baris member yang dibutuhkan snapshot (nikEncrypted didekripsi DI SINI SAJA). */
export interface SnapshotMemberInput {
    code: string;
    fullName: string;
    nikEncrypted: string | null;
    address: string | null;
    rtRw: string | null;
    gender: string | null;
}

/** Baris tenant yang dibutuhkan snapshot (kop RT dari `settings.community`). */
export interface SnapshotTenantInput {
    name: string;
    address: string | null;
    settings: unknown;
}

export interface SnapshotMeta {
    letterNumber?: string | null;
    issuedAt?: Date | null;
    signedByName?: string | null;
}

/**
 * Bangun bodySnapshot (immutable) untuk surat.
 * `safeDecrypt(nikEncrypted)` HANYA dipanggil di sini / saat render PDF —
 * nilai plain tidak pernah menjadi bagian response JSON.
 */
export function buildLetterSnapshot(
    member: SnapshotMemberInput,
    tenant: SnapshotTenantInput,
    letterType: string,
    purpose: string,
    destination: string | null | undefined,
    meta: SnapshotMeta = {}
): CommunityLetterSnapshot {
    const communitySettings =
        (tenant.settings as { community?: Record<string, string> | null } | null)?.community ?? null;
    return {
        version: 1,
        letterNumber: meta.letterNumber ?? null,
        letterType,
        purpose,
        destination: destination ?? null,
        issuedAt: meta.issuedAt ? meta.issuedAt.toISOString() : null,
        signedByName: meta.signedByName ?? null,
        member: {
            code: member.code,
            fullName: member.fullName,
            nik: safeDecrypt(member.nikEncrypted),
            address: member.address,
            rtRw: member.rtRw,
            gender: member.gender,
        },
        rt: {
            name: tenant.name,
            address: tenant.address,
            kelurahan: communitySettings?.kelurahan ?? null,
            kecamatan: communitySettings?.kecamatan ?? null,
            kabupaten: communitySettings?.kabupaten ?? null,
            provinsi: communitySettings?.provinsi ?? null,
            rwNumber: communitySettings?.rwNumber ?? null,
            kodePos: communitySettings?.kodePos ?? null,
            kopLine1: communitySettings?.kopLine1 ?? null,
            kopLine2: communitySettings?.kopLine2 ?? null,
        },
    };
}

// ─── Select & serialization response (TANPA bodySnapshot/NIK) ─────────────────

/** Select list surat — tanpa `bodySnapshot`; member ringkas tanpa `nikEncrypted`. */
export const LETTER_LIST_SELECT = {
    id: true,
    letterNumber: true,
    letterType: true,
    memberId: true,
    purpose: true,
    destination: true,
    notes: true,
    status: true,
    issuedAt: true,
    signedBy: true,
    signedByName: true,
    revokedAt: true,
    revokedBy: true,
    revokeReason: true,
    verifyToken: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
    member: {
        select: {
            id: true,
            code: true,
            fullName: true,
            address: true,
            rtRw: true,
            phone: true,
        },
    },
} as const;

/**
 * Select detail surat — `bodySnapshot` di-query HANYA untuk menghitung flag
 * `hasSnapshot`/`hasNik`, lalu dibuang oleh `serializeLetter()`.
 * Member menyertakan `nikEncrypted` untuk flag `nikStored` (bukan nilainya).
 */
export const LETTER_DETAIL_SELECT = {
    id: true,
    letterNumber: true,
    letterType: true,
    memberId: true,
    purpose: true,
    destination: true,
    notes: true,
    status: true,
    bodySnapshot: true,
    issuedAt: true,
    signedBy: true,
    signedByName: true,
    revokedAt: true,
    revokedBy: true,
    revokeReason: true,
    verifyToken: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
    member: {
        select: {
            id: true,
            code: true,
            fullName: true,
            nikEncrypted: true,
            gender: true,
            birthDate: true,
            birthPlace: true,
            address: true,
            rtRw: true,
            houseStatus: true,
            phone: true,
            email: true,
            status: true,
        },
    },
} as const;

type LetterRow = {
    bodySnapshot?: unknown;
    verifyToken?: string | null;
    member?: ({ nikEncrypted?: string | null } & Record<string, unknown>) | null;
} & Record<string, unknown>;

/**
 * Serialize baris surat untuk response JSON:
 * - `bodySnapshot` DIBUANG → `hasSnapshot: boolean`, `hasNik: boolean`.
 * - `member.nikEncrypted` DIBUANG → `member.nikStored: boolean`.
 * - `verifyUrl` ditambahkan untuk salin tautan verifikasi (token memang publik).
 */
export function serializeLetter(row: LetterRow): Record<string, unknown> {
    const { bodySnapshot, member, verifyToken, ...rest } = row;
    const snap = bodySnapshot as { member?: { nik?: unknown } } | null | undefined;

    let memberOut: Record<string, unknown> | null = null;
    if (member) {
        const { nikEncrypted, ...memberRest } = member;
        memberOut = { ...memberRest, nikStored: !!nikEncrypted };
    }

    return {
        ...rest,
        verifyToken: verifyToken ?? null,
        verifyUrl: verifyToken ? letterVerifyUrl(verifyToken) : null,
        hasSnapshot: !!bodySnapshot,
        hasNik: !!snap?.member?.nik,
        member: memberOut,
    };
}
