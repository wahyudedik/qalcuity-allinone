export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { sanitizeInput } from '@/lib/sanitize';
import { logAudit } from '@/lib/audit';
import { updateDepartmentSchema, formatZodError } from '@/lib/validation-schemas';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:departments:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: MSG.TOO_MANY_REQUESTS, code: 'TOO_MANY_REQUESTS' }, { status: 429 });
        }

        const department = await prisma.department.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
            include: {
                employees: {
                    where: { deletedAt: null },
                    select: {
                        id: true,
                        employeeId: true,
                        name: true,
                        email: true,
                        position: true,
                        status: true,
                        joinDate: true,
                    },
                    orderBy: { name: 'asc' },
                },
                _count: {
                    select: { employees: true },
                },
            },
        });

        if (!department) {
            return NextResponse.json(
                { success: false, error: MSG.DEPARTMENT_NOT_FOUND, code: 'DEPARTMENT_NOT_FOUND' },
                { status: 404 }
            );
        }

        const data = {
            id: department.id,
            name: department.name,
            description: department.description || '',
            isActive: department.isActive,
            employeeCount: department._count.employees,
            employees: department.employees.map((emp) => ({
                id: emp.id,
                employeeId: emp.employeeId,
                name: emp.name,
                email: emp.email,
                position: emp.position,
                status: emp.status,
                joinDate: emp.joinDate.toISOString(),
            })),
            createdAt: department.createdAt.toISOString(),
            updatedAt: department.updatedAt.toISOString(),
        };

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:departments:PUT:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: MSG.TOO_MANY_REQUESTS, code: 'TOO_MANY_REQUESTS' }, { status: 429 });
        }
        const body = await request.json();

        const validation = updateDepartmentSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const existing = await prisma.department.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.DEPARTMENT_NOT_FOUND, code: 'DEPARTMENT_NOT_FOUND' },
                { status: 404 }
            );
        }

        // Check duplicate name if name is being changed
        if (validatedData.name && validatedData.name !== existing.name) {
            const duplicateName = await prisma.department.findFirst({
                where: { name: sanitizeInput(validatedData.name), tenantId, deletedAt: null, id: { not: params.id } },
            });
            if (duplicateName) {
                return NextResponse.json(
                    { success: false, error: MSG.DEPARTMENT_NAME_DUPLICATE, code: 'DEPARTMENT_NAME_DUPLICATE' },
                    { status: 409 }
                );
            }
        }

        // Build safe update data with sanitization
        const data: Record<string, unknown> = {};
        if (validatedData.name !== undefined) data.name = sanitizeInput(validatedData.name);
        if (validatedData.description !== undefined) data.description = validatedData.description ? sanitizeInput(validatedData.description) : null;
        if (validatedData.isActive !== undefined) data.isActive = validatedData.isActive;

        const department = await prisma.department.update({
            where: { id: params.id },
            data,
        });

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Department', entityId: params.id, newValues: data as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: department });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:departments:DELETE:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: MSG.TOO_MANY_REQUESTS, code: 'TOO_MANY_REQUESTS' }, { status: 429 });
        }

        const existing = await prisma.department.findFirst({
            where: { id: params.id, tenantId, deletedAt: null },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.DEPARTMENT_NOT_FOUND, code: 'DEPARTMENT_NOT_FOUND' },
                { status: 404 }
            );
        }

        // Check if department has active employees
        const employeeCount = await prisma.employee.count({
            where: { departmentId: params.id, deletedAt: null },
        });

        if (employeeCount > 0) {
            return NextResponse.json(
                { success: false, error: MSG.DEPARTMENT_HAS_EMPLOYEES, code: 'DEPARTMENT_HAS_EMPLOYEES' },
                { status: 409 }
            );
        }

        // Soft delete
        const deleteResult = await prisma.department.updateMany({ where: { id: params.id, tenantId }, data: { deletedAt: new Date() } });
        if (deleteResult.count === 0) {
            return NextResponse.json(
                { success: false, error: MSG.DEPARTMENT_ACCESS_DENIED, code: 'DEPARTMENT_ACCESS_DENIED' },
                { status: 404 }
            );
        }

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Department', entityId: params.id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        return handleApiError(error);
    }
}
