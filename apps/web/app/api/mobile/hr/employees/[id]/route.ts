export const dynamic = 'force-dynamic';

/**
 * Mobile API — Employee Detail (GET + Update + Delete)
 *
 * GET    /api/mobile/hr/employees/[id]  — Get employee detail
 * PUT    /api/mobile/hr/employees/[id]  — Update employee
 * DELETE /api/mobile/hr/employees/[id]  — Delete employee
 *
 * Auth: JWT Bearer token via requireMobileAuth()
 * Tenant: Filtered by user.tenantId
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireMobileAuth } from '@/lib/mobile-auth-guard';
import { sanitizeInput, sanitizeObject } from '@/lib/sanitize';
import { logAudit } from '@/lib/audit';
import { createEmployeeSchema, formatZodError } from '@/lib/validation-schemas';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';

// ─── GET /api/mobile/hr/employees/[id] ────────────────────────────────────────

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireMobileAuth(req);
        if (!user) {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        const employee = await prisma.employee.findFirst({
            where: { id: params.id, tenantId: user.tenantId },
        });

        if (!employee) {
            return NextResponse.json(
                { success: false, error: MSG.EMPLOYEE_NOT_FOUND },
                { status: 404 }
            );
        }

        const data = {
            id: employee.id,
            employeeId: employee.employeeId,
            name: employee.name,
            email: employee.email,
            phone: employee.phone || '',
            position: employee.position,
            department: employee.department || '',
            joinDate: employee.joinDate.toISOString(),
            salary: employee.salary,
            status: employee.status,
            createdAt: employee.createdAt.toISOString(),
            updatedAt: employee.updatedAt.toISOString(),
        };

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── PUT /api/mobile/hr/employees/[id] ────────────────────────────────────────

export async function PUT(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireMobileAuth(req);
        if (!user) {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        if (user.role === 'VIEWER') {
            return NextResponse.json(
                { success: false, error: MSG.FORBIDDEN },
                { status: 403 }
            );
        }

        const { id: userId, tenantId } = user;
        const body = await req.json();

        const validation = createEmployeeSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Cek apakah employee ada dan milik tenant ini
        const existing = await prisma.employee.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.EMPLOYEE_NOT_FOUND },
                { status: 404 }
            );
        }

        // Check duplicate email within tenant (excluding current employee)
        if (validatedData.email) {
            const sanitizedEmail = sanitizeInput(validatedData.email);
            const duplicateEmail = await prisma.employee.findFirst({
                where: {
                    email: sanitizedEmail,
                    tenantId,
                    id: { not: params.id },
                },
            });

            if (duplicateEmail) {
                return NextResponse.json(
                    { success: false, error: MSG.EMPLOYEE_EMAIL_DUPLICATE, code: 'EMPLOYEE_EMAIL_DUPLICATE' },
                    { status: 409 }
                );
            }
        }

        // Build safe update data with sanitization
        const data: Record<string, unknown> = {};
        if (validatedData.name !== undefined) data.name = sanitizeInput(validatedData.name);
        if (validatedData.email !== undefined) data.email = sanitizeInput(validatedData.email);
        if (validatedData.phone !== undefined) data.phone = validatedData.phone ? sanitizeInput(validatedData.phone) : null;
        if (validatedData.position !== undefined) data.position = sanitizeInput(validatedData.position);
        if (validatedData.department !== undefined) data.department = sanitizeInput(validatedData.department);
        if (validatedData.joinDate !== undefined) data.joinDate = new Date(validatedData.joinDate);
        if (validatedData.salary !== undefined) data.salary = validatedData.salary || 0;
        if (validatedData.status !== undefined) data.status = validatedData.status;

        const updated = await prisma.employee.update({
            where: { id: params.id },
            data,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'Employee',
            entityId: params.id,
            oldValues: { name: existing.name, email: existing.email },
            newValues: { name: updated.name, email: updated.email },
            request: req,
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── DELETE /api/mobile/hr/employees/[id] ─────────────────────────────────────

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireMobileAuth(req);
        if (!user) {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        if (user.role === 'VIEWER') {
            return NextResponse.json(
                { success: false, error: MSG.FORBIDDEN },
                { status: 403 }
            );
        }

        const { id: userId, tenantId } = user;

        const existing = await prisma.employee.findFirst({
            where: { id: params.id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.EMPLOYEE_NOT_FOUND },
                { status: 404 }
            );
        }

        await prisma.employee.delete({ where: { id: params.id } });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'Employee',
            entityId: params.id,
            oldValues: { name: existing.name, email: existing.email },
            request: req,
        });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        return handleApiError(error);
    }
}
