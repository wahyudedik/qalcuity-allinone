export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createSoDRuleSchema, formatZodError } from '@/lib/validation-schemas';
import { sanitizeObject } from '@/lib/sanitize';
import { handleApiError } from '@/lib/api-error';

// ─── GET: List all SoD rules for tenant ─────────────────────────────────────

export async function GET(request: Request) {
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

        const { searchParams } = new URL(request.url);
        const module = searchParams.get('module');
        const enabledOnly = searchParams.get('enabled') === 'true';

        const where: Record<string, unknown> = { tenantId };
        if (module) where.module = module;
        if (enabledOnly) where.enabled = true;

        const rules = await prisma.soDRule.findMany({
            where,
            orderBy: { name: 'asc' },
        });

        const data = rules.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            role1: r.role1,
            role2: r.role2,
            module: r.module,
            action: r.action,
            enabled: r.enabled,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── POST: Create a new SoD rule ────────────────────────────────────────────

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:sod-rules:POST:${ip}`, 30, 60000);
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
        const validation = createSoDRuleSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const rule = await prisma.soDRule.create({
            data: {
                tenantId,
                name: validatedData.name,
                description: validatedData.description ?? null,
                role1: validatedData.role1,
                role2: validatedData.role2,
                module: validatedData.module,
                action: validatedData.action ?? null,
                enabled: validatedData.enabled,
            },
        });

        void logAudit({
            userId, tenantId, action: 'CREATE', entity: 'SoDRule', entityId: rule.id,
            newValues: toAuditPayload(rule), request,
        });

        return NextResponse.json({ success: true, data: rule }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
