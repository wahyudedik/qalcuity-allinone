/**
 * Community Demo Seed Module — RT 02 Melati (Fase 1: RT/RW).
 *
 * Digunakan OLEH KEDUA loader sehingga menghasilkan data IDENTIK:
 *  - packages/db/prisma/seed.ts        -> import { seedCommunityData } from "../../../apps/web/lib/seed-data/community"
 *  - apps/web/lib/seed-data/demo.ts    -> import { seedCommunityData } from "./community"
 *
 * Cakupan (plans/community-mvp-implementation.md §7.3):
 *  - Tenant BARU "rt02-melati" (isolated dari qalcuity-demo — modul community
 *    punya tenant sendiri karena konteks bisnis berbeda).
 *  - 4 custom Role (isSystem=false) — KRITIS: SYSTEM_ROLE_PERMISSIONS.ADMIN adalah
 *    daftar eksplisit, jadi ADMIN TIDAK otomatis dapat permission community.
 *  - 4 User (system role "MEMBER" + roleId -> custom role; email @rt02-melati.test).
 *  - 30 CommunityMember (W-001..W-030; 27 ACTIVE, 2 INACTIVE, 1 MOVED),
 *    NIK & Nomor KK dienkripsi AES-256-GCM via encrypt() — JANGAN pernah plain.
 *  - 3 CommunityDuesType: IURAN-BULANAN (150.000, MONTHLY),
 *    IURAN-KEBERSIHAN (50.000, MONTHLY), KAS-SOSIAL (100.000, QUARTERLY).
 *  - CommunityDuesBill periode 2026-08 / 2026-09 / 2026-10:
 *      Aug  ~100% PAID, Sep ~78% PAID / 12% PARTIAL / 10% UNPAID,
 *      Oct  ~20% PAID / 10% PARTIAL / sisanya UNPAID, + 2 VOID (warga non-ACTIVE).
 *  - CommunityDuesPayment konsisten dengan status tagihan
 *    (PAID = 1x pelunasan penuh, PARTIAL = 1x bayar sebagian).
 *  - 10 CommunityCashTransaction (4 INCOME + 6 EXPENSE; mix APPROVED /
 *    PENDING / REJECTED; SoD: bendahara mencatat, ketua approve).
 *  - 2 CommunityAnnouncement.
 *
 * Fase 2 (Surat & Kegiatan — plans/community-phase2-implementation.md §8.1):
 *  - 5 CommunityLetter (3 ISSUED dgn verifyToken 32-hex + bodySnapshot,
 *    1 DRAFT letterNumber null, 1 REVOKED + alasan).
 *  - 3 CommunityEvent (KGT/2026-001 DONE, KGT/2026-002 PLANNED,
 *    KGT/2026-003 CANCELLED tanpa publishedAt).
 *  - 2 CommunityCashTransaction TAMBAHAN (EXPENSE APPROVED, ter-link
 *    eventId -> KGT/2026-001) — kontrak angka: cash 10 -> 12, EXPENSE 6 -> 8.
 *
 * Fase 3 (Pendaftaran Peserta — plans/community-phase3-implementation.md §8):
 *  - 8 CommunityEventParticipant deterministik (7 aktif + 1 CANCELLED):
 *    KGT/2026-001 5 baris (W-001 ATTENDED; W-002/003/005 REGISTERED;
 *    W-004 CANCELLED 'Berhalangan'), KGT/2026-002 3 REGISTERED
 *    (W-001/W-006/W-007), KGT/2026-003 sengaja 0.
 *  - maxCapacity seed: KGT/2026-001 = 10, KGT/2026-002 = 30 (kuota demo UI).
 *
 * PRINSIP HARD:
 *  - Idempotent: re-run tidak pernah menduplikasi (upsert / findUnique by
 *    kunci bisnis @@unique per-tenant; created = 0 pada run ke-2).
 *  - Tanpa Math.random() — semua nilai deterministik via mulberry32(seed).
 *  - ASCII-safe (DB WIN1252) — tanpa karakter non-ASCII pada data.
 *  - Setiap query menyaring tenantId.
 */

import type { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { addDays, mulberry32, toUtcDate } from './finance';
import { encrypt, safeDecrypt } from '../encryption';

// ============================================================
// 1. Konstanta & dataset statis
// ============================================================

/** Anchor date default — SAMA dengan finance.ts / hr.ts / crm.ts. */
export const COMMUNITY_DEFAULT_ANCHOR_DATE = '2026-10-10';

/** Slug tenant community (isolated dari qalcuity-demo). */
export const COMMUNITY_TENANT_SLUG = 'rt02-melati';

/** Password seed untuk 4 akun pengurus/warga (documented — demo only). */
const COMMUNITY_SEED_PASSWORD = 'community123';

/** Periode tagihan iuran bulanan & kas sosial. */
const COMMUNITY_PERIODS = ['2026-08', '2026-09', '2026-10'];

// ─── Custom roles (spec §4.2 — KRITIS: ADMIN tidak otomatis dapat community) ──

export interface CommunityRoleSpec {
    name: string;
    description: string;
    permissions: string[];
}

export const COMMUNITY_ROLES: CommunityRoleSpec[] = [
    {
        name: 'KETUA',
        description: 'Ketua RT — view, manage, approve, finance (termasuk approve kas).',
        permissions: ['community:view', 'community:manage', 'community:finance', 'community:approve'],
    },
    {
        name: 'BENDAHARA',
        // Spec §4.2: BENDAHARA view+finance SAJA (tanpa approve — SoD: pencatat kas tidak boleh approve sendiri).
        description: 'Bendahara RT — view & finance (pencatat iuran/kas; tanpa approve — SoD).',
        permissions: ['community:view', 'community:finance'],
    },
    {
        name: 'SEKRETARIS',
        description: 'Sekretaris RT — view & manage (data warga & pengumuman).',
        permissions: ['community:view', 'community:manage'],
    },
    {
        name: 'WARGA',
        description: 'Warga biasa — hanya portal (lihat tagihan & riwayat sendiri).',
        permissions: ['community:portal'],
    },
];

// ─── Users pengurus (email domain @rt02-melati.test) ─────────────────────────

export interface CommunityUserSpec {
    email: string;
    name: string;
    roleName: string;
}

export const COMMUNITY_USERS: CommunityUserSpec[] = [
    { email: 'ketua@rt02-melati.test', name: 'Ketua RT 02', roleName: 'KETUA' },
    { email: 'bendahara@rt02-melati.test', name: 'Bendahara RT 02', roleName: 'BENDAHARA' },
    { email: 'sekretaris@rt02-melati.test', name: 'Sekretaris RT 02', roleName: 'SEKRETARIS' },
    { email: 'warga@rt02-melati.test', name: 'Warga PortAL', roleName: 'WARGA' },
];

// ─── Members (30 — W-001..W-030) ─────────────────────────────────────────────

export interface CommunityMemberSpec {
    code: string;
    fullName: string;
    gender: string; // L, P
    birthYear: number;
    address: string;
    houseStatus: string; // OWNER, RENT
    status: string; // ACTIVE, INACTIVE, MOVED
}

/** 27 ACTIVE (W-001..W-027), 1 MOVED (W-028), 2 INACTIVE (W-029, W-030). */
export const COMMUNITY_MEMBERS: CommunityMemberSpec[] = [
    { code: 'W-001', fullName: 'Budi Santoso', gender: 'L', birthYear: 1978, address: 'Blok A No. 1', houseStatus: 'OWNER', status: 'ACTIVE' },
    { code: 'W-002', fullName: 'Siti Aminah', gender: 'P', birthYear: 1981, address: 'Blok A No. 2', houseStatus: 'OWNER', status: 'ACTIVE' },
    { code: 'W-003', fullName: 'Agus Wijaya', gender: 'L', birthYear: 1975, address: 'Blok A No. 3', houseStatus: 'RENT', status: 'ACTIVE' },
    { code: 'W-004', fullName: 'Dewi Lestari', gender: 'P', birthYear: 1986, address: 'Blok A No. 5', houseStatus: 'OWNER', status: 'ACTIVE' },
    { code: 'W-005', fullName: 'Rudi Hartono', gender: 'L', birthYear: 1972, address: 'Blok A No. 7', houseStatus: 'OWNER', status: 'ACTIVE' },
    { code: 'W-006', fullName: 'Ratna Sari', gender: 'P', birthYear: 1990, address: 'Blok A No. 9', houseStatus: 'RENT', status: 'ACTIVE' },
    { code: 'W-007', fullName: 'Joko Susilo', gender: 'L', birthYear: 1969, address: 'Blok B No. 1', houseStatus: 'OWNER', status: 'ACTIVE' },
    { code: 'W-008', fullName: 'Sri Wahyuni', gender: 'P', birthYear: 1984, address: 'Blok B No. 2', houseStatus: 'OWNER', status: 'ACTIVE' },
    { code: 'W-009', fullName: 'Bambang Prasetyo', gender: 'L', birthYear: 1977, address: 'Blok B No. 4', houseStatus: 'OWNER', status: 'ACTIVE' },
    { code: 'W-010', fullName: 'Endang Suryani', gender: 'P', birthYear: 1988, address: 'Blok B No. 6', houseStatus: 'RENT', status: 'ACTIVE' },
    { code: 'W-011', fullName: 'Dwi Cahyono', gender: 'L', birthYear: 1980, address: 'Blok B No. 8', houseStatus: 'OWNER', status: 'ACTIVE' },
    { code: 'W-012', fullName: 'Retno Palupi', gender: 'P', birthYear: 1983, address: 'Blok B No. 10', houseStatus: 'OWNER', status: 'ACTIVE' },
    { code: 'W-013', fullName: 'Hendra Gunawan', gender: 'L', birthYear: 1974, address: 'Blok C No. 1', houseStatus: 'OWNER', status: 'ACTIVE' },
    { code: 'W-014', fullName: 'Maya Anggraini', gender: 'P', birthYear: 1992, address: 'Blok C No. 3', houseStatus: 'RENT', status: 'ACTIVE' },
    { code: 'W-015', fullName: 'Toni Kurniawan', gender: 'L', birthYear: 1979, address: 'Blok C No. 5', houseStatus: 'OWNER', status: 'ACTIVE' },
    { code: 'W-016', fullName: 'Lina Marlina', gender: 'P', birthYear: 1987, address: 'Blok C No. 7', houseStatus: 'OWNER', status: 'ACTIVE' },
    { code: 'W-017', fullName: 'Yusuf Maulana', gender: 'L', birthYear: 1982, address: 'Blok C No. 9', houseStatus: 'RENT', status: 'ACTIVE' },
    { code: 'W-018', fullName: 'Indah Permata', gender: 'P', birthYear: 1991, address: 'Blok D No. 2', houseStatus: 'OWNER', status: 'ACTIVE' },
    { code: 'W-019', fullName: 'Rizky Ramadhan', gender: 'L', birthYear: 1993, address: 'Blok D No. 4', houseStatus: 'RENT', status: 'ACTIVE' },
    { code: 'W-020', fullName: 'Nabila Putri', gender: 'P', birthYear: 1995, address: 'Blok D No. 6', houseStatus: 'OWNER', status: 'ACTIVE' },
    { code: 'W-021', fullName: 'Fajar Nugroho', gender: 'L', birthYear: 1976, address: 'Blok D No. 8', houseStatus: 'OWNER', status: 'ACTIVE' },
    { code: 'W-022', fullName: 'Ayu Wulandari', gender: 'P', birthYear: 1989, address: 'Blok D No. 10', houseStatus: 'RENT', status: 'ACTIVE' },
    { code: 'W-023', fullName: 'Slamet Riyadi', gender: 'L', birthYear: 1966, address: 'Blok E No. 1', houseStatus: 'OWNER', status: 'ACTIVE' },
    { code: 'W-024', fullName: 'Fitri Handayani', gender: 'P', birthYear: 1985, address: 'Blok E No. 3', houseStatus: 'OWNER', status: 'ACTIVE' },
    { code: 'W-025', fullName: 'Adi Sutopo', gender: 'L', birthYear: 1981, address: 'Blok E No. 5', houseStatus: 'RENT', status: 'ACTIVE' },
    { code: 'W-026', fullName: 'Wulan Sari', gender: 'P', birthYear: 1994, address: 'Blok E No. 7', houseStatus: 'OWNER', status: 'ACTIVE' },
    { code: 'W-027', fullName: 'Gunawan Saputra', gender: 'L', birthYear: 1973, address: 'Blok E No. 9', houseStatus: 'OWNER', status: 'ACTIVE' },
    { code: 'W-028', fullName: 'Rina Wijayanti', gender: 'P', birthYear: 1986, address: 'Blok F No. 1', houseStatus: 'RENT', status: 'MOVED' },
    { code: 'W-029', fullName: 'Hadi Pranoto', gender: 'L', birthYear: 1970, address: 'Blok F No. 3', houseStatus: 'OWNER', status: 'INACTIVE' },
    { code: 'W-030', fullName: 'Tuti Herawati', gender: 'P', birthYear: 1983, address: 'Blok F No. 5', houseStatus: 'OWNER', status: 'INACTIVE' },
];

// ─── Dues types (3) ──────────────────────────────────────────────────────────

export interface CommunityDuesTypeSpec {
    code: string;
    name: string;
    description: string;
    amount: number;
    frequency: string; // MONTHLY, QUARTERLY
}

export const COMMUNITY_DUES_TYPES: CommunityDuesTypeSpec[] = [
    {
        code: 'IURAN-BULANAN',
        name: 'Iuran Bulanan',
        description: 'Iuran keamanan & pengelolaan bulanan warga.',
        amount: 150000,
        frequency: 'MONTHLY',
    },
    {
        code: 'IURAN-KEBERSIHAN',
        name: 'Iuran Kebersihan',
        description: 'Iuran kebersihan lingkungan bulanan.',
        amount: 50000,
        frequency: 'MONTHLY',
    },
    {
        code: 'KAS-SOSIAL',
        name: 'Kas Sosial',
        description: 'Kas sosial triwulan (dana kegiatan & bantuan warga).',
        amount: 100000,
        frequency: 'QUARTERLY',
    },
];

/** Bill VOID — warga non-ACTIVE untuk periode berjalan (spec: 1-2 VOID). */
const COMMUNITY_VOID_BILLS: Array<{ memberCode: string; typeCode: string; period: string }> = [
    { memberCode: 'W-028', typeCode: 'IURAN-BULANAN', period: '2026-10' }, // MOVED — tagihan periode berjalan dibatalkan
    { memberCode: 'W-029', typeCode: 'IURAN-KEBERSIHAN', period: '2026-10' }, // INACTIVE — dibatalkan
];

// ─── Cash transactions (10 — SoD: bendahara mencatat, ketua approve) ────────

export interface CommunityCashTxSpec {
    type: string; // INCOME, EXPENSE
    category: string;
    duesTypeCode?: string; // sumber iuran (INCOME)
    amount: number;
    description: string;
    txDate: string; // YYYY-MM-DD
    status: string; // APPROVED, PENDING, REJECTED
    rejectReason?: string;
}

export const COMMUNITY_CASH_TXS: CommunityCashTxSpec[] = [
    // INCOME (4): 3 APPROVED + 1 PENDING
    { type: 'INCOME', category: 'Iuran', duesTypeCode: 'IURAN-BULANAN', amount: 4500000, description: 'Setoran iuran bulanan warga periode 2026-08', txDate: '2026-09-05', status: 'APPROVED' },
    { type: 'INCOME', category: 'Iuran', duesTypeCode: 'IURAN-KEBERSIHAN', amount: 1450000, description: 'Setoran iuran kebersihan warga periode 2026-08', txDate: '2026-09-07', status: 'APPROVED' },
    { type: 'INCOME', category: 'Iuran', duesTypeCode: 'IURAN-BULANAN', amount: 3900000, description: 'Setoran iuran bulanan warga periode 2026-09', txDate: '2026-10-05', status: 'APPROVED' },
    { type: 'INCOME', category: 'Iuran', duesTypeCode: 'IURAN-BULANAN', amount: 1200000, description: 'Setoran iuran bulanan warga periode 2026-10 (sebagian)', txDate: '2026-10-10', status: 'PENDING' },
    // EXPENSE (6): 4 APPROVED + 1 PENDING + 1 REJECTED
    { type: 'EXPENSE', category: 'Kebersihan', amount: 850000, description: 'Bayar angkut sampah PT Bersih Indah (Sep 2026)', txDate: '2026-09-10', status: 'APPROVED' },
    { type: 'EXPENSE', category: 'Keamanan', amount: 1200000, description: 'Honor petugas ronda malam September 2026', txDate: '2026-09-30', status: 'APPROVED' },
    { type: 'EXPENSE', category: 'Perbaikan', amount: 640000, description: 'Perbaikan pos ronda RT (cat & lampu)', txDate: '2026-10-02', status: 'APPROVED' },
    { type: 'EXPENSE', category: 'Sosial', amount: 500000, description: 'Santunan warga sakit (Kartu Warga No. W-023)', txDate: '2026-10-08', status: 'APPROVED' },
    { type: 'EXPENSE', category: 'Perbaikan', amount: 350000, description: 'Ganti lampu penerangan jalan Blok D', txDate: '2026-10-10', status: 'PENDING' },
    { type: 'EXPENSE', category: 'Rapat', amount: 275000, description: 'Konsumsi rapat warga bulanan', txDate: '2026-10-09', status: 'REJECTED', rejectReason: 'Nota tidak lengkap — mohon lampirkan kwitansi asli sebelum diajukan ulang.' },
];

// ─── Announcements (2) ───────────────────────────────────────────────────────

const COMMUNITY_ANNOUNCEMENTS = [
    {
        title: 'Rapat Bulanan RT — Sabtu, 17 Okt 2026',
        content:
            'Diberitahukan kepada seluruh warga RT 02 Melati bahwa rapat bulanan akan dilaksanakan pada:\n\n' +
            'Hari/Tanggal : Sabtu, 17 Oktober 2026\n' +
            'Waktu        : 19.30 WIB s/d selesai\n' +
            'Tempat       : Balai Warga RT 02 Melati\n\n' +
            'Agenda: (1) Laporan kas Oktober, (2) Persiapan kegiatan 17-an, (3) Usulan perbaikan drainase Blok C.\n' +
            'Mohon kehadiran perwakilan setiap rumah tangga. Terima kasih.',
        category: 'MEETING',
        priority: 'HIGH',
    },
    {
        title: 'Pembayaran Iuran Oktober 2026 Dibuka',
        content:
            'Pembayaran iuran bulanan Oktober 2026 telah dibuka per 10 Oktober 2026.\n\n' +
            'Rincian: Iuran Bulanan Rp150.000/bulan, Iuran Kebersihan Rp50.000/bulan.\n' +
            'Batas waktu pembayaran: 25 Oktober 2026 (kantor pengurus / bendahara RT).\n' +
            'Pembayaran setelah tanggal tersebut dikenakan catatan keterlambatan pada riwayat warga.',
        category: 'PAYMENT',
        priority: 'NORMAL',
    },
];

// ─── Fase 2: Surat pengantar (5) ─────────────────────────────────────────────
// Nomor: SRT/<PNG|DOM|SKT|KTR>/<YYYY>-<seq3> — DI-ASSIGN saat ISSUE (DRAFT null).
// verifyToken & bodySnapshot hanya untuk ISSUED/REVOKED (pola §3.3/§3.6 spec).

export interface CommunityLetterSpec {
    /** Nomor terbit (null untuk DRAFT). */
    letterNumber: string | null;
    letterType: string; // PENGANTAR, DOMISILI, SKTM, KETERANGAN_LAIN
    memberCode: string; // Pemohon (kode warga seed)
    purpose: string;
    destination?: string;
    status: string; // DRAFT, ISSUED, REVOKED
    /** Tanggal penerbitan (ISSUED/REVOKED) — YYYY-MM-DD. */
    issuedAtDate?: string;
    /** Tanggal pembatalan (REVOKED) — YYYY-MM-DD. */
    revokedAtDate?: string;
    revokeReason?: string;
    /** Tanggal record dibuat — YYYY-MM-DD. */
    createdAtDate: string;
}

export const COMMUNITY_LETTERS: CommunityLetterSpec[] = [
    {
        letterNumber: 'SRT/PNG/2026-001',
        letterType: 'PENGANTAR',
        memberCode: 'W-003',
        purpose: 'Pengurusan paspor',
        destination: 'Imigrasi Kelas I Cibinong',
        status: 'ISSUED',
        issuedAtDate: '2026-09-15',
        createdAtDate: '2026-09-14',
    },
    {
        letterNumber: 'SRT/DOM/2026-001',
        letterType: 'DOMISILI',
        memberCode: 'W-007',
        purpose: 'Pengurusan SKCK',
        destination: 'Polsek Cibinong',
        status: 'ISSUED',
        issuedAtDate: '2026-09-28',
        createdAtDate: '2026-09-27',
    },
    {
        letterNumber: 'SRT/SKT/2026-001',
        letterType: 'SKTM',
        memberCode: 'W-012',
        purpose: 'Pengurusan bantuan sosial',
        destination: 'Kantor Kelurahan Sukamaju',
        status: 'ISSUED',
        issuedAtDate: '2026-10-05',
        createdAtDate: '2026-10-04',
    },
    {
        letterNumber: null,
        letterType: 'PENGANTAR',
        memberCode: 'W-015',
        purpose: 'Pengurusan nikah',
        status: 'DRAFT',
        createdAtDate: '2026-10-10',
    },
    {
        letterNumber: 'SRT/PNG/2026-002',
        letterType: 'PENGANTAR',
        memberCode: 'W-019',
        purpose: 'Pengurusan beasiswa',
        destination: 'Kantor Yayasan Pendidikan',
        status: 'REVOKED',
        issuedAtDate: '2026-10-01',
        revokedAtDate: '2026-10-08',
        revokeReason: 'Dicabut - keperluan batal',
        createdAtDate: '2026-09-30',
    },
];

// ─── Fase 2: Kegiatan (3) ────────────────────────────────────────────────────
// Nomor: KGT/<YYYY>-<seq3> — di-assign saat CREATE (event selalu punya nomor).
// Jam deterministik dalam UTC (WIB = UTC+7): rapat 19:30 WIB = 12:30Z.

export interface CommunityEventSpec {
    eventNumber: string;
    title: string;
    description?: string;
    category?: string; // RAPAT, KERJA_BAKTI, PERAYAAN, SOSIAL, LAINNYA
    startsAt: Date;
    endsAt?: Date;
    location?: string;
    budgetAmount?: number;
    status: string; // PLANNED, ONGOING, DONE, CANCELLED
    publishedAt?: Date | null;
    /** Kapasitas peserta opsional (null = tanpa batas — Fase 3). */
    maxCapacity?: number;
    /** Link opsional ke pengumuman berdasarkan title (idempotent resolve). */
    linkAnnouncementTitle?: string;
}

export const COMMUNITY_EVENTS: CommunityEventSpec[] = [
    {
        eventNumber: 'KGT/2026-001',
        title: 'Kerja Bakti Bersih Saluran Air',
        description:
            'Kerja bakti bersih-bersih saluran air & drainase lingkungan RT 02 Melati. ' +
            'Perkakas disediakan pengurus; mohon bawa cangkul/sabit masing-masing.',
        category: 'KERJA_BAKTI',
        startsAt: new Date(Date.UTC(2026, 8, 20, 1, 0)), // 20 Sep 08:00 WIB
        endsAt: new Date(Date.UTC(2026, 8, 20, 4, 0)), // 20 Sep 11:00 WIB
        location: 'Lingkungan Blok A s/d Blok C',
        budgetAmount: 750000,
        status: 'DONE',
        publishedAt: new Date(Date.UTC(2026, 8, 10)), // tayang 10 Sep (lampau)
        maxCapacity: 10, // Fase 3 — kuota demo terlihat di UI
    },
    {
        eventNumber: 'KGT/2026-002',
        title: 'Rapat Bulanan RT',
        description:
            'Agenda: (1) Laporan kas Oktober, (2) Persiapan kegiatan 17-an, ' +
            '(3) Usulan perbaikan drainase Blok C.',
        category: 'RAPAT',
        startsAt: new Date(Date.UTC(2026, 9, 17, 12, 30)), // 17 Okt 19:30 WIB
        location: 'Balai Warga RT 02 Melati',
        status: 'PLANNED',
        publishedAt: new Date(Date.UTC(2026, 9, 10)), // tayang 10 Okt (anchor)
        maxCapacity: 30, // Fase 3 — kuota demo terlihat di UI
        linkAnnouncementTitle: 'Rapat Bulanan RT - Sabtu, 17 Okt 2026',
    },
    {
        eventNumber: 'KGT/2026-003',
        title: 'Posyandu Balita',
        description: 'Posyandu balita rutin — ditunda, menunggu koordinasi kader kesehatan.',
        category: 'SOSIAL',
        startsAt: new Date(Date.UTC(2026, 10, 5, 1, 0)), // 5 Nov 08:00 WIB
        location: 'Balai Warga RT 02 Melati',
        status: 'CANCELLED',
        publishedAt: null, // draft internal — tidak tayang di portal
    },
];

// ─── Fase 2: Kas transaksi terkait kegiatan (2 — EXPENSE APPROVED) ───────────
// Realisasi anggaran KGT/2026-001 (kerja bakti): 300.000 + 180.000 = 480.000.
// SoD tetap: bendahara mencatat, ketua approve. Kontrak: EXPENSE 6 -> 8.

export interface CommunityEventCashTxSpec {
    eventNumber: string;
    type: string; // INCOME, EXPENSE
    category: string;
    amount: number;
    description: string;
    txDate: string; // YYYY-MM-DD
    status: string; // APPROVED (deterministik — semua angka realisasi APPROVED)
}

export const COMMUNITY_EVENT_CASH_TXS: CommunityEventCashTxSpec[] = [
    {
        eventNumber: 'KGT/2026-001',
        type: 'EXPENSE',
        category: 'Kegiatan',
        amount: 300000,
        description: 'Konsumsi kerja bakti bersih saluran air',
        txDate: '2026-09-20',
        status: 'APPROVED',
    },
    {
        eventNumber: 'KGT/2026-001',
        type: 'EXPENSE',
        category: 'Kegiatan',
        amount: 180000,
        description: 'Pembelian perkakas kerja bakti (sekop & karung)',
        txDate: '2026-09-19',
        status: 'APPROVED',
    },
];

// ─── Fase 3: Peserta kegiatan (8 baris — 7 aktif + 1 CANCELLED) ──────────────
// Deterministik & idempotent: unique [tenantId, eventId, memberId] — baris yang
// sudah ada dilewati (findUnique), tanpa konsumsi rng(). registeredAt <= now.

export interface CommunityEventParticipantSpec {
    eventNumber: string;
    memberCode: string;
    status: string; // REGISTERED, ATTENDED, CANCELLED
    note?: string;
    registeredAt: Date;
}

export const COMMUNITY_EVENT_PARTICIPANTS: CommunityEventParticipantSpec[] = [
    // KGT/2026-001 (DONE, published 2026-09-10) — 5 baris
    { eventNumber: 'KGT/2026-001', memberCode: 'W-001', status: 'ATTENDED', registeredAt: new Date(Date.UTC(2026, 8, 15)) },
    { eventNumber: 'KGT/2026-001', memberCode: 'W-002', status: 'REGISTERED', registeredAt: new Date(Date.UTC(2026, 8, 15)) },
    { eventNumber: 'KGT/2026-001', memberCode: 'W-003', status: 'REGISTERED', registeredAt: new Date(Date.UTC(2026, 8, 16)) },
    { eventNumber: 'KGT/2026-001', memberCode: 'W-004', status: 'CANCELLED', note: 'Berhalangan', registeredAt: new Date(Date.UTC(2026, 8, 16)) },
    { eventNumber: 'KGT/2026-001', memberCode: 'W-005', status: 'REGISTERED', registeredAt: new Date(Date.UTC(2026, 8, 17)) },
    // KGT/2026-002 (PLANNED, published 2026-10-10) — 3 REGISTERED
    { eventNumber: 'KGT/2026-002', memberCode: 'W-001', status: 'REGISTERED', registeredAt: new Date(Date.UTC(2026, 9, 11)) },
    { eventNumber: 'KGT/2026-002', memberCode: 'W-006', status: 'REGISTERED', registeredAt: new Date(Date.UTC(2026, 9, 11)) },
    { eventNumber: 'KGT/2026-002', memberCode: 'W-007', status: 'REGISTERED', registeredAt: new Date(Date.UTC(2026, 9, 12)) },
    // KGT/2026-003 (CANCELLED, unpublished): sengaja 0 peserta
];

// ============================================================
// 2. Enkripsi NIK (SMTP_ENCRYPTION_KEY fallback loader)
// ============================================================

/**
 * Pastikan process.env.SMTP_ENCRYPTION_KEY tersedia untuk encrypt().
 *
 * Jebakan diketahui: key HANYA ada di apps/web/.env.production — seed yang
 * dijalankan dari packages/db (`npx prisma db seed`) tidak memuatnya, padahal
 * encrypt() membaca process.env saat dipanggil. Loader fallback ini membaca
 * file env tersebut bila variabelnya belum ter-set.
 */
function ensureEncryptionKey(): void {
    if (process.env.SMTP_ENCRYPTION_KEY) return;

    const candidates: string[] = [];
    // __dirname = apps/web/lib/seed-data (tsx CJS mode) -> ../../.env.production
    if (typeof __dirname !== 'undefined') {
        candidates.push(path.resolve(__dirname, '../../.env.production'));
        candidates.push(path.resolve(__dirname, '../../.env'));
    }
    // Fallback berbasis cwd (packages/db saat `npx prisma db seed`)
    candidates.push(path.resolve(process.cwd(), 'apps/web/.env.production'));
    candidates.push(path.resolve(process.cwd(), '../apps/web/.env.production'));
    candidates.push(path.resolve(process.cwd(), '.env.production'));
    candidates.push(path.resolve(process.cwd(), '.env'));

    for (const file of candidates) {
        try {
            if (!fs.existsSync(file)) continue;
            const content = fs.readFileSync(file, 'utf8');
            const match = content.match(/^SMTP_ENCRYPTION_KEY=(.+)$/m);
            // .env dapat menyimpan nilai dengan tanda kutip: KEY="abc...".
            // Strip tanda kutip lalu trim agar validasi 64-hex lolos.
            const value = match?.[1]?.trim().replace(/^["'](.*)["']$/, '$1').trim();
            if (value && /^[0-9a-fA-F]{64}$/.test(value)) {
                process.env.SMTP_ENCRYPTION_KEY = value;
                console.log(`[Community Seed] SMTP_ENCRYPTION_KEY loaded from ${file}`);
                return;
            }
        } catch {
            // Kandidat tidak terbaca — lanjut ke kandidat berikutnya.
        }
    }

    throw new Error(
        '[Community Seed] SMTP_ENCRYPTION_KEY tidak ditemukan — dibutuhkan untuk enkripsi NIK warga. ' +
        'Set env SMTP_ENCRYPTION_KEY (64 hex chars) atau tambahkan ke apps/web/.env.production.'
    );
}

/** NIK 16 digit deterministik (bukan NIK asli siapapun — data dummy aman). */
function buildDummyNik(prefix: string, rng: () => number, seq: number): string {
    const mid = String(Math.floor(rng() * 100000000)).padStart(8, '0');
    const tail = String(seq).padStart(4, '0');
    return `${prefix}${mid}${tail}`;
}

// ============================================================
// 3. Seeder (idempotent, tenant-scoped, isolated tenant rt02-melati)
// ============================================================

export interface SeedCommunityOptions {
    /** Slug tenant community. Default 'rt02-melati'. */
    tenantSlug?: string;
    /** Anchor date deterministik. Default '2026-10-10'. */
    anchorDate?: string;
}

export interface CommunityEntityRef {
    id: string;
    name: string;
}

export interface CommunityUserRef extends CommunityEntityRef {
    email: string;
}

export interface SeedCommunityResult {
    tenant: { id: string; slug: string };
    /** Total record dalam tenant community (termasuk data existing). */
    counts: {
        roles: number;
        users: number;
        members: number;
        duesTypes: number;
        bills: number;
        payments: number;
        cashTransactions: number;
        announcements: number;
        letters: number;
        events: number;
        participants: number;
    };
    /** Jumlah record yang BARU dibuat pada run ini (0 = idempotent). */
    created: {
        roles: number;
        users: number;
        members: number;
        duesTypes: number;
        bills: number;
        payments: number;
        cashTransactions: number;
        announcements: number;
        letters: number;
        events: number;
        participants: number;
    };
    roles: CommunityEntityRef[];
    users: CommunityUserRef[];
}

export async function seedCommunityData(
    db: Prisma.TransactionClient,
    options: SeedCommunityOptions = {}
): Promise<SeedCommunityResult> {
    const tenantSlug = options.tenantSlug ?? COMMUNITY_TENANT_SLUG;
    const anchorDate = options.anchorDate ?? COMMUNITY_DEFAULT_ANCHOR_DATE;
    const rng = mulberry32(772026); // seed deterministik khusus community

    ensureEncryptionKey();

    // ─── Tenant rt02-melati (upsert by slug — isolated) ──────────
    const tenant = await db.tenant.upsert({
        where: { slug: tenantSlug },
        update: {},
        create: {
            name: 'RT 02 Melati',
            slug: tenantSlug,
            email: 'sekretariat@rt02melati.test',
            phone: '022-70000002',
            address: 'Jl. Melati Raya No. 2, Kel. Sukamaju, Kota Bandung',
            subscriptionStatus: 'TRIAL',
            trialEndsAt: addDays(toUtcDate(anchorDate), 30),
        },
        select: { id: true, slug: true, name: true, address: true, settings: true },
    });
    const tenantId = tenant.id;

    // ─── Custom Roles (4 — KRITIS: ADMIN tidak otomatis dapat community) ───
    const roles: CommunityEntityRef[] = [];
    let rolesCreated = 0;
    for (const spec of COMMUNITY_ROLES) {
        const existing = await db.role.findUnique({
            where: { tenantId_name: { tenantId, name: spec.name } },
            select: { id: true, name: true, permissions: true },
        });
        if (existing) {
            // Sinkronkan permissions bila berubah (idempotent, aman di re-run).
            const current = JSON.stringify(existing.permissions ?? []);
            const target = JSON.stringify(spec.permissions);
            if (current !== target) {
                await db.role.update({
                    where: { id: existing.id },
                    data: { permissions: spec.permissions },
                });
            }
            roles.push({ id: existing.id, name: existing.name });
        } else {
            const created = await db.role.create({
                data: {
                    tenantId,
                    name: spec.name,
                    description: spec.description,
                    isSystem: false, // custom role — boleh dikelola tenant
                    permissions: spec.permissions,
                },
                select: { id: true, name: true },
            });
            roles.push(created);
            rolesCreated += 1;
        }
    }
    const roleIdByName = new Map(roles.map((r) => [r.name, r.id]));

    // ─── Users (4 — system role MEMBER + roleId custom role) ─────
    // JWT menyimpan `user.role` = "MEMBER"; permission community resolve
    // runtime via roleId -> customRole.permissions (getUserPermissions).
    const users: CommunityUserRef[] = [];
    let usersCreated = 0;
    for (const spec of COMMUNITY_USERS) {
        const roleId = roleIdByName.get(spec.roleName) ?? null;
        const existing = await db.user.findUnique({
            where: { email: spec.email },
            select: { id: true, name: true, email: true },
        });
        if (existing) {
            users.push(existing);
        } else {
            const passwordHash = await bcrypt.hash(COMMUNITY_SEED_PASSWORD, 10);
            const created = await db.user.create({
                data: {
                    email: spec.email,
                    name: spec.name,
                    passwordHash,
                    role: 'MEMBER',
                    roleId,
                    tenantId,
                    isActive: true,
                },
                select: { id: true, name: true, email: true },
            });
            users.push(created);
            usersCreated += 1;
        }
    }
    const userIdByEmail = new Map(users.map((u) => [u.email, u.id]));
    const ketuaId = userIdByEmail.get('ketua@rt02-melati.test') ?? null;
    const bendaharaId = userIdByEmail.get('bendahara@rt02-melati.test') ?? null;
    const sekretarisId = userIdByEmail.get('sekretaris@rt02-melati.test') ?? null;
    const wargaUserId = userIdByEmail.get('warga@rt02-melati.test') ?? null;
    const createdBy = sekretarisId ?? ketuaId ?? 'system';

    // ─── Members (30 — NIK/NKK terenkripsi, W-001 link user portal) ──
    const members: CommunityEntityRef[] = [];
    let membersCreated = 0;
    for (let i = 0; i < COMMUNITY_MEMBERS.length; i++) {
        const spec = COMMUNITY_MEMBERS[i];
        // RNG DISCIPLINE: nilai acak SELALU dihasilkan SEBELUM cek idempoten.
        // Konsumsi rng() tidak boleh bergantung pada kondisi DB — run ke-2 dst
        // harus memakai stream yang sama persis dengan run pertama, kalau tidak
        // plan tagihan di bawah bergeser dan pembayaran yatim tercipta.
        const nik = buildDummyNik('3273', rng, i + 1);
        const nkk = buildDummyNik('3273', rng, 9000 + i + 1);
        const joinedYear = 2015 + Math.floor(rng() * 11); // 2015..2025
        const joinedMonth = 1 + Math.floor(rng() * 12);
        const joinedDay = 1 + Math.floor(rng() * 27);
        const existing = await db.communityMember.findUnique({
            where: { tenantId_code: { tenantId, code: spec.code } },
            select: { id: true, fullName: true },
        });
        if (existing) {
            members.push({ id: existing.id, name: existing.fullName });
            continue;
        }
        // W-001 di-link ke akun portal warga (relasi opsional User — Subtask H).
        const linkPortal = i === 0 && wargaUserId !== null;
        const created = await db.communityMember.create({
            data: {
                tenantId,
                code: spec.code,
                fullName: spec.fullName,
                nikEncrypted: encrypt(nik),
                nomorKkEncrypted: encrypt(nkk),
                gender: spec.gender,
                birthDate: toUtcDate(`${spec.birthYear}-06-15`),
                birthPlace: 'Bandung',
                address: spec.address,
                rtRw: '002/006',
                houseStatus: spec.houseStatus,
                phone: `0812345${String(10000 + i)}`,
                status: spec.status,
                joinedAt: toUtcDate(
                    `${joinedYear}-${String(joinedMonth).padStart(2, '0')}-${String(joinedDay).padStart(2, '0')}`
                ),
                userId: linkPortal ? wargaUserId : null,
                userName: linkPortal ? 'Warga PortAL' : null,
                createdBy,
            },
            select: { id: true, fullName: true },
        });
        members.push({ id: created.id, name: created.fullName });
        membersCreated += 1;
    }
    const memberIdByCode = new Map(
        COMMUNITY_MEMBERS.map((spec, idx) => [spec.code, members[idx]?.id]).filter(
            (pair): pair is [string, string] => typeof pair[1] === 'string'
        )
    );

    // ─── Dues Types (3) ──────────────────────────────────────────
    const duesTypes: CommunityEntityRef[] = [];
    let duesTypesCreated = 0;
    for (const spec of COMMUNITY_DUES_TYPES) {
        const existing = await db.communityDuesType.findUnique({
            where: { tenantId_code: { tenantId, code: spec.code } },
            select: { id: true, name: true },
        });
        if (existing) {
            duesTypes.push(existing);
        } else {
            const created = await db.communityDuesType.create({
                data: {
                    tenantId,
                    code: spec.code,
                    name: spec.name,
                    description: spec.description,
                    amount: spec.amount,
                    frequency: spec.frequency,
                    isActive: true,
                    createdBy,
                },
                select: { id: true, name: true },
            });
            duesTypes.push(created);
            duesTypesCreated += 1;
        }
    }
    const duesTypeIdByCode = new Map(
        COMMUNITY_DUES_TYPES.map((spec, idx) => [spec.code, duesTypes[idx]?.id]).filter(
            (pair): pair is [string, string] => typeof pair[1] === 'string'
        )
    );

    // ─── Bills (periode 2026-08/09/10) + Payments konsisten ───────
    // Distribusi status per periode (spec §7.3):
    //   2026-08: hampir 100% PAID; 2026-09: 78% PAID / 12% PARTIAL / 10% UNPAID;
    //   2026-10: 20% PAID / 10% PARTIAL / sisanya UNPAID; + 2 VOID.
    interface BillPlan {
        memberCode: string;
        memberIdx: number;
        typeIdx: number;
        typeCode: string;
        amountDue: number;
        period: string;
        status: string;
        amountPaid: number;
        paidAt: Date | null;
    }

    const voidKeys = new Set(
        COMMUNITY_VOID_BILLS.map((v) => `${v.memberCode}|${v.typeCode}|${v.period}`)
    );

    const billPlans: BillPlan[] = [];
    for (let typeIdx = 0; typeIdx < COMMUNITY_DUES_TYPES.length; typeIdx++) {
        const typeSpec = COMMUNITY_DUES_TYPES[typeIdx];
        // MONTHLY tagih tiap periode; QUARTERLY cukup 1x di periode berjalan (2026-10).
        const periods = typeSpec.frequency === 'MONTHLY' ? COMMUNITY_PERIODS : ['2026-10'];
        for (const period of periods) {
            for (let m = 0; m < COMMUNITY_MEMBERS.length; m++) {
                const memberSpec = COMMUNITY_MEMBERS[m];
                const voidKey = `${memberSpec.code}|${typeSpec.code}|${period}`;
                let status: string;
                let amountPaid = 0;
                let paidAt: Date | null = null;
                const periodStart = toUtcDate(`${period}-05`);

                if (voidKeys.has(voidKey)) {
                    status = 'VOID';
                } else {
                    const r = rng();
                    if (period === '2026-08') {
                        status = r < 0.98 ? 'PAID' : 'UNPAID'; // hampir 100% PAID
                    } else if (period === '2026-09') {
                        status = r < 0.78 ? 'PAID' : r < 0.9 ? 'PARTIAL' : 'UNPAID';
                    } else {
                        status = r < 0.2 ? 'PAID' : r < 0.3 ? 'PARTIAL' : 'UNPAID';
                    }
                    if (status === 'PAID') {
                        amountPaid = typeSpec.amount;
                        paidAt = addDays(periodStart, 2 + Math.floor(rng() * 18)); // tgl 7..24
                    } else if (status === 'PARTIAL') {
                        // Bayar sebagian 30%..70%, dibulatkan ke 500.
                        const fraction = 0.3 + rng() * 0.4;
                        amountPaid = Math.max(500, Math.round((typeSpec.amount * fraction) / 500) * 500);
                        paidAt = addDays(periodStart, 2 + Math.floor(rng() * 18));
                    }
                }

                billPlans.push({
                    memberCode: memberSpec.code,
                    memberIdx: m,
                    typeIdx,
                    typeCode: typeSpec.code,
                    amountDue: typeSpec.amount,
                    period,
                    status,
                    amountPaid,
                    paidAt,
                });
            }
        }
    }

    // Idempotent: buat bill yang belum ada (kunci bisnis
    // tenantId_memberId_duesTypeId_period; nomor TAG/<periode>/<kodeWarga>-<kodeIuran>).
    let billsCreated = 0;
    const billIdByKey = new Map<string, string>();
    for (const plan of billPlans) {
        const memberId = memberIdByCode.get(plan.memberCode);
        const duesTypeId = duesTypeIdByCode.get(plan.typeCode);
        if (!memberId || !duesTypeId) continue;

        const billNumber = `TAG/${plan.period}/${plan.memberCode}-${plan.typeCode}`;
        const existing = await db.communityDuesBill.findUnique({
            where: {
                tenantId_memberId_duesTypeId_period: {
                    tenantId,
                    memberId,
                    duesTypeId,
                    period: plan.period,
                },
            },
            select: { id: true },
        });
        if (existing) {
            billIdByKey.set(`${plan.memberCode}|${plan.typeCode}|${plan.period}`, existing.id);
            continue;
        }
        const dueDate = toUtcDate(`${plan.period}-28`);
        const created = await db.communityDuesBill.create({
            data: {
                tenantId,
                billNumber,
                memberId,
                duesTypeId,
                period: plan.period,
                amountDue: plan.amountDue,
                amountPaid: plan.amountPaid,
                status: plan.status,
                dueDate,
                paidAt: plan.paidAt,
                createdBy,
            },
            select: { id: true },
        });
        billIdByKey.set(`${plan.memberCode}|${plan.typeCode}|${plan.period}`, created.id);
        billsCreated += 1;
    }

    // Payments — nomor BYR/<YYYYMMDD>-<seq> (seq per tanggal, collision-safe).
    let paymentsCreated = 0;
    const existingPaySeqByDay = new Map<string, number>();
    async function nextPaymentSeq(paidAt: Date): Promise<{ dayIso: string; seq: number }> {
        const dayIso = paidAt.toISOString().slice(0, 10);
        if (!existingPaySeqByDay.has(dayIso)) {
            const dayStart = toUtcDate(dayIso);
            const dayEnd = addDays(dayStart, 1);
            const count = await db.communityDuesPayment.count({
                where: { tenantId, paidAt: { gte: dayStart, lt: dayEnd } },
            });
            existingPaySeqByDay.set(dayIso, count);
        }
        const next = (existingPaySeqByDay.get(dayIso) ?? 0) + 1;
        existingPaySeqByDay.set(dayIso, next);
        return { dayIso, seq: next };
    }

    for (const plan of billPlans) {
        if (plan.status !== 'PAID' && plan.status !== 'PARTIAL') continue;
        const billId = billIdByKey.get(`${plan.memberCode}|${plan.typeCode}|${plan.period}`);
        const memberId = memberIdByCode.get(plan.memberCode);
        if (!billId || !memberId || !plan.paidAt) continue;

        // RNG DISCIPLINE: roll metode juga dihasilkan sebelum cek idempoten
        // (lihat catatan pada loop member di atas) — konsumsi rng() konstan.
        const methodRoll = rng();
        const method = methodRoll < 0.6 ? 'CASH' : methodRoll < 0.85 ? 'TRANSFER' : 'QRIS';

        // Idempotent: 1 bayar per tagihan (seed hanya membuat 1x per bill).
        const existingPayment = await db.communityDuesPayment.findFirst({
            where: { tenantId, billId },
            select: { id: true },
        });
        if (existingPayment) continue;

        const { dayIso, seq } = await nextPaymentSeq(plan.paidAt);
        const paymentNumber = `BYR/${dayIso.replace(/-/g, '')}-${String(seq).padStart(3, '0')}`;
        await db.communityDuesPayment.create({
            data: {
                tenantId,
                paymentNumber,
                billId,
                memberId,
                amount: plan.amountPaid,
                paidAt: plan.paidAt,
                method,
                createdBy: bendaharaId ?? createdBy,
            },
        });
        paymentsCreated += 1;
    }

    // ─── Cash transactions (10 — SoD: bendahara catat, ketua approve) ──
    let cashTransactionsCreated = 0;
    for (const spec of COMMUNITY_CASH_TXS) {
        const txDate = toUtcDate(spec.txDate);
        const dayIso = spec.txDate;

        // Idempotent: skip bila tx dengan tanggal + nominal + deskripsi sama sudah ada.
        // (Tanpa guard ini, run#2 membuat duplikat dengan nomor seq baru — bump loop.)
        // eslint-disable-next-line no-await-in-loop
        const existingTx = await db.communityCashTransaction.findFirst({
            where: { tenantId, txDate, amount: spec.amount, description: spec.description },
            select: { id: true },
        });
        if (existingTx) continue;

        // Satu tx per tanggal pada seed -> seq selalu 001; bump bila sudah ada.
        let seq = 1;
        let txNumber = `KAS/${dayIso.replace(/-/g, '')}-${String(seq).padStart(3, '0')}`;
        // eslint-disable-next-line no-await-in-loop
        while (await db.communityCashTransaction.findUnique({ where: { tenantId_txNumber: { tenantId, txNumber } }, select: { id: true } })) {
            seq += 1;
            txNumber = `KAS/${dayIso.replace(/-/g, '')}-${String(seq).padStart(3, '0')}`;
        }

        const isApproved = spec.status === 'APPROVED';
        const isRejected = spec.status === 'REJECTED';
        await db.communityCashTransaction.create({
            data: {
                tenantId,
                txNumber,
                type: spec.type,
                category: spec.category,
                duesTypeId: spec.duesTypeCode ? duesTypeIdByCode.get(spec.duesTypeCode) ?? null : null,
                amount: spec.amount,
                description: spec.description,
                txDate,
                status: spec.status,
                approvedBy: isApproved ? ketuaId : null,
                approvedAt: isApproved ? addDays(txDate, 1) : null,
                rejectedBy: isRejected ? ketuaId : null,
                rejectedAt: isRejected ? addDays(txDate, 1) : null,
                rejectReason: isRejected ? spec.rejectReason ?? null : null,
                createdBy: bendaharaId ?? createdBy, // SoD: pencatat ≠ approver
            },
        });
        cashTransactionsCreated += 1;
    }

    // ─── Announcements (2) ───────────────────────────────────────
    let announcementsCreated = 0;
    const announcementIdByTitle = new Map<string, string>();
    for (const spec of COMMUNITY_ANNOUNCEMENTS) {
        const existing = await db.communityAnnouncement.findFirst({
            where: { tenantId, title: spec.title },
            select: { id: true },
        });
        if (existing) {
            announcementIdByTitle.set(spec.title, existing.id);
            continue;
        }
        const createdAnnouncement = await db.communityAnnouncement.create({
            data: {
                tenantId,
                title: spec.title,
                content: spec.content,
                category: spec.category,
                priority: spec.priority,
                publishedAt: toUtcDate(anchorDate),
                expiresAt: addDays(toUtcDate(anchorDate), 60),
                isActive: true,
                createdBy: ketuaId ?? createdBy,
            },
            select: { id: true },
        });
        announcementIdByTitle.set(spec.title, createdAnnouncement.id);
        announcementsCreated += 1;
    }

    // ════════════════════════════════════════════════════════════
    // FASE 2: Surat (5) + Kegiatan (3) + Kas terkait kegiatan (2)
    // ════════════════════════════════════════════════════════════
    // RNG TERPISAH (anchor 20261013) — menjamin hasil Fase 1 (rng 772026)
    // tidak berubah apa pun urutan pemanggilan di sini.
    const rngPhase2 = mulberry32(20261013);

    /** Token verifikasi 32-hex deterministik dari PRNG (unik via collision-check). */
    function buildDeterministicHexToken(): string {
        let out = '';
        for (let i = 0; i < 16; i++) {
            out += Math.floor(rngPhase2() * 256).toString(16).padStart(2, '0');
        }
        return out;
    }

    // ─── Fase 2: Letters (5 — 3 ISSUED + 1 DRAFT + 1 REVOKED) ───
    // Idempotent: findFirst by [tenantId, letterType, memberId, purpose]
    // (kombinasi unik untuk 5 surat seed; DRAFT punya letterNumber null).
    const usedVerifyTokens = new Set<string>();
    let lettersCreated = 0;
    for (const spec of COMMUNITY_LETTERS) {
        const memberId = memberIdByCode.get(spec.memberCode);
        if (!memberId) continue;

        // eslint-disable-next-line no-await-in-loop
        const existingLetter = await db.communityLetter.findFirst({
            where: { tenantId, letterType: spec.letterType, memberId, purpose: spec.purpose },
            select: { id: true, verifyToken: true },
        });
        if (existingLetter) {
            if (existingLetter.verifyToken) usedVerifyTokens.add(existingLetter.verifyToken);
            continue;
        }

        const isIssuedOrRevoked = spec.status === 'ISSUED' || spec.status === 'REVOKED';

        // Token unik global — collision-check lokal + DB (kolom @unique global).
        let verifyToken: string | null = null;
        if (isIssuedOrRevoked) {
            // eslint-disable-next-line no-await-in-loop
            verifyToken = await (async () => {
                let candidate = buildDeterministicHexToken();
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    if (!usedVerifyTokens.has(candidate)) {
                        // eslint-disable-next-line no-await-in-loop
                        const taken = await db.communityLetter.findFirst({
                            where: { verifyToken: candidate },
                            select: { id: true },
                        });
                        if (!taken) return candidate;
                    }
                    candidate = buildDeterministicHexToken();
                }
            })();
            usedVerifyTokens.add(verifyToken);
        }

        // bodySnapshot (immutable) — hanya ISSUED/REVOKED; NIK plain hasil
        // safeDecrypt HIDUP DI SNAPSHOT INI SAJA (untuk PDF — bukan API).
        let bodySnapshot: Prisma.InputJsonValue | undefined;
        if (isIssuedOrRevoked) {
            // eslint-disable-next-line no-await-in-loop
            const memberRow = await db.communityMember.findUnique({
                where: { id: memberId },
                select: {
                    code: true, fullName: true, nikEncrypted: true,
                    address: true, rtRw: true, gender: true,
                },
            });
            const communitySettings =
                (tenant.settings as { community?: Record<string, string> | null } | null)?.community ?? null;
            bodySnapshot = {
                version: 1,
                letterNumber: spec.letterNumber,
                letterType: spec.letterType,
                purpose: spec.purpose,
                destination: spec.destination ?? null,
                issuedAt: spec.issuedAtDate ? toUtcDate(spec.issuedAtDate).toISOString() : null,
                signedByName: 'Ketua RT 02',
                member: {
                    code: memberRow?.code ?? spec.memberCode,
                    fullName: memberRow?.fullName ?? '',
                    nik: memberRow ? safeDecrypt(memberRow.nikEncrypted) : null,
                    address: memberRow?.address ?? null,
                    rtRw: memberRow?.rtRw ?? null,
                    gender: memberRow?.gender ?? null,
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

        await db.communityLetter.create({
            data: {
                tenantId,
                letterNumber: spec.letterNumber,
                letterType: spec.letterType,
                memberId,
                purpose: spec.purpose,
                destination: spec.destination ?? null,
                notes: null,
                status: spec.status,
                bodySnapshot: bodySnapshot as Prisma.InputJsonValue | undefined,
                issuedAt: spec.issuedAtDate ? toUtcDate(spec.issuedAtDate) : null,
                signedBy: isIssuedOrRevoked ? ketuaId : null,
                signedByName: isIssuedOrRevoked ? 'Ketua RT 02' : null,
                revokedAt: spec.revokedAtDate ? toUtcDate(spec.revokedAtDate) : null,
                revokedBy: spec.revokedAtDate ? ketuaId : null,
                revokeReason: spec.revokeReason ?? null,
                verifyToken,
                createdBy: sekretarisId ?? createdBy,
                createdAt: toUtcDate(spec.createdAtDate),
            },
        });
        lettersCreated += 1;
    }

    // ─── Fase 2: Events (3 — DONE / PLANNED / CANCELLED) ─────────
    // Idempotent: findUnique by [tenantId, eventNumber].
    let eventsCreated = 0;
    for (const spec of COMMUNITY_EVENTS) {
        // eslint-disable-next-line no-await-in-loop
        const existingEvent = await db.communityEvent.findUnique({
            where: { tenantId_eventNumber: { tenantId, eventNumber: spec.eventNumber } },
            select: { id: true, maxCapacity: true },
        });
        if (existingEvent) {
            // Fase 3: sinkronkan kuota — event bisa dibuat oleh seed versi
            // sebelum spec capacity ada (drift maxCapacity null vs 10/30).
            // Hanya maxCapacity yang di-sync agar edit manual field lain
            // di demo tidak tertimpa.
            const wantedCapacity = spec.maxCapacity ?? null;
            if (existingEvent.maxCapacity !== wantedCapacity) {
                await db.communityEvent.update({
                    where: { id: existingEvent.id },
                    data: { maxCapacity: wantedCapacity },
                });
            }
            continue;
        }

        await db.communityEvent.create({
            data: {
                tenantId,
                eventNumber: spec.eventNumber,
                title: spec.title,
                description: spec.description ?? null,
                category: spec.category ?? null,
                startsAt: spec.startsAt,
                endsAt: spec.endsAt ?? null,
                location: spec.location ?? null,
                maxCapacity: spec.maxCapacity ?? null,
                budgetAmount: spec.budgetAmount ?? null,
                status: spec.status,
                publishedAt: spec.publishedAt ?? null,
                announcementId: spec.linkAnnouncementTitle
                    ? announcementIdByTitle.get(spec.linkAnnouncementTitle) ?? null
                    : null,
                createdBy: sekretarisId ?? createdBy,
            },
        });
        eventsCreated += 1;
    }

    // ─── Fase 2: Kas terkait kegiatan (2 — EXPENSE APPROVED, eventId terisi) ──
    // Idempotent: findFirst by [tenantId, txDate, amount, description] (pola Fase 1).
    let eventCashCreated = 0;
    for (const spec of COMMUNITY_EVENT_CASH_TXS) {
        const txDate = toUtcDate(spec.txDate);
        const dayIso = spec.txDate;

        // eslint-disable-next-line no-await-in-loop
        const existingTx = await db.communityCashTransaction.findFirst({
            where: { tenantId, txDate, amount: spec.amount, description: spec.description },
            select: { id: true },
        });
        if (existingTx) continue;

        // eslint-disable-next-line no-await-in-loop
        const eventRow = await db.communityEvent.findUnique({
            where: { tenantId_eventNumber: { tenantId, eventNumber: spec.eventNumber } },
            select: { id: true },
        });

        // Nomor KAS/<YYYYMMDD>-<seq> collision-safe lanjutan dari urutan existing.
        let seq = 1;
        let txNumber = `KAS/${dayIso.replace(/-/g, '')}-${String(seq).padStart(3, '0')}`;
        // eslint-disable-next-line no-await-in-loop
        while (
            // eslint-disable-next-line no-await-in-loop
            await db.communityCashTransaction.findUnique({
                where: { tenantId_txNumber: { tenantId, txNumber } },
                select: { id: true },
            })
        ) {
            seq += 1;
            txNumber = `KAS/${dayIso.replace(/-/g, '')}-${String(seq).padStart(3, '0')}`;
        }

        const isApproved = spec.status === 'APPROVED';
        await db.communityCashTransaction.create({
            data: {
                tenantId,
                txNumber,
                type: spec.type,
                category: spec.category,
                amount: spec.amount,
                description: spec.description,
                txDate,
                eventId: eventRow?.id ?? null,
                status: spec.status,
                approvedBy: isApproved ? ketuaId : null,
                approvedAt: isApproved ? addDays(txDate, 1) : null,
                createdBy: bendaharaId ?? createdBy, // SoD: pencatat ≠ approver
            },
        });
        eventCashCreated += 1;
    }

    // ─── Fase 3: Peserta kegiatan (8 — 7 aktif + 1 CANCELLED) ────
    // Idempotent: findUnique by [tenantId, eventId, memberId] — baris existing
    // dilewati (status tidak dioverwrite — riwayat terjaga). Tanpa rng().
    let participantsCreated = 0;
    for (const spec of COMMUNITY_EVENT_PARTICIPANTS) {
        // eslint-disable-next-line no-await-in-loop
        const eventRow = await db.communityEvent.findUnique({
            where: { tenantId_eventNumber: { tenantId, eventNumber: spec.eventNumber } },
            select: { id: true },
        });
        if (!eventRow) continue;

        // eslint-disable-next-line no-await-in-loop
        const memberRow = await db.communityMember.findFirst({
            where: { tenantId, code: spec.memberCode },
            select: { id: true },
        });
        if (!memberRow) continue;

        // eslint-disable-next-line no-await-in-loop
        const existingParticipant = await db.communityEventParticipant.findUnique({
            where: {
                tenantId_eventId_memberId: {
                    tenantId,
                    eventId: eventRow.id,
                    memberId: memberRow.id,
                },
            },
            select: { id: true },
        });
        if (existingParticipant) continue;

        await db.communityEventParticipant.create({
            data: {
                tenantId,
                eventId: eventRow.id,
                memberId: memberRow.id,
                status: spec.status,
                note: spec.note ?? null,
                registeredAt: spec.registeredAt,
                createdBy: sekretarisId ?? createdBy,
            },
        });
        participantsCreated += 1;
    }

    // ─── Counts (total dalam tenant — termasuk data existing) ────
    const [
        rolesTotal, usersTotal, membersTotal, duesTypesTotal, billsTotal,
        paymentsTotal, cashTotal, announcementsTotal, lettersTotal, eventsTotal,
        participantsTotal,
    ] = await Promise.all([
        db.role.count({ where: { tenantId } }),
        db.user.count({ where: { tenantId } }),
        db.communityMember.count({ where: { tenantId } }),
        db.communityDuesType.count({ where: { tenantId } }),
        db.communityDuesBill.count({ where: { tenantId } }),
        db.communityDuesPayment.count({ where: { tenantId } }),
        db.communityCashTransaction.count({ where: { tenantId } }),
        db.communityAnnouncement.count({ where: { tenantId } }),
        db.communityLetter.count({ where: { tenantId } }),
        db.communityEvent.count({ where: { tenantId } }),
        db.communityEventParticipant.count({ where: { tenantId } }),
    ]);

    return {
        tenant,
        counts: {
            roles: rolesTotal,
            users: usersTotal,
            members: membersTotal,
            duesTypes: duesTypesTotal,
            bills: billsTotal,
            payments: paymentsTotal,
            cashTransactions: cashTotal,
            announcements: announcementsTotal,
            letters: lettersTotal,
            events: eventsTotal,
            participants: participantsTotal,
        },
        created: {
            roles: rolesCreated,
            users: usersCreated,
            members: membersCreated,
            duesTypes: duesTypesCreated,
            bills: billsCreated,
            payments: paymentsCreated,
            cashTransactions: cashTransactionsCreated + eventCashCreated,
            announcements: announcementsCreated,
            letters: lettersCreated,
            events: eventsCreated,
            participants: participantsCreated,
        },
        roles,
        users,
    };
}
