import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        const record = await prisma.attendanceRecord.findFirst({
            where: { id, tenantId },
            include: {
                employee: {
                    select: { id: true, name: true, employeeId: true, position: true, department: true, email: true, phone: true },
                },
            },
        });

        if (!record) {
            return NextResponse.json(
                { success: false, error: 'Attendance record not found' },
                { status: 404 }
            );
        }

        const data = {
            id: record.id,
            employeeId: record.employeeId,
            employeeName: record.employee.name,
            employeeNumber: record.employee.employeeId,
            position: record.employee.position,
            department: record.employee.department,
            date: record.date.toISOString().split('T')[0],
            clockIn: record.clockIn ? record.clockIn.toISOString().substring(11, 16) : null,
            clockOut: record.clockOut ? record.clockOut.toISOString().substring(11, 16) : null,
            status: record.status.toLowerCase(),
            workHours: record.workHours,
            notes: record.notes || '',
            createdAt: record.createdAt.toISOString(),
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
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;
        const body = await request.json();

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
        if (body.date) data.date = new Date(String(body.date));
        if (body.clockIn) {
            const dateStr = existing.date.toISOString().split('T')[0];
            data.clockIn = new Date(`${dateStr}T${body.clockIn}`);
        }
        if (body.clockOut) {
            const dateStr = existing.date.toISOString().split('T')[0];
            data.clockOut = new Date(`${dateStr}T${body.clockOut}`);
        }
        if (typeof body.status === 'string') data.status = body.status.toUpperCase();
        if (typeof body.workHours === 'number') data.workHours = body.workHours;
        if (typeof body.notes === 'string') data.notes = body.notes;

        const updated = await prisma.attendanceRecord.update({
            where: { id },
            data,
            include: {
                employee: { select: { name: true, employeeId: true } },
            },
        });

        await logAudit({
            tenantId,
            userId,
            action: 'UPDATE',
            entity: 'Attendance',
            entityId: updated.id,
            oldValues: { date: existing.date, clockIn: existing.clockIn, clockOut: existing.clockOut, status: existing.status, notes: existing.notes },
            newValues: { date: updated.date, clockIn: updated.clockIn, clockOut: updated.clockOut, status: updated.status, notes: updated.notes },
            request,
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
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;

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

        await logAudit({
            tenantId,
            userId,
            action: 'DELETE',
            entity: 'Attendance',
            entityId: id,
            oldValues: { date: existing.date, clockIn: existing.clockIn, clockOut: existing.clockOut, status: existing.status, notes: existing.notes },
            request,
        });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message === 'Unauthorized') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
