export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { updateSoDRuleSchema, formatZodError } from '@/lib/validation-schemas';
import { sanitizeObject } from '@/lib/sanitize';
import { handleApiError } from '@/lib/api-error';

// ─── GET: Get a single SoD rule by ID ───────────────────────────────────────

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:sod-rules:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const rule = await prisma.soDRule.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!rule) {
            return NextResponse.json({ success: false, error: MSG.DATA_NOT_FOUND }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: rule });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── PUT: Update a SoD rule ─────────────────────────────────────────────────

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:sod-rules:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Verify rule exists and belongs to tenant
        const existing = await prisma.soDRule.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: MSG.DATA_NOT_FOUND }, { status: 404 });
        }

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = updateSoDRuleSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Prevent role1 === role2
        const newRole1 = validatedData.role1 ?? existing.role1;
        const newRole2 = validatedData.role2 ?? existing.role2;
        if (newRole1 === newRole2) {
            return NextResponse.json(
                { success: false, error: 'Role 1 dan Role 2 harus berbeda' },
                { status: 400 }
            );
        }

        const updateData: Record<string, unknown> = {};
        if (validatedData.name !== undefined) updateData.name = validatedData.name;
        if (validatedData.description !== undefined) updateData.description = validatedData.description;
        if (validatedData.role1 !== undefined) updateData.role1 = validatedData.role1;
        if (validatedData.role2 !== undefined) updateData.role2 = validatedData.role2;
        if (validatedData.module !== undefined) updateData.module = validatedData.module;
        if (validatedData.action !== undefined) updateData.action = validatedData.action;
        if (validatedData.enabled !== undefined) updateData.enabled = validatedData.enabled;

        const updated = await prisma.soDRule.update({
            where: { id: params.id },
            data: updateData,
        });

        void logAudit({
            userId, tenantId, action: 'UPDATE', entity: 'SoDRule', entityId: params.id,
            oldValues: toAuditPayload(existing),
            newValues: toAuditPayload(updated),
            request,
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── DELETE: Delete a SoD rule ──────────────────────────────────────────────

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:sod-rules:DELETE:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Verify rule exists and belongs to tenant
        const existing = await prisma.soDRule.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: MSG.DATA_NOT_FOUND }, { status: 404 });
        }

        // Guard (Session 70n): block delete while PENDING/APPROVED exceptions
        // reference this rule — disable the rule instead to preserve audit trail.
        const activeExceptions = await prisma.soDException.count({
            where: {
                ruleId: params.id,
                tenantId,
                status: { in: ['PENDING', 'APPROVED'] },
            },
        });

        if (activeExceptions > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: MSG.SOD_RULE_HAS_ACTIVE_EXCEPTIONS,
                    data: { activeExceptions },
                },
                { status: 409 }
            );
        }

        await prisma.soDRule.delete({
            where: { id: params.id },
        });

        void logAudit({
            userId, tenantId, action: 'DELETE', entity: 'SoDRule', entityId: params.id,
            oldValues: toAuditPayload(existing), request,
        });

        return NextResponse.json({ success: true, message: 'SoD rule berhasil dihapus' });
    } catch (error) {
        return handleApiError(error);
    }
}
