export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updateProfileSchema, deleteAccountSchema, formatZodError } from '@/lib/validation-schemas';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const rateLimitResult = checkRateLimit(`api:settings:profile:${auth.userId}`, 100, 60000)
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: MSG.TOO_MANY_REQUESTS }, { status: 429 })
        }

        const user = await prisma.user.findUnique({
            where: { id: auth.userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                createdAt: true,
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        address: true,
                        logo: true,
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar || null,
                phone: user.tenant?.phone || '',
                createdAt: user.createdAt.toISOString(),
                company: {
                    id: user.tenant?.id,
                    name: user.tenant?.name,
                    email: user.tenant?.email,
                    phone: user.tenant?.phone,
                    address: user.tenant?.address,
                    logo: user.tenant?.logo,
                },
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:settings:profile:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: MSG.TOO_MANY_REQUESTS }, { status: 429 });
        }
        const body = await request.json();

        const validation = updateProfileSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const updateData: Record<string, string> = {};
        if (validation.data.name !== undefined) {
            updateData.name = validation.data.name.trim();
        }
        if (validation.data.email !== undefined) {
            updateData.email = validation.data.email.trim();
        }
        if (validation.data.avatar !== undefined) {
            updateData.avatar = validation.data.avatar;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { success: false, error: 'No valid fields to update' },
                { status: 400 }
            );
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
            },
        });

        // Log audit update profil
        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'User', entityId: user.id, newValues: updateData as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: user });
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * DELETE /api/settings/profile — self-service account deletion.
 *
 * Fix untuk production error 405 Method Not Allowed: frontend memanggil
 * method DELETE, tetapi route ini sebelumnya hanya export GET dan PUT.
 *
 * Pola mengikuti DELETE di settings/team/route.ts (soft delete + audit log).
 * Konfirmasi "HAPUS" divalidasi server-side via deleteAccountSchema
 * (defense-in-depth — UI sudah mengetik "HAPUS" sebelum memanggil endpoint ini).
 */
export async function DELETE(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Rate limit ketat — operasi destruktif
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:settings:profile:DELETE:${ip}`, 5, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: MSG.TOO_MANY_REQUESTS }, { status: 429 });
        }

        // Validasi body konfirmasi (Zod)
        let body: unknown = null;
        try {
            body = await request.json();
        } catch {
            body = null;
        }
        const validation = deleteAccountSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Confirmation text must be "HAPUS"',
                    ...formatZodError(validation.error),
                },
                { status: 400 }
            );
        }

        // Tenant isolation — user yang login harus berada di tenant ini
        const user = await prisma.user.findFirst({
            where: { id: userId, tenantId, deletedAt: null },
            select: { id: true, name: true, email: true, role: true },
        });
        if (!user) {
            return NextResponse.json({ success: false, error: MSG.USER_NOT_FOUND }, { status: 404 });
        }

        // Soft delete (konsisten dengan pola team route)
        await prisma.user.update({
            where: { id: userId },
            data: { deletedAt: new Date(), isActive: false },
        });

        // Non-blocking audit log
        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'User',
            entityId: userId,
            oldValues: { name: user.name, email: user.email, role: user.role },
            request,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
