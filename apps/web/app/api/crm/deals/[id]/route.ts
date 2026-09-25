export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { updateDealSchema, formatZodError } from '@/lib/validation-schemas';
import { WorkflowEngine } from '@qalcuity/workflow';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';
import { optimisticUpdateRaw } from '@/lib/optimistic-lock';

// ─── GET /api/crm/deals/[id] ────────────────────────────────────────────────
// Ambil detail satu deal berdasarkan ID.

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:deals:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const deal = await prisma.deal.findFirst({
            where: { id: params.id, tenantId },
            include: {
                contact: { select: { id: true, name: true, email: true, phone: true, company: true } },
                lead: { select: { id: true, name: true, email: true, phone: true, company: true } },
            },
        });

        if (!deal) {
            return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
        }

        const mappedDeal = {
            id: deal.id,
            title: deal.title,
            name: deal.title,
            value: Number(deal.value),
            stage: deal.stage,
            probability: deal.probability,
            closeDate: deal.closeDate?.toISOString() || null,
            expectedCloseDate: deal.closeDate?.toISOString() || null,
            notes: deal.notes,
            version: deal.version,
            contactId: deal.contactId,
            leadId: deal.leadId,
            contactName: deal.contact?.name || deal.lead?.name || null,
            company: deal.contact?.company || deal.lead?.company || null,
            createdAt: deal.createdAt.toISOString(),
            updatedAt: deal.updatedAt.toISOString(),
        };

        return NextResponse.json({ success: true, data: mappedDeal });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── PUT /api/crm/deals/[id] ────────────────────────────────────────────────
// Update deal berdasarkan ID.

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();
        const id = params.id;
        const { version, ...updateData } = body;

        if (version === undefined || version === null) {
            return NextResponse.json(
                { success: false, error: 'Version is required for concurrent update safety', code: 'VERSION_REQUIRED' },
                { status: 400 }
            );
        }

        const validation = updateDealSchema.safeParse(updateData);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const existing = await prisma.deal.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.DEAL_NOT_FOUND },
                { status: 404 }
            );
        }

        // Validasi workflow transition jika stage berubah
        const newStage = validatedData.stage
            ? validatedData.stage.toUpperCase().replace(' ', '_')
            : undefined;

        if (newStage && newStage !== existing.stage) {
            const { validateWorkflowTransition } = await import('@/lib/workflow');
            const validation = await validateWorkflowTransition(
                tenantId,
                'DEAL',
                existing.stage,
                newStage,
                'MEMBER'
            );

            if (!validation.valid) {
                return NextResponse.json(
                    { success: false, error: validation.error },
                    { status: 400 }
                );
            }
        }

        // Build SET clauses for optimistic update
        const setClauses: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 4; // $1=id, $2=tenantId, $3=version, $4+=values

        if (validatedData.title !== undefined) { setClauses.push(`title = $${paramIndex}`); values.push(validatedData.title); paramIndex++; }
        if (validatedData.value !== undefined) { setClauses.push(`value = $${paramIndex}`); values.push(validatedData.value); paramIndex++; }
        if (newStage !== undefined) { setClauses.push(`stage = $${paramIndex}`); values.push(newStage); paramIndex++; }
        if (validatedData.probability !== undefined) { setClauses.push(`probability = $${paramIndex}`); values.push(validatedData.probability); paramIndex++; }
        if (validatedData.closeDate !== undefined) { setClauses.push(`"closeDate" = $${paramIndex}`); values.push(validatedData.closeDate ? new Date(validatedData.closeDate) : null); paramIndex++; }
        if (validatedData.notes !== undefined) { setClauses.push(`notes = $${paramIndex}`); values.push(validatedData.notes); paramIndex++; }
        if (validatedData.contactId !== undefined) { setClauses.push(`"contactId" = $${paramIndex}`); values.push(validatedData.contactId); paramIndex++; }
        if (validatedData.leadId !== undefined) { setClauses.push(`"leadId" = $${paramIndex}`); values.push(validatedData.leadId); paramIndex++; }

        if (setClauses.length > 0) {
            await optimisticUpdateRaw('Deal', id, tenantId, version as number, setClauses.join(', '), values);
        }

        const deal = await prisma.deal.findUnique({ where: { id } });

        // Catat workflow history jika stage berubah
        if (newStage && newStage !== existing.stage) {
            await prisma.workflowHistory.create({
                data: {
                    tenantId,
                    entityType: 'DEAL',
                    entityId: id,
                    fromState: existing.stage,
                    toState: newStage,
                    action: 'stage_change',
                    userId,
                    notes: `Stage diubah dari "${existing.stage}" ke "${newStage}"`,
                },
            });
        }

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Deal', entityId: id, newValues: validatedData as Record<string, unknown>, request });
        return NextResponse.json({ success: true, data: deal });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const id = params.id;

        const existing = await prisma.deal.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Deal not found' },
                { status: 404 }
            );
        }

        await prisma.deal.delete({ where: { id } });

        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Deal', entityId: id, oldValues: { title: existing.title, value: existing.value, stage: existing.stage } as Record<string, unknown>, request });
        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        return handleApiError(error);
    }
}
