import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { openPosSessionSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:sessions:${ip}`, 100, 60000);
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
        const terminalId = searchParams.get('terminalId');

        const where: Record<string, unknown> = { tenantId };

        if (status) {
            where.status = status.toUpperCase();
        }

        if (terminalId) {
            where.terminalId = terminalId;
        }

        const sessions = await prisma.posSession.findMany({
            where,
            include: {
                terminal: { select: { id: true, name: true, code: true } },
                transactions: {
                    select: { id: true, totalAmount: true, status: true },
                },
            },
            orderBy: { openedAt: 'desc' },
        });

        const data = sessions.map((s) => ({
            id: s.id,
            terminalId: s.terminalId,
            terminalName: s.terminal.name,
            terminalCode: s.terminal.code,
            cashierId: s.cashierId,
            cashierName: s.cashierName,
            status: s.status,
            openingCash: Number(s.openingCash),
            closingCash: s.closingCash ? Number(s.closingCash) : null,
            expectedCash: s.expectedCash ? Number(s.expectedCash) : null,
            variance: s.variance ? Number(s.variance) : null,
            transactionCount: s.transactions.length,
            totalSales: s.transactions
                .filter((t) => t.status === 'COMPLETED')
                .reduce((sum, t) => sum + Number(t.totalAmount), 0),
            openedAt: s.openedAt.toISOString(),
            closedAt: s.closedAt?.toISOString() || null,
            createdAt: s.createdAt.toISOString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:sessions:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = openPosSessionSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Verify terminal exists and belongs to tenant
        const terminal = await prisma.posTerminal.findFirst({
            where: { id: validatedData.terminalId, tenantId },
        });
        if (!terminal) {
            return NextResponse.json(
                { success: false, error: 'Terminal tidak ditemukan' },
                { status: 404 }
            );
        }

        if (terminal.status !== 'ACTIVE') {
            return NextResponse.json(
                { success: false, error: 'Terminal tidak aktif. Hanya terminal aktif yang dapat membuka sesi.' },
                { status: 400 }
            );
        }

        // Check if terminal already has an active session
        const existingOpenSession = await prisma.posSession.findFirst({
            where: { terminalId: validatedData.terminalId, status: 'OPEN' },
        });
        if (existingOpenSession) {
            return NextResponse.json(
                { success: false, error: 'Terminal sudah memiliki sesi aktif. Tutup sesi terlebih dahulu.' },
                { status: 400 }
            );
        }

        // Get user name from session
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true },
        });

        const session = await prisma.posSession.create({
            data: {
                tenantId,
                terminalId: validatedData.terminalId,
                cashierId: userId,
                cashierName: user?.name || 'Unknown',
                openingCash: validatedData.openingCash,
            },
            include: {
                terminal: { select: { name: true, code: true } },
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'PosSession',
            entityId: session.id,
            newValues: {
                terminalId: validatedData.terminalId,
                openingCash: validatedData.openingCash,
                cashierName: user?.name || 'Unknown',
            },
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: session.id,
                terminalId: session.terminalId,
                terminalName: session.terminal.name,
                terminalCode: session.terminal.code,
                cashierName: session.cashierName,
                status: session.status,
                openingCash: Number(session.openingCash),
                openedAt: session.openedAt.toISOString(),
            },
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
