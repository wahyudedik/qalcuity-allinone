export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createControlPolicySchema, formatZodError } from '@/lib/validation-schemas';
import { sanitizeObject } from '@/lib/sanitize';
import { handleApiError } from '@/lib/api-error';

// ─── GET: List all control policies for tenant ──────────────────────────────

export async function GET(request: Request) {
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

        const { searchParams } = new URL(request.url);
        const module = searchParams.get('module');
        const action = searchParams.get('action');
        const enabledOnly = searchParams.get('enabled') === 'true';

        const where: Record<string, unknown> = { tenantId };
        if (module) where.module = module;
        if (action) where.action = action;
        if (enabledOnly) where.enabled = true;

        const policies = await prisma.controlPolicy.findMany({
            where,
            orderBy: [{ priority: 'desc' }, { name: 'asc' }],
        });

        const data = policies.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            module: p.module,
            action: p.action,
            conditions: p.conditions,
            effect: p.effect,
            priority: p.priority,
            enabled: p.enabled,
            version: p.version,
            createdBy: p.createdBy,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── POST: Create a new control policy ──────────────────────────────────────

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:control-policies:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = createControlPolicySchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const policy = await prisma.controlPolicy.create({
            data: {
                tenantId,
                name: validatedData.name,
                description: validatedData.description ?? null,
                module: validatedData.module,
                action: validatedData.action,
                conditions: validatedData.conditions as never,
                effect: validatedData.effect,
                priority: validatedData.priority,
                enabled: validatedData.enabled,
                createdBy: userId,
            },
        });

        void logAudit({
            userId, tenantId, action: 'CREATE', entity: 'ControlPolicy', entityId: policy.id,
            newValues: toAuditPayload(policy), request,
        });

        return NextResponse.json({ success: true, data: policy }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
