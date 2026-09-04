import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createDealSchema, updateDealSchema, formatZodError } from '@/lib/validation-schemas';
import { WorkflowEngine } from '@qalcuity/workflow';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:deals:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { searchParams } = new URL(request.url);
        const stage = searchParams.get('stage');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

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
            prisma.deal.findMany({
                where,
                include: {
                    contact: { select: { id: true, name: true, email: true } },
                    lead: { select: { id: true, name: true, company: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.deal.count({ where }),
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
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:deals:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();

        const validation = createDealSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Tentukan initial stage dari workflow definition
        const initialStage = WorkflowEngine.getInitialState('DEAL', tenantId) || 'LEAD';
        const dealStage = (validatedData.stage || initialStage).toUpperCase().replace(' ', '_');

        // Validasi bahwa stage yang diberikan adalah valid dalam workflow
        const validStages = WorkflowEngine.getStates('DEAL', tenantId);
        if (validStages.length > 0 && !validStages.includes(dealStage)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Stage "${dealStage}" tidak valid. Stage yang tersedia: ${validStages.join(', ')}`,
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
                contact: { select: { id: true, name: true } },
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

        void logAudit({ userId, tenantId, action: 'CREATE', entity: 'Deal', entityId: deal.id, newValues: { title: deal.title, value: deal.value, stage: deal.stage } as Record<string, unknown>, request });
        return NextResponse.json({ success: true, data: deal }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID wajib diisi' },
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
            where: { id, tenantId: tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Deal tidak ditemukan' },
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

        const deal = await prisma.deal.update({
            where: { id },
            data: {
                ...(validatedData.title !== undefined && { title: validatedData.title }),
                ...(validatedData.value !== undefined && { value: validatedData.value }),
                ...(newStage !== undefined && { stage: newStage }),
                ...(validatedData.probability !== undefined && { probability: validatedData.probability }),
                ...(validatedData.closeDate !== undefined && { closeDate: validatedData.closeDate ? new Date(validatedData.closeDate) : null }),
                ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
                ...(validatedData.contactId !== undefined && { contactId: validatedData.contactId }),
                ...(validatedData.leadId !== undefined && { leadId: validatedData.leadId }),
            },
        });

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

export async function DELETE(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const existing = await prisma.deal.findFirst({
            where: { id, tenantId: tenantId },
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
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
