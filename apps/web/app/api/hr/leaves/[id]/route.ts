import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { tenantId } = await requireAuth();
        const { id } = params;

        const leave = await prisma.leaveRequest.findFirst({
            where: { id, tenantId },
            include: {
                employee: {
                    select: { id: true, name: true, employeeId: true, position: true, department: true, email: true, phone: true },
                },
            },
        });

        if (!leave) {
            return NextResponse.json(
                { success: false, error: 'Leave request not found' },
                { status: 404 }
            );
        }

        const data = {
            id: leave.id,
            employeeId: leave.employeeId,
            employeeName: leave.employee.name,
            employeeNumber: leave.employee.employeeId,
            position: leave.employee.position,
            department: leave.employee.department,
            type: leave.type.toLowerCase(),
            startDate: leave.startDate.toISOString().split('T')[0],
            endDate: leave.endDate.toISOString().split('T')[0],
            days: leave.days,
            reason: leave.reason || '',
            status: leave.status.toLowerCase(),
            appliedDate: leave.appliedDate.toISOString().split('T')[0],
            approvedBy: leave.approvedBy || null,
            notes: leave.notes || '',
            createdAt: leave.createdAt.toISOString(),
        };

        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { tenantId } = await requireAuth();
        const { id } = params;
        const body = await request.json();

        const existing = await prisma.leaveRequest.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Leave request not found' },
                { status: 404 }
            );
        }

        const data: Record<string, unknown> = {};
        if (typeof body.type === 'string') data.type = body.type.toUpperCase();
        if (body.startDate) data.startDate = new Date(String(body.startDate));
        if (body.endDate) data.endDate = new Date(String(body.endDate));
        if (typeof body.days === 'number') data.days = body.days;
        if (typeof body.reason === 'string') data.reason = body.reason;
        if (typeof body.status === 'string') data.status = body.status.toUpperCase();
        if (typeof body.approvedBy === 'string') data.approvedBy = body.approvedBy;
        if (typeof body.notes === 'string') data.notes = body.notes;

        // Recalculate days if dates changed
        if (data.startDate || data.endDate) {
            const start = data.startDate ? new Date(String(data.startDate)) : existing.startDate;
            const end = data.endDate ? new Date(String(data.endDate)) : existing.endDate;
            data.days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }

        const updated = await prisma.leaveRequest.update({
            where: { id },
            data,
            include: {
                employee: { select: { name: true, employeeId: true } },
            },
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { tenantId } = await requireAuth();
        const { id } = params;

        const existing = await prisma.leaveRequest.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Leave request not found' },
                { status: 404 }
            );
        }

        await prisma.leaveRequest.delete({ where: { id } });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
