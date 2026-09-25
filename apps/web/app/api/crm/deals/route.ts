export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prismaTenant, prisma, tenantStorage } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { createDealSchema, formatZodError } from '@/lib/validation-schemas';
import { WorkflowEngine } from '@qalcuity/workflow';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';

export async function GET(request: Request) {
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
        const { tenantId, userId } = auth;
        const { searchParams } = new URL(request.url);
        const stage = searchParams.get('stage');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        return tenantStorage.run({ tenantId, userId }, async () => {
            // tenantId is auto-injected by prismaTenant extension — no manual filtering needed
            const where: Record<string, unknown> = {};

            if (stage) {
                where.stage = stage.toUpperCase().replace(' ', '_');
            }

            if (search) {
                where.OR = [
                    { title: { contains: search } },
                    { contact: { name: { contains: search } } },
                ];
            }

            const [deals, total] = await Promise.all([
                prismaTenant.deal.findMany({
                    where,
                    include: {
                        contact: { select: { id: true, name: true, email: true } },
                        lead: { select: { id: true, name: true, company: true } },
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                prismaTenant.deal.count({ where }),
            ]);

            const data = deals.map((deal) => ({
                id: deal.id,
                title: deal.title,
                name: deal.title,
                value: deal.value,
                stage: deal.stage,
                probability: deal.probability,
                closeDate: deal.closeDate?.toISOString() || null,
                expectedCloseDate: deal.closeDate?.toISOString() || null,
                notes: deal.notes,
                contactId: deal.contactId,
                contactName: deal.contact?.name || null,
                company: deal.lead?.company || deal.contact?.name || null,
                leadId: deal.leadId,
                leadCompany: deal.lead?.company || null,
                assignedTo: null,
                createdAt: deal.createdAt.toISOString(),
            }));

            return NextResponse.json({
                success: true,
                data,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            });
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:deals:POST:${ip}`, 30, 60000);
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

        // Sanitize text inputs before validation
        const sanitizedBody = sanitizeObject(body);

        const validation = createDealSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Tentukan initial stage dari workflow definition
        const initialStage = WorkflowEngine.getInitialState('DEAL', tenantId) || 'DISCOVERY';
        const dealStage = (validatedData.stage || initialStage).toUpperCase().replace(' ', '_');

        // Validasi bahwa stage yang diberikan adalah valid dalam workflow
        const validStages = WorkflowEngine.getStates('DEAL', tenantId);
        if (validStages.length > 0 && !validStages.includes(dealStage)) {
            return NextResponse.json(
                {
                    success: false,
                    error: MSG.DEAL_STAGE_INVALID,
                },
                { status: 400 }
            );
        }

        const deal = await prisma.deal.create({
            data: {
                tenantId: tenantId,
                title: validatedData.title,
                value: validatedData.value || 0,
                stage: dealStage,
                probability: validatedData.probability || 0,
                closeDate: validatedData.closeDate ? new Date(validatedData.closeDate) : null,
                notes: validatedData.notes || null,
                contactId: validatedData.contactId || null,
                leadId: validatedData.leadId || null,
            },
            include: {
                contact: { select: { id: true, name: true, company: true } },
                lead: { select: { id: true, name: true, company: true } },
            },
        });

        // Catat workflow history untuk deal baru
        await prisma.workflowHistory.create({
            data: {
                tenantId,
                entityType: 'DEAL',
                entityId: deal.id,
                fromState: '',
                toState: dealStage,
                action: 'create',
                userId,
                notes: `Deal "${deal.title}" dibuat dengan stage "${dealStage}"`,
            },
        });

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
            contactId: deal.contactId,
            leadId: deal.leadId,
            contactName: deal.contact?.name || deal.lead?.name || null,
            company: deal.contact?.company || deal.lead?.company || null,
            createdAt: deal.createdAt.toISOString(),
            updatedAt: deal.updatedAt.toISOString(),
        };

        void logAudit({ userId, tenantId, action: 'CREATE', entity: 'Deal', entityId: deal.id, newValues: { title: deal.title, value: deal.value, stage: deal.stage } as Record<string, unknown>, request });
        return NextResponse.json({ success: true, data: mappedDeal }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
