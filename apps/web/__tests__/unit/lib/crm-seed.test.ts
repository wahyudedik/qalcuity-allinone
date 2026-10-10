/**
 * Unit Test — CRM Demo Seed Module (apps/web/lib/seed-data/crm.ts)
 *
 * Menguji helper murni & invariant dataset statis (Subtask C2):
 *  - Dataset: Category 9, Supplier 9, Contact 23, Lead 14, Deal 14, Activity 25
 *  - Distribusi Activity: CALL 6, EMAIL 6, MEETING 5, NOTE 5, TASK 3
 *  - Referensi index (contactIdx / leadIdx / entityIdx) valid
 *  - activityDate() deterministik (anchorDate + dayOffset, UTC midnight)
 *
 * Jalankan: npx vitest run apps/web/__tests__/unit/lib/crm-seed.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
    CRM_DEFAULT_ANCHOR_DATE,
    CRM_CATEGORIES,
    CRM_SUPPLIERS,
    CRM_CONTACTS,
    CRM_LEADS,
    CRM_DEALS,
    CRM_ACTIVITIES,
    CRM_ACTIVITY_TYPE_COUNTS,
    activityDate,
    type CrmActivitySpec,
} from '../../../lib/seed-data/crm';
import { toUtcDate } from '../../../lib/seed-data/finance';

// ============================================================
// Dataset — C1 Unifikasi
// ============================================================

describe('dataset CRM', () => {
    it('konstanta anchor konsisten dengan modul lain', () => {
        expect(CRM_DEFAULT_ANCHOR_DATE).toBe('2026-10-10');
    });

    it('CRM_CATEGORIES: 9 kategori, nama unik', () => {
        expect(CRM_CATEGORIES).toHaveLength(9);
        const names = CRM_CATEGORIES.map((c) => c.name);
        expect(new Set(names).size).toBe(names.length);
    });

    it('CRM_SUPPLIERS: 9 supplier, nama & email unik', () => {
        expect(CRM_SUPPLIERS).toHaveLength(9);
        const names = CRM_SUPPLIERS.map((s) => s.name);
        const emails = CRM_SUPPLIERS.map((s) => s.email);
        expect(new Set(names).size).toBe(names.length);
        expect(new Set(emails).size).toBe(emails.length);
    });

    it('CRM_CONTACTS: 23 kontak, nama unik, type valid', () => {
        expect(CRM_CONTACTS).toHaveLength(23);
        const names = CRM_CONTACTS.map((c) => c.name);
        expect(new Set(names).size).toBe(names.length);
        const validTypes = ['CUSTOMER', 'SUPPLIER', 'BOTH'];
        for (const c of CRM_CONTACTS) {
            expect(validTypes).toContain(c.type);
        }
    });

    it('CRM_LEADS: 14 lead, contactIdx selalu valid', () => {
        expect(CRM_LEADS).toHaveLength(14);
        for (const lead of CRM_LEADS) {
            expect(lead.contactIdx).toBeGreaterThanOrEqual(0);
            expect(lead.contactIdx).toBeLessThan(CRM_CONTACTS.length);
        }
    });

    it('CRM_DEALS: 14 deal, contactIdx & leadIdx selalu valid, closeDate ISO', () => {
        expect(CRM_DEALS).toHaveLength(14);
        for (const deal of CRM_DEALS) {
            expect(deal.contactIdx).toBeGreaterThanOrEqual(0);
            expect(deal.contactIdx).toBeLessThan(CRM_CONTACTS.length);
            if (deal.leadIdx !== undefined) {
                expect(deal.leadIdx).toBeGreaterThanOrEqual(0);
                expect(deal.leadIdx).toBeLessThan(CRM_LEADS.length);
            }
            expect(deal.closeDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
    });
});

// ============================================================
// Activity — C2
// ============================================================

describe('dataset CRM_ACTIVITIES (C2)', () => {
    it('25 activity dengan distribusi type sesuai CRM_ACTIVITY_TYPE_COUNTS', () => {
        expect(CRM_ACTIVITIES).toHaveLength(25);
        const actual: Record<CrmActivitySpec['type'], number> = {
            CALL: 0,
            EMAIL: 0,
            MEETING: 0,
            NOTE: 0,
            TASK: 0,
        };
        for (const a of CRM_ACTIVITIES) actual[a.type] += 1;
        expect(actual).toEqual(CRM_ACTIVITY_TYPE_COUNTS);
        expect(CRM_ACTIVITY_TYPE_COUNTS).toEqual({
            CALL: 6,
            EMAIL: 6,
            MEETING: 5,
            NOTE: 5,
            TASK: 3,
        });
    });

    it('entityIdx selalu menunjuk entitas yang valid (CONTACT/LEAD/DEAL)', () => {
        for (const a of CRM_ACTIVITIES) {
            const max =
                a.entityType === 'CONTACT'
                    ? CRM_CONTACTS.length
                    : a.entityType === 'LEAD'
                        ? CRM_LEADS.length
                        : CRM_DEALS.length;
            expect(a.entityIdx).toBeGreaterThanOrEqual(0);
            expect(a.entityIdx).toBeLessThan(max);
        }
    });

    it('mencakup ketiga entityType (CONTACT, LEAD, DEAL)', () => {
        const types = new Set(CRM_ACTIVITIES.map((a) => a.entityType));
        expect(types).toEqual(new Set(['CONTACT', 'LEAD', 'DEAL']));
    });

    it('dayOffset menyebar dalam rentang ±60 hari dari anchor', () => {
        for (const a of CRM_ACTIVITIES) {
            expect(a.dayOffset).toBeGreaterThanOrEqual(-60);
            expect(a.dayOffset).toBeLessThanOrEqual(60);
        }
        // Sebaran deterministik — bukan semua di hari yang sama
        const offsets = new Set(CRM_ACTIVITIES.map((a) => a.dayOffset));
        expect(offsets.size).toBeGreaterThanOrEqual(20);
    });

    it('TASK punya dueDayOffset setelah tanggal aktivitas; non-TASK tidak', () => {
        for (const a of CRM_ACTIVITIES) {
            if (a.type === 'TASK') {
                expect(a.dueDayOffset).toBeDefined();
                expect(a.dueDayOffset!).toBeGreaterThan(a.dayOffset);
            } else {
                expect(a.dueDayOffset).toBeUndefined();
            }
        }
    });

    it('subject unik (kunci bisnis idempotency)', () => {
        const subjects = CRM_ACTIVITIES.map((a) => a.subject);
        expect(new Set(subjects).size).toBe(subjects.length);
    });
});

// ============================================================
// Helper murni — activityDate
// ============================================================

describe('activityDate', () => {
    it('deterministik: dua panggilan menghasilkan waktu identik', () => {
        const a = activityDate('2026-10-10', -33);
        const b = activityDate('2026-10-10', -33);
        expect(a.getTime()).toBe(b.getTime());
    });

    it('anchor + 0 → UTC midnight tanggal anchor', () => {
        const d = activityDate(CRM_DEFAULT_ANCHOR_DATE, 0);
        expect(d.getTime()).toBe(toUtcDate('2026-10-10').getTime());
        expect(d.getUTCHours()).toBe(0);
    });

    it('offset negatif menghitung mundur dengan benar (melewati batas bulan)', () => {
        // 2026-10-10 − 10 hari = 2026-09-30
        expect(activityDate('2026-10-10', -10).toISOString()).toContain('2026-09-30');
        // 2026-10-10 − 58 hari = 2026-08-13
        expect(activityDate('2026-10-10', -58).toISOString()).toContain('2026-08-13');
    });

    it('offset positif menghitung maju', () => {
        expect(activityDate('2026-10-10', 5).toISOString()).toContain('2026-10-15');
    });
});
