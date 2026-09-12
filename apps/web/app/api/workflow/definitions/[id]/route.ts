export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';
import { createWorkflowDefinitionSchema } from '@/lib/validation-schemas';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * GET /api/workflow/definitions
 * List semua workflow definitions untuk tenant.
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:workflow:definitions:${ip}`, 60, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { tenantId } = auth;

        const definitions = await prisma.workflowDefinition.findMany({
            where: { tenantId },
            orderBy: { entityType: 'asc' },
        });

        return NextResponse.json({ success: true, data: definitions });
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * POST /api/workflow/definitions
 * Buat atau update workflow definition.
 * Jika entityType sudah ada untuk tenant, update config-nya.
 */
export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:workflow:definitions:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId } = auth;
        const body = await request.json();

        // Validate input with Zod schema
        const validated = createWorkflowDefinitionSchema.safeParse(body);
        if (!validated.success) {
            return NextResponse.json(
                { success: false, error: validated.error.issues[0]?.message || MSG.INVALID_INPUT },
                { status: 400 }
            );
        }

        const { entityType, name, description, config } = validated.data;

        // Upsert: update jika sudah ada, create jika belum
        const existing = await prisma.workflowDefinition.findFirst({
            where: { tenantId, entityType: entityType.toUpperCase() },
        });

        let definition;

        if (existing) {
            if (existing.isSystem) {
                return NextResponse.json(
                    { success: false, error: MSG.WORKFLOW_SYSTEM_CANNOT_MODIFY },
                    { status: 403 }
                );
            }

            definition = await prisma.workflowDefinition.update({
                where: { id: existing.id },
                data: {
                    name,
                    description: description || null,
                    config,
                },
            });
        } else {
            definition = await prisma.workflowDefinition.create({
                data: {
                    tenantId,
                    entityType: entityType.toUpperCase(),
                    name,
                    description: description || null,
                    config,
                    isSystem: false,
                },
            });
        }

        void logAudit({
            userId,
            tenantId,
            action: existing ? 'UPDATE' : 'CREATE',
            entity: 'WorkflowDefinition',
            entityId: definition.id,
            newValues: { entityType: definition.entityType, name: definition.name },
            request,
        });

        return NextResponse.json({ success: true, data: definition });
    } catch (error) {
        return handleApiError(error);
    }
}
