import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createPosTerminalSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:terminals:${ip}`, 100, 60000);
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
        const search = searchParams.get('search');

        const where: Record<string, unknown> = { tenantId };

        if (status) {
            where.status = status.toUpperCase();
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { code: { contains: search } },
                { location: { contains: search } },
            ];
        }

        const terminals = await prisma.posTerminal.findMany({
            where,
            include: {
                sessions: {
                    where: { status: 'OPEN' },
                    take: 1,
                    orderBy: { openedAt: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const data = terminals.map((t) => ({
            id: t.id,
            name: t.name,
            code: t.code,
            location: t.location,
            status: t.status,
            activeSession: t.sessions.length > 0 ? {
                id: t.sessions[0].id,
                cashierName: t.sessions[0].cashierName,
                openedAt: t.sessions[0].openedAt.toISOString(),
            } : null,
            createdAt: t.createdAt.toISOString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:terminals:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Only ADMIN+ can create terminals
        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat membuat terminal' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = createPosTerminalSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const terminal = await prisma.posTerminal.create({
            data: {
                tenantId,
                name: validatedData.name,
                code: validatedData.code,
                location: validatedData.location || null,
                createdBy: userId,
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'PosTerminal',
            entityId: terminal.id,
            newValues: validatedData as Record<string, unknown>,
            request,
        });

        return NextResponse.json({ success: true, data: terminal }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
