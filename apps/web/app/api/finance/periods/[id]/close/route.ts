export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute, requirePermission } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { closePeriod, runPreCloseChecks } from '@/lib/period-closing';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';
import { closePeriodSchema, formatZodError } from '@/lib/validation-schemas';

// ============================================
// POST — Close accounting period (Period Closing Wizard)
// ============================================
// Consumer: apps/web/app/dashboard/finance/periods/page.tsx
//
// Contract UI (TIDAK BOLEH berubah):
// - Body { confirmText: 'PRE_CHECK' } → jalankan pre-close checks saja (read-only)
//   Response: { success: true, canClose, checks } — UI membaca `data.checks`
// - Body { confirmText: 'CLOSE', notes? } → tutup periode via closePeriod()
//   Sukses: { success: true, message, data } — UI membaca `data.message`
//   Gagal pre-check: { success: false, error, code, checks } — UI membaca
//   `data.checks` untuk menampilkan checklist + `data.error` untuk toast
//
// Route ini SEBELUMNYA byte-for-byte duplikat dari periods/[id]/route.ts
// (bug pre-existing, didokumentasikan di CURRENT.md Session 68) — POST-nya
// tidak pernah menjalankan closePeriod/runPreCloseChecks, sehingga wizard
// terlihat berhasil tapi periode tidak pernah benar-benar ditutup.
// Diperbaiki: handler kini memanggil business logic dari lib/period-closing.ts.

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:periods:close:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Permission check: finance:approve required (ADMIN+ via permission engine)
        await requirePermission('finance:approve');

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = closePeriodSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            const formatted = formatZodError(validation.error);
            return NextResponse.json(
                { success: false, error: formatted.message, details: formatted.details, code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        const { confirmText, notes } = validation.data;

        // Tenant isolation — period hanya diambil dengan tenantId dari session
        const period = await prisma.accountingPeriod.findFirst({
            where: { id: params.id, tenantId },
        });
        if (!period) {
            return NextResponse.json(
                { success: false, error: MSG.PERIOD_NOT_FOUND, code: 'PERIOD_NOT_FOUND' },
                { status: 404 }
            );
        }

        if (period.status === 'CLOSED') {
            return NextResponse.json(
                { success: false, error: MSG.PERIOD_ALREADY_CLOSED, code: 'ALREADY_CLOSED' },
                { status: 409 }
            );
        }

        // Mode PRE_CHECK — jalankan pre-close checks saja (read-only)
        if (confirmText === 'PRE_CHECK') {
            const preClose = await runPreCloseChecks({
                tenantId,
                startDate: period.startDate,
                endDate: period.endDate,
            });
            return NextResponse.json({
                success: true,
                canClose: preClose.canClose,
                checks: preClose.checks,
            });
        }

        // Mode CLOSE — tutup periode via business logic (lib/period-closing.ts).
        // closePeriod() menjalankan pre-close checks internal + canUserClosePeriod
        // + generate closeSummary + update status CLOSED + simpan closeSummary.
        const result = await closePeriod(params.id, tenantId, userId, notes);

        if (!result.success) {
            // Pre-close checks gagal — jalankan ulang checks untuk mendapatkan
            // array detail yang dibutuhkan UI (closePeriod hanya mengembalikan
            // pesan gabungan, bukan array checks).
            if (result.error === 'PRE_CLOSE_FAILED') {
                const preClose = await runPreCloseChecks({
                    tenantId,
                    startDate: period.startDate,
                    endDate: period.endDate,
                });
                return NextResponse.json(
                    {
                        success: false,
                        error: MSG.PRE_CLOSE_CHECKS_FAILED,
                        code: 'PRE_CLOSE_FAILED',
                        checks: preClose.checks,
                    },
                    { status: 400 }
                );
            }

            if (result.error === 'NOT_FOUND') {
                return NextResponse.json(
                    { success: false, error: MSG.PERIOD_NOT_FOUND, code: 'PERIOD_NOT_FOUND' },
                    { status: 404 }
                );
            }

            if (result.error === 'ALREADY_CLOSED') {
                return NextResponse.json(
                    { success: false, error: MSG.PERIOD_ALREADY_CLOSED, code: 'ALREADY_CLOSED' },
                    { status: 409 }
                );
            }

            if (result.error === 'FORBIDDEN') {
                return NextResponse.json(
                    { success: false, error: result.message, code: 'FORBIDDEN' },
                    { status: 403 }
                );
            }

            return NextResponse.json(
                { success: false, error: result.message, code: 'PERIOD_CLOSE_FAILED' },
                { status: 500 }
            );
        }

        // Audit trail — closePeriod() tidak melakukan audit sendiri
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'AccountingPeriod',
            entityId: period.id,
            oldValues: {
                status: period.status,
                closedBy: period.closedBy,
                closedAt: period.closedAt?.toISOString() || null,
                closeNotes: period.closeNotes,
            },
            newValues: {
                status: 'CLOSED',
                closedBy: userId,
                closeNotes: notes ?? null,
                closeSummary: result.closeSummary ?? null,
            },
            request,
        });

        // Response sukses — UI membaca `data.message` untuk toast
        return NextResponse.json({
            success: true,
            message: result.message,
            data: {
                periodId: result.periodId,
                closeSummary: result.closeSummary ?? null,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
