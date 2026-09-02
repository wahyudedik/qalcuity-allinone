import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { runPreCloseChecks } from '@/lib/period-closing';
import { z } from 'zod';

// ============================================
// Validation
// ============================================

const closePeriodSchema = z.object({
    confirmText: z.string().refine((val) => val === 'CLOSE', {
        message: 'Teks konfirmasi harus "CLOSE"',
    }),
    notes: z.string().max(500, 'Catatan maksimal 500 karakter').optional(),
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
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Hanya ADMIN+ yang boleh close period
        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat menutup periode akuntansi' },
                { status: 403 }
            );
        }

        const period = await prisma.accountingPeriod.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!period) {
            return NextResponse.json(
                { success: false, error: 'Periode tidak ditemukan' },
                { status: 404 }
            );
        }

        if (period.status !== 'OPEN') {
            return NextResponse.json(
                { success: false, error: `Periode dengan status "${period.status}" tidak dapat ditutup` },
                { status: 400 }
            );
        }

        // Parse and validate body
        const body = await request.json();
        const validation = closePeriodSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: validation.error.issues[0]?.message || 'Data tidak valid' },
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
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
