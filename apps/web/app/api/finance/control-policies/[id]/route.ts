export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { updateControlPolicySchema, formatZodError } from '@/lib/validation-schemas';
import { sanitizeObject } from '@/lib/sanitize';
import { handleApiError } from '@/lib/api-error';

// ─── GET: Get a single control policy by ID ─────────────────────────────────

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:control-policies:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const policy = await prisma.controlPolicy.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!policy) {
            return NextResponse.json({ success: false, error: MSG.DATA_NOT_FOUND }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: policy });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── PUT: Update a control policy ───────────────────────────────────────────

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:control-policies:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Verify policy exists and belongs to tenant
        const existing = await prisma.controlPolicy.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: MSG.DATA_NOT_FOUND }, { status: 404 });
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = updateControlPolicySchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const updateData: Record<string, unknown> = {};
        if (validatedData.name !== undefined) updateData.name = validatedData.name;
        if (validatedData.description !== undefined) updateData.description = validatedData.description;
        if (validatedData.module !== undefined) updateData.module = validatedData.module;
        if (validatedData.action !== undefined) updateData.action = validatedData.action;
        if (validatedData.conditions !== undefined) updateData.conditions = validatedData.conditions;
        if (validatedData.effect !== undefined) updateData.effect = validatedData.effect;
        if (validatedData.priority !== undefined) updateData.priority = validatedData.priority;
        if (validatedData.enabled !== undefined) updateData.enabled = validatedData.enabled;

        // Increment version on update
        updateData.version = existing.version + 1;

        const updated = await prisma.controlPolicy.update({
            where: { id: params.id },
            data: updateData,
        });

        void logAudit({
            userId, tenantId, action: 'UPDATE', entity: 'ControlPolicy', entityId: params.id,
            oldValues: toAuditPayload(existing),
            newValues: toAuditPayload(updated),
            request,
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── DELETE: Delete a control policy ────────────────────────────────────────

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:control-policies:DELETE:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Verify policy exists and belongs to tenant
        const existing = await prisma.controlPolicy.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: MSG.DATA_NOT_FOUND }, { status: 404 });
        }

        await prisma.controlPolicy.delete({
            where: { id: params.id },
        });

        void logAudit({
            userId, tenantId, action: 'DELETE', entity: 'ControlPolicy', entityId: params.id,
            oldValues: toAuditPayload(existing), request,
        });

        return NextResponse.json({ success: true, message: 'Policy berhasil dihapus' });
    } catch (error) {
        return handleApiError(error);
    }
}
