/**
 * Community module (RT/RW MVP Fase 1) — shared helpers.
 * Referensi: plans/community-mvp-implementation.md §3.5.
 *
 * Catatan keamanan:
 * - NIK & Nomor KK HANYA disimpan terenkripsi (encrypt() AES-256-GCM).
 * - Response API TIDAK PERNAH memuat NIK plain — hanya flag `nikStored`.
 * - Pencarian warga hanya via fullName/code/address/phone (tanpa NIK).
 */

import { Prisma } from '@prisma/client';
import { prisma } from './db';

// ─── Select & serialization member ────────────────────────────────────────────

/**
 * Select kolom member yang aman untuk response. Kolom enkripsi
 * (`nikEncrypted`/`nomorKkEncrypted`) ikut di-select HANYA untuk menghitung
 * flag `nikStored` — kemudian DIBUANG dari response via serializeCommunityMember.
 */
export const COMMUNITY_MEMBER_SELECT = {
    id: true,
    code: true,
    fullName: true,
    nikEncrypted: true,
    nomorKkEncrypted: true,
    gender: true,
    birthDate: true,
    birthPlace: true,
    address: true,
    rtRw: true,
    houseStatus: true,
    phone: true,
    email: true,
    status: true,
    joinedAt: true,
    notes: true,
    userId: true,
    userName: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
} as const;

type MemberRow = {
    nikEncrypted?: string | null;
    nomorKkEncrypted?: string | null;
} & Record<string, unknown>;

/** Buang kolom enkripsi dari response; ganti dengan flag `nikStored`/`nomorKkStored`. */
export function serializeCommunityMember(row: MemberRow): Record<string, unknown> {
    const { nikEncrypted, nomorKkEncrypted, ...rest } = row;
    return {
        ...rest,
        nikStored: !!nikEncrypted,
        nomorKkStored: !!nomorKkEncrypted,
    };
}

// ─── Select & serialization kegiatan (Fase 2 — Surat & Kegiatan) ──────────────

/**
 * Select kegiatan untuk list/detail admin. `budgetAmount` Decimal → number via
 * `serializeCommunityEvent`. Hitungan transaksi kas ter-link di-attach per route
 * (filtered `_count`) karena filternya kontekstual (deletedAt null).
 */
export const EVENT_LIST_SELECT = {
    id: true,
    eventNumber: true,
    title: true,
    description: true,
    category: true,
    startsAt: true,
    endsAt: true,
    location: true,
    maxCapacity: true,
    budgetAmount: true,
    status: true,
    publishedAt: true,
    announcementId: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
} as const;

type EventRow = {
    budgetAmount?: unknown;
} & Record<string, unknown>;

/** Serialize baris kegiatan — `budgetAmount` Decimal → number/null untuk response JSON. */
export function serializeCommunityEvent(row: EventRow): Record<string, unknown> {
    const { budgetAmount, ...rest } = row;
    return {
        ...rest,
        budgetAmount:
            budgetAmount === null || budgetAmount === undefined ? null : Number(budgetAmount),
    };
}

// ─── Period & date helpers ────────────────────────────────────────────────────

const APP_TZ = process.env.APP_TIMEZONE || 'Asia/Jakarta';

/** Format tanggal ke "YYYY-MM-DD" dalam APP_TIMEZONE. */
export function formatYmd(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: APP_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}

/** Bulan berjalan dalam format "YYYY-MM" (APP_TIMEZONE). */
export function currentPeriod(date: Date = new Date()): string {
    return formatYmd(date).slice(0, 7);
}

/** "YYYY-MM" → { start: Date (00:00 UTC), end: Date (23:59:59.999 UTC) } batas bulan. */
export function periodBounds(period: string): { start: Date; end: Date } {
    const [y, m] = period.split('-').map((v) => parseInt(v, 10));
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    return { start, end };
}

/** Prefix nomor harian "PREFIX/YYYYMMDD-" (tanpa seq). */
export function dailyNumberPrefix(prefix: string, when: Date): string {
    return `${prefix}/${formatYmd(when).replace(/-/g, '')}-`;
}

/** "001" | 1 → "001" — seq3 collision-safe numbering. */
export function formatSeq3(seq: number): string {
    return String(seq).padStart(3, '0');
}

// ─── Portal: resolusi Warga → CommunityMember ─────────────────────────────────

export type PortalMember = { id: string; code: string; fullName: string };

/**
 * Resolve CommunityMember milik session user untuk portal warga (spec §3.5 / §5):
 * 1. Link langsung via kolom `CommunityMember.userId` (di-set admin saat pairing).
 * 2. Fallback: cocokkan `User.email`/`User.phone` dengan `member.email`/`member.phone`.
 * Fallback membatasi status ACTIVE (warga pindah/keluar tidak akses portal).
 * Mengembalikan null bila tidak ada kecocokan — caller yang memutuskan
 * (overview: `member: null` + empty state; bills/cash: 404 PORTAL_MEMBER_NOT_FOUND).
 */
export async function resolvePortalMember(
    tenantId: string,
    userId: string
): Promise<PortalMember | null> {
    const select = { id: true, code: true, fullName: true } as const;

    // 1) Link eksplisit userId → member (tanpa filter status: keputusan admin).
    const byUserId = await prisma.communityMember.findFirst({
        where: { tenantId, userId, deletedAt: null },
        select,
    });
    if (byUserId) return byUserId;

    // 2) Fallback email/phone match dengan akun User.
    const user = await prisma.user.findFirst({
        where: { id: userId, tenantId, deletedAt: null },
        select: { email: true, phone: true },
    });
    if (!user) return null;

    const or: Array<{ email?: string; phone?: string }> = [];
    if (user.email) or.push({ email: user.email });
    if (user.phone) or.push({ phone: user.phone });
    if (or.length === 0) return null;

    return prisma.communityMember.findFirst({
        where: { tenantId, deletedAt: null, status: 'ACTIVE', OR: or },
        select,
    });
}

/**
 * Filter Prisma untuk pengumuman yang TERLIHAT di portal warga:
 * aktif + sudah terbit + belum kedaluwarsa.
 */
export function portalAnnouncementWhere(now: Date = new Date()) {
    return {
        isActive: true,
        publishedAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };
}

// ─── Aset komunitas (Fase 4A) ────────────────────────────────────────────────

/**
 * Select aset untuk list/detail internal. `custodian` = relasi CommunityMember
 * dengan select ringkas (code + nama). `acquisitionCost` Decimal → number via
 * `serializeCommunityAsset`. Projection publik (portal) memakai select 5 kolom
 * TERPISAH di route portal — jangan pakai select ini untuk portal.
 */
export const ASSET_LIST_SELECT = {
    id: true,
    assetCode: true,
    name: true,
    category: true,
    acquisitionDate: true,
    acquisitionCost: true,
    condition: true,
    status: true,
    location: true,
    custodianMemberId: true,
    custodian: { select: { id: true, code: true, fullName: true } },
    notes: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
    // Fase 4B: hitung pinjaman aktif (returnedAt null) per aset — filtered
    // relation count (Prisma 5 GA) → serializer mengekspos `activeLoanCount`.
    _count: { select: { loans: { where: { returnedAt: null } } } },
} as const;

type AssetRow = {
    acquisitionCost?: unknown;
    _count?: { loans?: number } | null;
} & Record<string, unknown>;

/** Serialize baris aset — `acquisitionCost` Decimal → number/null; `activeLoanCount` dari filtered `_count`. */
export function serializeCommunityAsset(row: AssetRow): Record<string, unknown> {
    const { acquisitionCost, _count, ...rest } = row;
    return {
        ...rest,
        acquisitionCost:
            acquisitionCost === null || acquisitionCost === undefined ? null : Number(acquisitionCost),
        activeLoanCount: _count?.loans ?? 0,
    };
}

/** Prefix nomor aset "AST/<YYYY>-" (tanpa seq) — di-assign saat CREATE. */
export function assetNumberPrefix(year: number): string {
    return `AST/${year}-`;
}

type AssetTx = Pick<Prisma.TransactionClient, 'communityAsset'>;

/**
 * Nomor aset berikutnya: `AST/<YYYY>-<seq3>` — max+bump pada prefix tahun,
 * WAJIB dipanggil di dalam transaksi; caller me-retry ×1 saat P2002 pada
 * unique `[tenantId, assetCode]` (pola nextEventNumber, plans §2.6).
 */
export async function nextAssetNumber(
    tx: AssetTx,
    tenantId: string,
    year: number
): Promise<string> {
    const prefix = assetNumberPrefix(year);
    const rows = await tx.communityAsset.findMany({
        where: { tenantId, assetCode: { startsWith: prefix } },
        select: { assetCode: true },
    });
    let maxSeq = 0;
    for (const row of rows) {
        const seq = parseInt((row.assetCode ?? '').slice(prefix.length), 10);
        if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
    }
    return `${prefix}${formatSeq3(maxSeq + 1)}`;
}

// ─── Pinjaman aset (Fase 4B) ─────────────────────────────────────────────────
// Referensi: plans/community-phase4b-loan-depreciation-implementation.md §4.2.

/**
 * Select pinjaman untuk list internal — embed ringkas asset (code/nama/kondisi)
 * + member (code/nama peminjam). Projection portal memakai PORTAL_LOAN_SELECT.
 */
export const LOAN_LIST_SELECT = {
    id: true, assetId: true, memberId: true,
    loanDate: true, dueDate: true, returnedAt: true,
    conditionAtLoan: true, conditionAtReturn: true,
    status: true, notes: true, returnNotes: true,
    createdBy: true, returnedBy: true, createdAt: true, updatedAt: true,
    asset: { select: { assetCode: true, name: true, condition: true } },
    member: { select: { code: true, fullName: true } },
} as const;

/** Select pinjaman untuk portal warga — hanya field yang layak tampil (§3.5). */
export const PORTAL_LOAN_SELECT = {
    loanDate: true,
    dueDate: true,
    returnedAt: true,
    conditionAtLoan: true,
    conditionAtReturn: true,
    asset: { select: { assetCode: true, name: true } },
} as const;

/**
 * Serialize baris pinjaman + derive `isOverdue` (turunan, bukan kolom):
 * `returnedAt == null && formatYmd(dueDate) < formatYmd(now)` — perbandingan
 * string YYYY-MM-DD dalam APP_TIMEZONE (plans Q1). Tidak ada Decimal di model.
 */
export function serializeCommunityAssetLoan(row: Record<string, unknown>): Record<string, unknown> {
    const returnedAt = row.returnedAt as Date | null | undefined;
    const dueDate = row.dueDate as Date | null | undefined;
    const isOverdue = !returnedAt && !!dueDate && formatYmd(dueDate) < formatYmd(new Date());
    return { ...row, isOverdue };
}

/** Proyeksi portal "Pinjaman Saya" — 8 field non-sensitif; drop catatan & identitas pengurus. */
export function serializePortalLoan(row: Record<string, unknown>): Record<string, unknown> {
    const asset = (row.asset ?? {}) as { assetCode?: string | null; name?: string | null };
    const returnedAt = (row.returnedAt ?? null) as Date | null;
    const dueDate = row.dueDate as Date | null | undefined;
    const isOverdue = !returnedAt && !!dueDate && formatYmd(dueDate) < formatYmd(new Date());
    return {
        assetCode: asset.assetCode ?? null,
        assetName: asset.name ?? null,
        loanDate: row.loanDate,
        dueDate: row.dueDate,
        returnedAt,
        isOverdue,
        conditionAtLoan: row.conditionAtLoan,
        conditionAtReturn: row.conditionAtReturn ?? null,
    };
}

/** Start-of-today (00:00) APP_TIMEZONE sebagai Date UTC — filter overdue di query list. */
/**
 * Error domain pinjaman — dibuang dari dalam `prisma.$transaction` untuk
 * mapping status code (throw ⇒ rollback otomatis; 404/409 tidak commit apa pun).
 * Pola: catch handler memeriksa `instanceof LoanRequestError` sebelum
 * `handleApiError()`. Reuse lintas loans/route.ts, [id], [id]/return.
 */
export class LoanRequestError extends Error {
    constructor(
        public readonly status: number,
        message: string
    ) {
        super(message);
        this.name = 'LoanRequestError';
    }
}

export function startOfTodayAppTz(now: Date = new Date()): Date {
    const [y, m, d] = formatYmd(now).split('-').map((v) => parseInt(v, 10));
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

// ─── Depresiasi informatif (Fase 4B) ─────────────────────────────────────────
// INFORMATIF — bukan akuntansi (ADR-026): straight-line on-the-fly, tanpa
// kolom tersimpan, tanpa scheduled job, tanpa jurnal.

/** Umur pakai informatif (tahun) per kategori aset — depresiasi INFORMATIF (§5.2). */
export const ASSET_USEFUL_LIFE_YEARS: Record<string, number> = {
    ELEKTRONIK: 5,
    PERABOT: 10,
    KENDARAAN: 5,
    ALAT: 8,
    BANGUNAN: 20,
    LAINNYA: 5, // fallback untuk kategori tak dikenal
};

/**
 * Hitung nilai buku informatif — straight-line granularitas bulan (§5.1):
 * `bookValue = max(0, round(cost × (1 − usedMonths/totalMonths)))`.
 * `bookValue = null` bila tanpa biaya ATAU tanggal perolehan (UI menampilkan "—").
 */
export function computeAssetBookValue(asset: {
    category: string;
    acquisitionCost: unknown; // Decimal | number | null
    acquisitionDate: Date | null;
}): { bookValue: number | null; usefulLifeYears: number } {
    const usefulLifeYears =
        ASSET_USEFUL_LIFE_YEARS[asset.category] ?? ASSET_USEFUL_LIFE_YEARS.LAINNYA;
    if (asset.acquisitionCost === null || asset.acquisitionCost === undefined) {
        return { bookValue: null, usefulLifeYears };
    }
    if (!asset.acquisitionDate) {
        return { bookValue: null, usefulLifeYears };
    }
    const cost = Number(asset.acquisitionCost);
    if (!Number.isFinite(cost)) {
        return { bookValue: null, usefulLifeYears };
    }
    const totalMonths = usefulLifeYears * 12;
    const [yNow, mNow] = formatYmd(new Date()).split('-').map((v) => parseInt(v, 10));
    const [yAcq, mAcq] = formatYmd(asset.acquisitionDate).split('-').map((v) => parseInt(v, 10));
    const elapsedMonths = Math.max(0, (yNow - yAcq) * 12 + (mNow - mAcq));
    const usedMonths = Math.min(elapsedMonths, totalMonths);
    const bookValue = Math.max(0, Math.round(cost * (1 - usedMonths / totalMonths)));
    return { bookValue, usefulLifeYears };
}
