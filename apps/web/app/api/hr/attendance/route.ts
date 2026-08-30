import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireMutateAuth } from '@/lib/session';

export async function GET(request: Request) {
    try {
        const { tenantId } = await requireAuth();
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'today';
        const date = searchParams.get('date');
        const search = searchParams.get('search');
        const employeeId = searchParams.get('employeeId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        // For 'today' type, filter by today's date
        if (type === 'today') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            where.date = { gte: today, lt: tomorrow };
        } else if (date) {
            const filterDate = new Date(date);
            filterDate.setHours(0, 0, 0, 0);
            const nextDate = new Date(filterDate);
            nextDate.setDate(nextDate.getDate() + 1);
            where.date = { gte: filterDate, lt: nextDate };
        }

        if (employeeId) {
            where.employeeId = employeeId;
        }

        if (search) {
            where.OR = [
                { employee: { name: { contains: search } } },
                { employee: { employeeId: { contains: search } } },
                { notes: { contains: search } },
            ];
        }

        const [records, total] = await Promise.all([
            prisma.attendanceRecord.findMany({
                where,
                include: {
                    employee: {
                        select: { id: true, name: true, employeeId: true, position: true, department: true },
                    },
                },
                orderBy: { date: 'desc' },
                skip,
                take: limit,
            }),
            prisma.attendanceRecord.count({ where }),
        ]);

        const data = records.map((r: any) => ({
            id: r.id,
            employeeName: r.employee.name,
            employeeId: r.employee.employeeId,
            position: r.employee.position,
            department: r.employee.department,
            date: r.date.toISOString().split('T')[0],
            clockIn: r.clockIn ? r.clockIn.toISOString().substring(11, 16) : null,
            clockOut: r.clockOut ? r.clockOut.toISOString().substring(11, 16) : null,
            status: r.status.toLowerCase(),
            workHours: r.workHours,
            notes: r.notes || '',
            createdAt: r.createdAt.toISOString(),
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
        const { tenantId } = await requireMutateAuth();
        const body = await request.json();

        if (!body.employeeId || !body.date) {
            return NextResponse.json(
                { success: false, error: 'Employee ID and date are required' },
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

        const date = new Date(body.date);
        date.setHours(0, 0, 0, 0);

        // Check if attendance already exists for this date
        const existing = await prisma.attendanceRecord.findFirst({
            where: { employeeId: body.employeeId, date, tenantId },
        });
        if (existing) {
            return NextResponse.json(
                { success: false, error: 'Attendance record already exists for this date' },
                { status: 409 }
            );
        }

        const clockIn = body.clockIn ? new Date(`${body.date}T${body.clockIn}`) : null;
        const clockOut = body.clockOut ? new Date(`${body.date}T${body.clockOut}`) : null;

        let workHours = body.workHours || 0;
        if (clockIn && clockOut && !workHours) {
            workHours = Math.round(((clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)) * 100) / 100;
        }

        const record = await prisma.attendanceRecord.create({
            data: {
                date,
                clockIn,
                clockOut,
                status: (body.status || 'PRESENT').toUpperCase(),
                workHours,
                notes: body.notes || '',
                employeeId: body.employeeId,
                tenantId,
            },
            include: {
                employee: { select: { name: true, employeeId: true } },
            },
        });

        return NextResponse.json({ success: true, data: record }, { status: 201 });
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
        const { id, clockOut, status } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const existing = await prisma.attendanceRecord.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Attendance record not found' },
                { status: 404 }
            );
        }

        const data: Record<string, unknown> = {};

        if (status) {
            data.status = status.toUpperCase();
        }

        if (clockOut && existing.clockIn) {
            const dateStr = existing.date.toISOString().split('T')[0];
            data.clockOut = new Date(`${dateStr}T${clockOut}`);
            // Recalculate work hours
            const outH = parseInt(clockOut.split(':')[0]);
            const outM = parseInt(clockOut.split(':')[1]);
            const inTime = existing.clockIn;
            const inH = inTime.getHours();
            const inM = inTime.getMinutes();
            data.workHours = Math.round(((outH * 60 + outM) - (inH * 60 + inM)) / 60 * 100) / 100;
        }

        const updated = await prisma.attendanceRecord.update({
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

export async function PUT(request: Request) {
    try {
        const { tenantId } = await requireMutateAuth();
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const existing = await prisma.attendanceRecord.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Attendance record not found' },
                { status: 404 }
            );
        }

        const data: Record<string, unknown> = {};
        if (updateData.date) {
            data.date = new Date(String(updateData.date));
        }
        if (updateData.clockIn) {
            const dateStr = existing.date.toISOString().split('T')[0];
            data.clockIn = new Date(`${dateStr}T${updateData.clockIn}`);
        }
        if (updateData.clockOut) {
            const dateStr = existing.date.toISOString().split('T')[0];
            data.clockOut = new Date(`${dateStr}T${updateData.clockOut}`);
        }
        if (typeof updateData.status === 'string') {
            data.status = updateData.status.toUpperCase();
        }
        if (typeof updateData.workHours === 'number') {
            data.workHours = updateData.workHours;
        }
        if (typeof updateData.notes === 'string') {
            data.notes = updateData.notes;
        }

        const updated = await prisma.attendanceRecord.update({
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
        const { tenantId } = await requireMutateAuth();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const existing = await prisma.attendanceRecord.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Attendance record not found' },
                { status: 404 }
            );
        }

        await prisma.attendanceRecord.delete({ where: { id } });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
