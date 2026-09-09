import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

// ============================================
// GET — Detail period
// ============================================

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:periods:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'MSG.TOO_MANY_REQUESTS' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const period = await prisma.accountingPeriod.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!period) {
            return NextResponse.json(
                { success: false, error: 'Period not found', code: 'NOT_FOUND' },
                { status: 404 }
            );
        }

        // Get summary data
        const journalEntries = await prisma.journalEntry.findMany({
            where: {
                tenantId,
                date: { gte: period.startDate, lte: period.endDate },
            },
        });

        const postedEntries = journalEntries.filter((e) => e.status === 'POSTED');
        const draftEntries = journalEntries.filter((e) => e.status === 'DRAFT');
        const voidEntries = journalEntries.filter((e) => e.status === 'VOID');

        let totalDebit = 0;
        let totalCredit = 0;
        for (const entry of postedEntries) {
            totalDebit += Number(entry.totalDebit);
            totalCredit += Number(entry.totalCredit);
        }

        return NextResponse.json({
            success: true,
            data: {
                id: period.id,
                name: period.name,
                startDate: period.startDate.toISOString(),
                endDate: period.endDate.toISOString(),
                status: period.status,
                closedBy: period.closedBy,
                closedAt: period.closedAt?.toISOString() || null,
                closeNotes: period.closeNotes,
                createdAt: period.createdAt.toISOString(),
                summary: {
                    totalEntries: journalEntries.length,
                    postedEntries: postedEntries.length,
                    draftEntries: draftEntries.length,
                    voidEntries: voidEntries.length,
                    totalDebit,
                    totalCredit,
                },
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// ============================================
// PUT — Update period (reopen, only ADMIN)
// ============================================

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:periods:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Hanya ADMIN+ yang boleh update period
        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Only admins can modify accounting periods', code: 'FORBIDDEN' },
                { status: 403 }
            );
        }

        const period = await prisma.accountingPeriod.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!period) {
            return NextResponse.json(
                { success: false, error: 'Period not found', code: 'NOT_FOUND' },
                { status: 404 }
            );
        }

        const body = await request.json();
        const { status: newStatus, closeNotes } = body;

        // Only allow reopening CLOSED periods
        if (newStatus === 'OPEN' && period.status === 'CLOSED') {
            // Only SUPERADMIN can reopen
            if (auth.role !== 'SUPERADMIN') {
                return NextResponse.json(
                    { success: false, error: 'Only Super Admin can reopen closed periods', code: 'FORBIDDEN' },
                    { status: 403 }
                );
            }

            if (!closeNotes) {
                return NextResponse.json(
                    { success: false, error: 'Notes are required when reopening a period', code: 'VALIDATION_ERROR' },
                    { status: 400 }
                );
            }

            const updated = await prisma.accountingPeriod.update({
                where: { id: params.id },
                data: {
                    status: 'OPEN',
                    closedBy: null,
                    closedAt: null,
                    closeNotes: `[REOPENED] ${closeNotes}`,
                },
            });

            void logAudit({
                userId, tenantId, action: 'UPDATE', entity: 'AccountingPeriod',
                entityId: period.id,
                oldValues: { status: period.status, closedBy: period.closedBy },
                newValues: { status: 'OPEN', closeNotes: `[REOPENED] ${closeNotes}` },
                request,
            });

            return NextResponse.json({ success: true, data: updated });
        }

        return NextResponse.json(
            { success: false, error: 'Invalid action', code: 'VALIDATION_ERROR' },
            { status: 400 }
        );
    } catch (error) {
        return handleApiError(error);
    }
}
