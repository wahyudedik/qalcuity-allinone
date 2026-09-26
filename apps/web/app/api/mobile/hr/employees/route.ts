export const dynamic = 'force-dynamic';

/**
 * Mobile API — Employees CRUD (List + Create)
 *
 * GET  /api/mobile/hr/employees       — List employees (paginated, search, status/department filter)
 * POST /api/mobile/hr/employees       — Create new employee
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

// ─── GET /api/mobile/hr/employees ─────────────────────────────────────────────
// List employees dengan pagination, search, dan status/department filter.

export async function GET(req: Request) {
    try {
        const user = await requireMobileAuth(req);
        if (!user) {
            return NextResponse.json({ success: false, error: MSG.UNAUTHORIZED }, { status: 401 });
        }

        const { tenantId } = user;
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const department = searchParams.get('department');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (status) {
            where.status = status.toUpperCase();
        }

        if (department) {
            where.department = department;
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
                { position: { contains: search } },
                { phone: { contains: search } },
            ];
        }

        const [employees, total] = await Promise.all([
            prisma.employee.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.employee.count({ where }),
        ]);

        const data = employees.map((emp) => ({
            id: emp.id,
            employeeId: emp.employeeId,
            name: emp.name,
            email: emp.email,
            phone: emp.phone || '',
            position: emp.position,
            department: emp.department || '',
            joinDate: emp.joinDate.toISOString(),
            salary: emp.salary,
            status: emp.status,
            createdAt: emp.createdAt.toISOString(),
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
        return handleApiError(error);
    }
}

// ─── POST /api/mobile/hr/employees ────────────────────────────────────────────
// Create new employee.

export async function POST(req: Request) {
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

        // Sanitize text inputs
        const sanitizedName = sanitizeInput(validatedData.name);
        const sanitizedEmail = sanitizeInput(validatedData.email);
        const sanitizedPhone = validatedData.phone ? sanitizeInput(validatedData.phone) : null;
        const sanitizedPosition = sanitizeInput(validatedData.position);
        const sanitizedDepartment = sanitizeInput(validatedData.department);

        // Check duplicate email within tenant
        const existingEmployee = await prisma.employee.findFirst({
            where: { email: sanitizedEmail, tenantId },
        });

        if (existingEmployee) {
            return NextResponse.json(
                { success: false, error: MSG.EMPLOYEE_EMAIL_DUPLICATE, code: 'EMPLOYEE_EMAIL_DUPLICATE' },
                { status: 409 }
            );
        }

        // Generate employee ID
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const employeeId = `EMP-${dateStr}-${randomSuffix}`;

        const employee = await prisma.employee.create({
            data: {
                tenantId,
                employeeId,
                name: sanitizedName,
                email: sanitizedEmail,
                phone: sanitizedPhone,
                position: sanitizedPosition,
                department: sanitizedDepartment,
                joinDate: new Date(validatedData.joinDate),
                salary: validatedData.salary || 0,
                status: validatedData.status || 'ACTIVE',
            },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'Employee',
            entityId: employee.id,
            newValues: { name: employee.name, email: employee.email, position: employee.position },
            request: req,
        });

        return NextResponse.json({ success: true, data: employee }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
