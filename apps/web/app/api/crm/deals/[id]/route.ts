import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updateDealSchema, formatZodError } from '@/lib/validation-schemas';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        const deal = await prisma.deal.findFirst({
            where: { id, tenantId },
            include: {
                contact: { select: { id: true, name: true, company: true, email: true, phone: true, address: true } },
                lead: { select: { id: true, name: true, company: true, email: true, phone: true } },
            },
        });

        if (!deal) {
            return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
        }

        // Map to frontend-compatible format
        const data = {
            id: deal.id,
            name: deal.title,
            company: (deal.contact as Record<string, unknown>)?.company || deal.lead?.company || '-',
            contactName: deal.contact?.name || '-',
            contactEmail: deal.contact?.email || '',
            contactPhone: deal.contact?.phone || '',
            value: deal.value,
            currency: 'IDR',
            stage: deal.stage,
            probability: deal.probability,
            expectedCloseDate: deal.closeDate?.toISOString().split('T')[0] || '',
            createdAt: deal.createdAt.toISOString(),
            notes: deal.notes || '',
            activities: [],
        };

        return NextResponse.json({ success: true, data });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;
        const body = await request.json();

        const validation = updateDealSchema.safeParse(body);
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
            return NextResponse.json({ success: false, error: 'Deal tidak ditemukan' }, { status: 404 });
        }

        // Validasi workflow transition jika stage berubah
        const newStage = validatedData.stage
            ? validatedData.stage.toUpperCase().replace(' ', '_')
            : undefined;

        if (newStage && newStage !== existing.stage) {
            try {
                const { validateWorkflowTransitionSafe, logWorkflowHistory } = await import('@/lib/workflow');
                const transitionValidation = await validateWorkflowTransitionSafe(
                    tenantId,
                    'DEAL',
                    existing.stage,
                    newStage,
                    'MEMBER'
                );

                if (!transitionValidation.valid) {
                    return NextResponse.json(
                        { success: false, error: transitionValidation.error },
                        { status: 400 }
                    );
                }
            } catch (workflowError: unknown) {
                // Backward compatibility: jika workflow engine gagal, tetap izinkan perubahan stage
                const msg = workflowError instanceof Error ? workflowError.message : 'Unknown error';
                console.warn(`[Workflow] Deal workflow validation gagal, mengizinkan transisi: ${msg}`);
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
            try {
                const { logWorkflowHistory } = await import('@/lib/workflow');
                await logWorkflowHistory({
                    tenantId,
                    entityType: 'DEAL',
                    entityId: id,
                    fromState: existing.stage,
                    toState: newStage,
                    action: 'stage_change',
                    userId,
                    notes: `Stage diubah dari "${existing.stage}" ke "${newStage}"`,
                });
            } catch (workflowError: unknown) {
                const msg = workflowError instanceof Error ? workflowError.message : 'Unknown error';
                console.warn(`[Workflow] Deal workflow history gagal ditulis: ${msg}`);
            }
        }

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Deal', entityId: id, newValues: validatedData as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: deal });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request body';
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;

        const existing = await prisma.deal.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
        }

        await prisma.deal.delete({ where: { id } });

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Deal', entityId: id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
