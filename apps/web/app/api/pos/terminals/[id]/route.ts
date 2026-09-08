import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updatePosTerminalSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { MSG } from '@/lib/api-messages';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`pos:terminals:[id]:${ip}`, 60, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        const terminal = await prisma.posTerminal.findFirst({
            where: { id, tenantId },
            include: {
                sessions: {
                    orderBy: { openedAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!terminal) {
            return NextResponse.json(
                { success: false, error: MSG.TERMINAL_NOT_FOUND },
                { status: 404 }
            );
        }

        const data = {
            id: terminal.id,
            name: terminal.name,
            code: terminal.code,
            location: terminal.location,
            status: terminal.status,
            createdBy: terminal.createdBy,
            createdAt: terminal.createdAt.toISOString(),
            updatedAt: terminal.updatedAt.toISOString(),
            sessions: terminal.sessions.map((s) => ({
                id: s.id,
                cashierName: s.cashierName,
                status: s.status,
                openingCash: Number(s.openingCash),
                closingCash: s.closingCash ? Number(s.closingCash) : null,
                openedAt: s.openedAt.toISOString(),
                closedAt: s.closedAt?.toISOString() || null,
            })),
        };

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`pos:terminals:[id]:PUT:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: MSG.TERMINAL_ADMIN_ONLY_UPDATE },
                { status: 403 }
            );
        }

        const { id } = params;
        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = updatePosTerminalSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const existing = await prisma.posTerminal.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.TERMINAL_NOT_FOUND },
                { status: 404 }
            );
        }

        const terminal = await prisma.posTerminal.update({
            where: { id },
            data: validation.data,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'PosTerminal',
            entityId: id,
            oldValues: { name: existing.name, status: existing.status, location: existing.location },
            newValues: validation.data as Record<string, unknown>,
            request,
        });

        return NextResponse.json({ success: true, data: terminal });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`pos:terminals:[id]:DELETE:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 });
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: MSG.TERMINAL_ADMIN_ONLY_DELETE },
                { status: 403 }
            );
        }

        const { id } = params;

        const existing = await prisma.posTerminal.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.TERMINAL_NOT_FOUND },
                { status: 404 }
            );
        }

        // Check if terminal has active sessions
        const activeSession = await prisma.posSession.findFirst({
            where: { terminalId: id, status: 'OPEN' },
        });
        if (activeSession) {
            return NextResponse.json(
                { success: false, error: MSG.TERMINAL_CANNOT_DELETE_ACTIVE_SESSION },
                { status: 400 }
            );
        }

        await prisma.posTerminal.delete({ where: { id } });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'PosTerminal',
            entityId: id,
            oldValues: { name: existing.name, code: existing.code },
            request,
        });

        return NextResponse.json({ success: true, message: MSG.TERMINAL_DELETED });
    } catch (error) {
        return handleApiError(error);
    }
}
