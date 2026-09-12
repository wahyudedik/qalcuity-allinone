export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { updatePosTerminalSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';
import { MSG } from '@/lib/api-messages';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:terminals:GET:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const terminal = await prisma.posTerminal.findFirst({
            where: { id: params.id, tenantId },
            include: {
                sessions: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });

        if (!terminal) {
            return NextResponse.json(
                { success: false, error: MSG.TERMINAL_NOT_FOUND },
                { status: 404 }
            );
        }

        const latestSession = terminal.sessions[0];
        const isActive = latestSession?.status === 'OPEN';

        return NextResponse.json({
            success: true,
            data: {
                id: terminal.id,
                name: terminal.name,
                code: terminal.code,
                location: terminal.location,
                status: terminal.status,
                runtimeStatus: isActive ? 'ACTIVE' : 'IDLE',
                currentCashier: isActive ? latestSession?.cashierName || null : null,
                currentSessionId: isActive ? latestSession?.id || null : null,
                lastActivity: latestSession?.updatedAt?.toISOString() || null,
                lastOpenedAt: latestSession?.openedAt?.toISOString() || null,
                createdAt: terminal.createdAt.toISOString(),
                updatedAt: terminal.updatedAt.toISOString(),
            },
        });
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
        const rateLimitResult = checkRateLimit(`api:pos:terminals:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Check terminal exists
        const existingTerminal = await prisma.posTerminal.findFirst({
            where: { id: params.id, tenantId },
        });
        if (!existingTerminal) {
            return NextResponse.json(
                { success: false, error: MSG.TERMINAL_NOT_FOUND },
                { status: 404 }
            );
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = updatePosTerminalSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const terminal = await prisma.posTerminal.update({
            where: { id: params.id },
            data: {
                ...(validatedData.name !== undefined && { name: validatedData.name }),
                ...(validatedData.location !== undefined && { location: validatedData.location }),
                ...(validatedData.status !== undefined && { status: validatedData.status }),
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'PosTerminal',
            entityId: terminal.id,
            newValues: validatedData,
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: terminal.id,
                name: terminal.name,
                code: terminal.code,
                location: terminal.location,
                status: terminal.status,
                createdAt: terminal.createdAt.toISOString(),
                updatedAt: terminal.updatedAt.toISOString(),
            },
        });
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
        const rateLimitResult = checkRateLimit(`api:pos:terminals:DELETE:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Check terminal exists
        const existingTerminal = await prisma.posTerminal.findFirst({
            where: { id: params.id, tenantId },
        });
        if (!existingTerminal) {
            return NextResponse.json(
                { success: false, error: MSG.TERMINAL_NOT_FOUND },
                { status: 404 }
            );
        }

        // Check for active session
        const activeSession = await prisma.posSession.findFirst({
            where: {
                tenantId,
                terminalId: params.id,
                status: 'OPEN',
            },
        });
        if (activeSession) {
            return NextResponse.json(
                { success: false, error: MSG.TERMINAL_CANNOT_DELETE_ACTIVE_SESSION },
                { status: 400 }
            );
        }

        // Delete terminal (hard delete since it has no cascade dependencies)
        await prisma.posTerminal.delete({
            where: { id: params.id },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'PosTerminal',
            entityId: params.id,
            newValues: { name: existingTerminal.name, code: existingTerminal.code },
            request,
        });

        return NextResponse.json({
            success: true,
            message: MSG.TERMINAL_DELETED,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
