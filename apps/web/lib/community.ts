/**
 * Community module (RT/RW MVP Fase 1) — shared helpers.
 * Referensi: plans/community-mvp-implementation.md §3.5.
 *
 * Catatan keamanan:
 * - NIK & Nomor KK HANYA disimpan terenkripsi (encrypt() AES-256-GCM).
 * - Response API TIDAK PERNAH memuat NIK plain — hanya flag `nikStored`.
 * - Pencarian warga hanya via fullName/code/address/phone (tanpa NIK).
 */

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
