export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { updateTableSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { sanitizeObject } from '@/lib/sanitize';
import { MSG } from '@/lib/api-messages';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:pos:tables:GET:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const table = await prisma.posTable.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!table) {
            return NextResponse.json(
                { success: false, error: MSG.TABLE_NOT_FOUND },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                id: table.id,
                number: table.number,
                name: table.name,
                capacity: table.capacity,
                status: table.status,
                zone: table.zone,
                floor: table.floor,
                posX: table.posX,
                posY: table.posY,
                width: table.width,
                height: table.height,
                isActive: table.isActive,
                currentSessionId: table.currentSessionId,
                notes: table.notes,
                createdAt: table.createdAt.toISOString(),
                updatedAt: table.updatedAt.toISOString(),
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
        const rateLimitResult = checkRateLimit(`api:pos:tables:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Check table exists
        const existingTable = await prisma.posTable.findFirst({
            where: { id: params.id, tenantId },
        });
        if (!existingTable) {
            return NextResponse.json(
                { success: false, error: MSG.TABLE_NOT_FOUND },
                { status: 404 }
            );
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = updateTableSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Check for duplicate table number within tenant (excluding current table)
        if (validatedData.number !== undefined) {
            const duplicateNumber = await prisma.posTable.findFirst({
                where: {
                    tenantId,
                    number: validatedData.number,
                    id: { not: params.id },
                },
            });
            if (duplicateNumber) {
                return NextResponse.json(
                    { success: false, error: MSG.TABLE_NUMBER_DUPLICATE },
                    { status: 400 }
                );
            }
        }

        const table = await prisma.posTable.update({
            where: { id: params.id },
            data: {
                ...(validatedData.number !== undefined && { number: validatedData.number }),
                ...(validatedData.name !== undefined && { name: validatedData.name }),
                ...(validatedData.capacity !== undefined && { capacity: validatedData.capacity }),
                ...(validatedData.status !== undefined && { status: validatedData.status }),
                ...(validatedData.zone !== undefined && { zone: validatedData.zone }),
                ...(validatedData.floor !== undefined && { floor: validatedData.floor }),
                ...(validatedData.posX !== undefined && { posX: validatedData.posX }),
                ...(validatedData.posY !== undefined && { posY: validatedData.posY }),
                ...(validatedData.width !== undefined && { width: validatedData.width }),
                ...(validatedData.height !== undefined && { height: validatedData.height }),
                ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
                ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'PosTable',
            entityId: table.id,
            newValues: validatedData,
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: table.id,
                number: table.number,
                name: table.name,
                capacity: table.capacity,
                status: table.status,
                zone: table.zone,
                floor: table.floor,
                posX: table.posX,
                posY: table.posY,
                width: table.width,
                height: table.height,
                isActive: table.isActive,
                notes: table.notes,
                createdAt: table.createdAt.toISOString(),
                updatedAt: table.updatedAt.toISOString(),
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
        const rateLimitResult = checkRateLimit(`api:pos:tables:DELETE:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Check table exists
        const existingTable = await prisma.posTable.findFirst({
            where: { id: params.id, tenantId },
        });
        if (!existingTable) {
            return NextResponse.json(
                { success: false, error: MSG.TABLE_NOT_FOUND },
                { status: 404 }
            );
        }

        // Check for active reservations
        const activeReservation = await prisma.posTableReservation.findFirst({
            where: {
                tenantId,
                tableId: params.id,
                status: { in: ['CONFIRMED', 'SEATED'] },
            },
        });
        if (activeReservation) {
            return NextResponse.json(
                { success: false, error: MSG.TABLE_CANNOT_DELETE_ACTIVE_RESERVATION },
                { status: 400 }
            );
        }

        // Soft delete
        await prisma.posTable.update({
            where: { id: params.id },
            data: { isActive: false, status: 'DISABLED' },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'PosTable',
            entityId: params.id,
            newValues: { number: existingTable.number, name: existingTable.name },
            request,
        });

        return NextResponse.json({
            success: true,
            message: MSG.TABLE_DELETED,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
