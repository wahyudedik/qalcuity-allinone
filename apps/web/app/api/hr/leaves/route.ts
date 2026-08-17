import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET(request: Request) {
    try {
        const { tenantId } = await requireAuth();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const type = searchParams.get('type');
        const search = searchParams.get('search');
        const employeeId = searchParams.get('employeeId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (status) {
            where.status = status.toUpperCase();
        }

        if (type) {
            where.type = type.toUpperCase();
        }

        if (employeeId) {
            where.employeeId = employeeId;
        }

        if (search) {
            where.OR = [
                { employee: { name: { contains: search } } },
                { employee: { employeeId: { contains: search } } },
                { reason: { contains: search } },
            ];
        }

        const [leaves, total] = await Promise.all([
            prisma.leaveRequest.findMany({
                where,
                include: {
                    employee: {
                        select: { id: true, name: true, employeeId: true, position: true, department: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.leaveRequest.count({ where }),
        ]);

        const data = leaves.map((l) => ({
            id: l.id,
            employeeName: l.employee.name,
            employeeId: l.employee.employeeId,
            position: l.employee.position,
            department: l.employee.department,
            type: l.type.toLowerCase(),
            startDate: l.startDate.toISOString().split('T')[0],
            endDate: l.endDate.toISOString().split('T')[0],
            days: l.days,
            reason: l.reason || '',
            status: l.status.toLowerCase(),
            appliedDate: l.appliedDate.toISOString().split('T')[0],
            approvedBy: l.approvedBy || '',
            notes: l.notes || '',
            createdAt: l.createdAt.toISOString(),
        }));

        return NextResponse.json({
            success: true,
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { tenantId } = await requireAuth();
        const body = await request.json();

        if (!body.employeeId || !body.type || !body.startDate || !body.endDate) {
            return NextResponse.json(
                { success: false, error: 'Employee ID, type, start date, and end date are required' },
                { status: 400 }
            );
        }

        // Validate employee belongs to tenant
        const employee = await prisma.employee.findFirst({
            where: { id: body.employeeId, tenantId },
        });
        if (!employee) {
            return NextResponse.json(
                { success: false, error: 'Employee not found' },
                { status: 404 }
            );
        }

        const startDate = new Date(body.startDate);
        const endDate = new Date(body.endDate);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        if (days <= 0) {
            return NextResponse.json(
                { success: false, error: 'End date must be after start date' },
                { status: 400 }
            );
        }

        const leave = await prisma.leaveRequest.create({
            data: {
                type: body.type.toUpperCase(),
                startDate,
                endDate,
                days,
                reason: body.reason || '',
                notes: body.notes || '',
                employeeId: body.employeeId,
                tenantId,
            },
            include: {
                employee: { select: { name: true, employeeId: true } },
            },
        });

        return NextResponse.json({ success: true, data: leave }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { tenantId } = await requireAuth();
        const body = await request.json();
        const { id, status, approvedBy } = body;

        if (!id || !status) {
            return NextResponse.json(
                { success: false, error: 'ID and status are required' },
                { status: 400 }
            );
        }

        const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
        const newStatus = status.toUpperCase();
        if (!validStatuses.includes(newStatus)) {
            return NextResponse.json(
                { success: false, error: 'Status must be PENDING, APPROVED, or REJECTED' },
                { status: 400 }
            );
        }

        const existing = await prisma.leaveRequest.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Leave request not found' },
                { status: 404 }
            );
        }

        const updated = await prisma.leaveRequest.update({
            where: { id },
            data: {
                status: newStatus,
                approvedBy: approvedBy || existing.approvedBy,
            },
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

export async function PUT(request: Request) {
    try {
        const { tenantId } = await requireAuth();
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

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
        if (typeof updateData.type === 'string') {
            data.type = updateData.type.toUpperCase();
        }
        if (updateData.startDate) {
            data.startDate = new Date(String(updateData.startDate));
        }
        if (updateData.endDate) {
            data.endDate = new Date(String(updateData.endDate));
        }
        if (typeof updateData.days === 'number') {
            data.days = updateData.days;
        }
        if (typeof updateData.reason === 'string') {
            data.reason = updateData.reason;
        }
        if (typeof updateData.status === 'string') {
            data.status = updateData.status.toUpperCase();
        }
        if (typeof updateData.approvedBy === 'string') {
            data.approvedBy = updateData.approvedBy;
        }
        if (typeof updateData.notes === 'string') {
            data.notes = updateData.notes;
        }

        // Recalculate days if startDate or endDate changed
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

export async function DELETE(request: Request) {
    try {
        const { tenantId } = await requireAuth();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

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
