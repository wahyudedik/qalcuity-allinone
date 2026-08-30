import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireMutateAuth } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updateDealSchema, formatZodError } from '@/lib/validation-schemas';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireAuth();
        const { id } = params;

        const deal = await prisma.deal.findFirst({
            where: { id, tenantId: auth.tenantId },
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
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { userId, tenantId } = await requireMutateAuth();
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

        const deal = await prisma.deal.update({
            where: { id },
            data: {
                ...(validatedData.title !== undefined && { title: validatedData.title }),
                ...(validatedData.value !== undefined && { value: validatedData.value }),
                ...(validatedData.stage !== undefined && { stage: validatedData.stage.toUpperCase().replace(' ', '_') }),
                ...(validatedData.probability !== undefined && { probability: validatedData.probability }),
                ...(validatedData.closeDate !== undefined && { closeDate: validatedData.closeDate ? new Date(validatedData.closeDate) : null }),
                ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
                ...(validatedData.contactId !== undefined && { contactId: validatedData.contactId }),
                ...(validatedData.leadId !== undefined && { leadId: validatedData.leadId }),
            },
        });

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Deal', entityId: id, newValues: validatedData as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: deal });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request body';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { userId, tenantId } = await requireMutateAuth();
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
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: message }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
