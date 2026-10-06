export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute, requirePermission } from '@/lib/session';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { generateYearlyPeriods } from '@/lib/period-closing';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';
import { formatZodError, createPeriodSchema, generatePeriodsSchema, reopenPeriodSchema } from '@/lib/validation-schemas';
import { getLockPolicy, enforceAutoLock } from '@/lib/lock-policy';
import { getActiveTemporaryUnlocks, getActiveTemporaryUnlockForPeriod, unlockReopenMarker } from '@/lib/unlock-request';

// ============================================
// GET â€” List periods
// ============================================

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:periods:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const year = searchParams.get('year');

        const where: Record<string, unknown> = { tenantId };
        if (status) where.status = status.toUpperCase();
        if (year) {
            const yearNum = parseInt(year);
            where.startDate = { gte: new Date(yearNum, 0, 1), lte: new Date(yearNum, 11, 31, 23, 59, 59, 999) };
        }

        const periods = await prisma.accountingPeriod.findMany({
            where,
            orderBy: { startDate: 'desc' },
        });

        // Indikator temporary unlock aktif (UCE-26) — untuk UI periods page
        const activeUnlocks = await getActiveTemporaryUnlocks(tenantId);

        const data = periods.map((p) => {
            const unlock = activeUnlocks.find((u) => u.periodIds.includes(p.id));
            return {
                id: p.id,
                name: p.name,
                startDate: p.startDate.toISOString(),
                endDate: p.endDate.toISOString(),
                status: p.status,
                closedBy: p.closedBy,
                closedAt: p.closedAt?.toISOString() || null,
                closeNotes: p.closeNotes,
                createdAt: p.createdAt.toISOString(),
                temporaryUnlockActive: !!unlock,
                temporaryUnlockExpiresAt: unlock?.expiresAt ?? null,
                temporaryUnlockRequestId: unlock?.unlockRequestId ?? null,
            };
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

// ============================================
// POST â€” Create period or generate yearly periods
// ============================================

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:periods:POST:${ip}`, 30, 60000);
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

        // Check if this is a "generate yearly" request
        if (body.year && !body.name) {
            const genValidation = generatePeriodsSchema.safeParse(body);
            if (!genValidation.success) {
                return NextResponse.json(
                    { success: false, error: 'Invalid year', code: 'VALIDATION_ERROR' },
                    { status: 400 }
                );
            }

            const periods = await generateYearlyPeriods(tenantId, genValidation.data.year);

            if (periods.length > 0) {
                void logAudit({
                    userId, tenantId, action: 'CREATE', entity: 'AccountingPeriod',
                    entityId: 'bulk',
                    newValues: { count: periods.length, year: genValidation.data.year },
                    request,
                });
            }

            return NextResponse.json({
                success: true,
                data: { created: periods.length, message: `${periods.length} periods created for year ${genValidation.data.year}` },
            }, { status: 201 });
        }

        // Manual period creation
        const validation = createPeriodSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: validation.error.issues[0]?.message || 'Invalid data', code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        const { name, startDate, endDate } = validation.data;
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
            return NextResponse.json(
                { success: false, error: 'Tanggal akhir harus setelah tanggal mulai' },
                { status: 400 }
            );
        }

        // Check for overlapping periods
        const overlapping = await prisma.accountingPeriod.findFirst({
            where: {
                tenantId,
                OR: [
                    { startDate: { lte: start }, endDate: { gte: start } },
                    { startDate: { lte: end }, endDate: { gte: end } },
                    { startDate: { gte: start }, endDate: { lte: end } },
                ],
            },
        });

        if (overlapping) {
            return NextResponse.json(
                { success: false, error: `Periode tumpang tindih dengan "${overlapping.name}"` },
                { status: 409 }
            );
        }

        const period = await prisma.accountingPeriod.create({
            data: {
                tenantId,
                name,
                startDate: start,
                endDate: end,
                status: 'OPEN',
            },
        });

        void logAudit({
            userId, tenantId, action: 'CREATE', entity: 'AccountingPeriod',
            entityId: period.id,
            newValues: toAuditPayload(period),
            request,
        });

        return NextResponse.json({ success: true, data: period }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

// ============================================
// PUT — Reopen closed period (UCE-26 Unlock as Exception)
// ============================================
// Reopen hanya diizinkan jika:
// 1. Ada temporary unlock aktif yang mencakup periode ini (hasil approval
//    unlock request) → closeNotes di-set ke marker `unlock:<requestId>`
//    sehingga sweepExpiredTemporaryUnlocks bisa auto re-lock saat expired; atau
// 2. policy.requireApprovalForUnlock = false, atau role SUPERADMIN (emergency
//    override, konsisten dengan perilaku UI lama yang SUPERADMIN-gated).

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:periods:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId, role } = auth;

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = reopenPeriodSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: formatZodError(validation.error), code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        const period = await prisma.accountingPeriod.findFirst({
            where: { id: params.id, tenantId },
        });
        if (!period) {
            return NextResponse.json(
                { success: false, error: MSG.DATA_NOT_FOUND, code: 'DATA_NOT_FOUND' },
                { status: 404 }
            );
        }

        if (period.status !== 'CLOSED') {
            return NextResponse.json(
                { success: false, error: 'Period is not closed', code: 'PERIOD_NOT_CLOSED' },
                { status: 400 }
            );
        }

        // Lazy auto-lock enforcement (UCE-25) — no-op jika autoLockAfterDays = 0
        const policy = await getLockPolicy(tenantId);
        await enforceAutoLock(tenantId, policy);

        // Temporary unlock aktif untuk periode ini? (UCE-26)
        const activeUnlock = await getActiveTemporaryUnlockForPeriod(tenantId, period.id);

        if (!activeUnlock && policy.requireApprovalForUnlock && role !== 'SUPERADMIN') {
            // Tidak ada temporary unlock + policy mewajibkan approval →
            // arahkan user mengajukan unlock request.
            return NextResponse.json(
                {
                    success: false,
                    error: MSG.UNLOCK_APPROVAL_REQUIRED,
                    code: 'UNLOCK_APPROVAL_REQUIRED',
                },
                { status: 403 }
            );
        }

        // Reopen. Jika via temporary unlock, closeNotes WAJIB marker persis
        // (sweep membandingkan string equality untuk auto re-lock).
        const reopenNotes = activeUnlock
            ? unlockReopenMarker(activeUnlock.unlockRequestId)
            : validation.data.closeNotes || 'Dibuka kembali oleh Super Admin';

        const updated = await prisma.accountingPeriod.update({
            where: { id: period.id },
            data: {
                status: 'OPEN',
                closedAt: null,
                closedBy: null,
                closeNotes: reopenNotes,
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'AccountingPeriod',
            entityId: period.id,
            oldValues: {
                status: 'CLOSED',
                closedAt: period.closedAt?.toISOString() || null,
                closeNotes: period.closeNotes,
            },
            newValues: {
                status: 'OPEN',
                closeNotes: reopenNotes,
                viaUnlockRequest: !!activeUnlock,
                temporaryUnlockRequestId: activeUnlock?.unlockRequestId ?? null,
                temporaryUnlockExpiresAt: activeUnlock?.expiresAt ?? null,
            },
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                name: updated.name,
                startDate: updated.startDate.toISOString(),
                endDate: updated.endDate.toISOString(),
                status: updated.status,
                closedBy: updated.closedBy,
                closedAt: updated.closedAt?.toISOString() || null,
                closeNotes: updated.closeNotes,
            },
            temporaryUnlock: activeUnlock
                ? {
                    id: activeUnlock.id,
                    unlockRequestId: activeUnlock.unlockRequestId,
                    expiresAt: activeUnlock.expiresAt,
                }
                : null,
            message: activeUnlock ? MSG.UNLOCK_GRANTED : 'Period reopened',
        });
    } catch (error) {
        return handleApiError(error);
    }
}
