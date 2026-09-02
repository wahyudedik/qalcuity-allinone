import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { generateYearlyPeriods } from '@/lib/period-closing';
import { z } from 'zod';

// ============================================
// Validation Schemas
// ============================================

const createPeriodSchema = z.object({
    name: z.string().min(1, 'Nama period wajib diisi').max(100),
    startDate: z.string().min(1, 'Tanggal mulai wajib diisi'),
    endDate: z.string().min(1, 'Tanggal akhir wajib diisi'),
});

const generatePeriodsSchema = z.object({
    year: z.number().int().min(2020).max(2099),
});

// ============================================
// GET — List periods
// ============================================

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:periods:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
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

        const data = periods.map((p) => ({
            id: p.id,
            name: p.name,
            startDate: p.startDate.toISOString(),
            endDate: p.endDate.toISOString(),
            status: p.status,
            closedBy: p.closedBy,
            closedAt: p.closedAt?.toISOString() || null,
            closeNotes: p.closeNotes,
            createdAt: p.createdAt.toISOString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

// ============================================
// POST — Create period or generate yearly periods
// ============================================

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:periods:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Hanya ADMIN+ yang boleh create period
        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat membuat periode akuntansi' },
                { status: 403 }
            );
        }

        const body = await request.json();

        // Check if this is a "generate yearly" request
        if (body.year && !body.name) {
            const genValidation = generatePeriodsSchema.safeParse(body);
            if (!genValidation.success) {
                return NextResponse.json(
                    { success: false, error: 'Tahun tidak valid' },
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
                data: { created: periods.length, message: `${periods.length} periode berhasil dibuat untuk tahun ${genValidation.data.year}` },
            }, { status: 201 });
        }

        // Manual period creation
        const validation = createPeriodSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: validation.error.issues[0]?.message || 'Data tidak valid' },
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
            newValues: period as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({ success: true, data: period }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
