export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute, requirePermission } from '@/lib/session';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { updateApprovalLevelSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';

// ─── GET /api/approval/levels/[id] — Fetch single level by ID ──────────────

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:approval:levels:GET:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const { id } = await params;

        const level = await prisma.approvalLevel.findFirst({
            where: { id, tenantId },
        });

        if (!level) {
            return NextResponse.json(
                { success: false, error: MSG.APPROVAL_LEVEL_NOT_FOUND },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: level });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── PUT /api/approval/levels/[id] — Update a level ────────────────────────

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:approval:levels:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        await requirePermission('approval:edit');

        const { id } = await params;

        // Verify level exists and belongs to this tenant
        const existing = await prisma.approvalLevel.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.APPROVAL_LEVEL_NOT_FOUND },
                { status: 404 }
            );
        }

        const body = await request.json();
        const validation = updateApprovalLevelSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const updated = await prisma.approvalLevel.update({
            where: { id },
            data: validation.data,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'ApprovalLevel',
            entityId: updated.id,
            oldValues: toAuditPayload(existing),
            newValues: toAuditPayload(updated),
            request,
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── DELETE /api/approval/levels/[id] — Soft-delete (deactivate) ───────────

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:approval:levels:DELETE:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        await requirePermission('approval:edit');

        const { id } = await params;

        const existing = await prisma.approvalLevel.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.APPROVAL_LEVEL_NOT_FOUND },
                { status: 404 }
            );
        }

        // Soft-delete: deactivate the level instead of hard delete
        const deactivated = await prisma.approvalLevel.update({
            where: { id },
            data: { isActive: false },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'ApprovalLevel',
            entityId: deactivated.id,
            oldValues: toAuditPayload(existing),
            newValues: toAuditPayload(deactivated),
            request,
        });

        return NextResponse.json({ success: true, data: deactivated });
    } catch (error) {
        return handleApiError(error);
    }
}
