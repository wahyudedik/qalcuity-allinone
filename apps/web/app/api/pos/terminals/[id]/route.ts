import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updatePosTerminalSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
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
                { success: false, error: 'Terminal tidak ditemukan' },
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
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat mengubah terminal' },
                { status: 403 }
            );
        }

        const { id } = params;
        const body = await request.json();
        const validation = updatePosTerminalSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const existing = await prisma.posTerminal.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Terminal tidak ditemukan' },
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
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat menghapus terminal' },
                { status: 403 }
            );
        }

        const { id } = params;

        const existing = await prisma.posTerminal.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Terminal tidak ditemukan' },
                { status: 404 }
            );
        }

        // Check if terminal has active sessions
        const activeSession = await prisma.posSession.findFirst({
            where: { terminalId: id, status: 'OPEN' },
        });
        if (activeSession) {
            return NextResponse.json(
                { success: false, error: 'Tidak dapat menghapus terminal dengan sesi aktif. Tutup sesi terlebih dahulu.' },
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

        return NextResponse.json({ success: true, message: 'Terminal berhasil dihapus' });
    } catch (error) {
        return handleApiError(error);
    }
}
