import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { runPreCloseChecks } from '@/lib/period-closing';
import { z } from 'zod';
import { handleApiError } from '@/lib/api-error';

// ============================================
// Validation
// ============================================

const closePeriodSchema = z.object({
    confirmText: z.string().refine((val) => val === 'CLOSE', {
        message: 'Confirmation text must be "CLOSE"',
    }),
    notes: z.string().max(500, 'Notes must be at most 500 characters').optional(),
});

// ============================================
// POST — Execute close with pre-checks
// ============================================

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:periods:close:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Hanya ADMIN+ yang boleh close period
        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Only admins can close accounting periods', code: 'FORBIDDEN' },
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

        if (period.status !== 'OPEN') {
            return NextResponse.json(
                { success: false, error: `Period with status "${period.status}" cannot be closed`, code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        // Parse and validate body
        const body = await request.json();
        const validation = closePeriodSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: validation.error.issues[0]?.message || 'Invalid data', code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        // Run pre-close checks
        const preCloseResult = await runPreCloseChecks({
            tenantId,
            startDate: period.startDate,
            endDate: period.endDate,
        });

        if (!preCloseResult.canClose) {
            const failedChecks = preCloseResult.checks.filter((c) => c.status === 'fail');
            return NextResponse.json(
                {
                    success: false,
                    error: 'Pre-close checks gagal. Harap perbaiki masalah berikut terlebih dahulu.',
                    checks: preCloseResult.checks,
                    failedChecks: failedChecks.map((c) => c.message),
                },
                { status: 422 }
            );
        }

        // Update period status to CLOSED
        const closedPeriod = await prisma.accountingPeriod.update({
            where: { id: params.id },
            data: {
                status: 'CLOSED',
                closedBy: userId,
                closedAt: new Date(),
                closeNotes: validation.data.notes || null,
            },
        });

        void logAudit({
            userId, tenantId, action: 'UPDATE', entity: 'AccountingPeriod',
            entityId: period.id,
            oldValues: { status: 'OPEN' },
            newValues: {
                status: 'CLOSED',
                closedBy: userId,
                closedAt: new Date().toISOString(),
                closeNotes: validation.data.notes,
            },
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: closedPeriod.id,
                name: closedPeriod.name,
                status: closedPeriod.status,
                closedAt: closedPeriod.closedAt?.toISOString(),
                checks: preCloseResult.checks,
            },
            message: `Periode "${period.name}" berhasil ditutup.`,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
