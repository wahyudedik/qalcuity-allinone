import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { sanitizeInput } from '@/lib/sanitize';
import { logAudit } from '@/lib/audit';
import { createEmployeeSchema, updateEmployeeSchema, formatZodError } from '@/lib/validation-schemas';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:employees:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: MSG.TOO_MANY_REQUESTS, code: 'TOO_MANY_REQUESTS' }, { status: 429 });
        }
        const { searchParams } = new URL(request.url);
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

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:employees:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: MSG.TOO_MANY_REQUESTS, code: 'TOO_MANY_REQUESTS' }, { status: 429 });
        }
        const body = await request.json();

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

        // Generate employee ID using timestamp-based approach to avoid race condition
        // EMP-YYYYMMDD-XXXX where XXXX is random suffix
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

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'CREATE', entity: 'Employee', entityId: employee.id, newValues: { name: employee.name, email: employee.email, position: employee.position } as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: employee }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: MSG.ID_REQUIRED, code: 'ID_REQUIRED' },
                { status: 400 }
            );
        }

        const validation = updateEmployeeSchema.safeParse(updateData);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        const existing = await prisma.employee.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.EMPLOYEE_NOT_FOUND, code: 'EMPLOYEE_NOT_FOUND' },
                { status: 404 }
            );
        }

        // Build safe update data with sanitization
        const data: Record<string, unknown> = {};
        if (validatedData.name !== undefined) data.name = sanitizeInput(validatedData.name);
        if (validatedData.email !== undefined) data.email = sanitizeInput(validatedData.email);
        if (validatedData.phone !== undefined) data.phone = validatedData.phone ? sanitizeInput(validatedData.phone) : null;
        if (validatedData.position !== undefined) data.position = sanitizeInput(validatedData.position);
        if (validatedData.department !== undefined) data.department = sanitizeInput(validatedData.department);
        if (validatedData.salary !== undefined) data.salary = validatedData.salary;
        if (validatedData.status !== undefined) data.status = validatedData.status;
        if (validatedData.joinDate !== undefined) data.joinDate = new Date(validatedData.joinDate);

        const employee = await prisma.employee.update({
            where: { id },
            data,
        });

        void logAudit({ userId, tenantId, action: 'UPDATE', entity: 'Employee', entityId: id, newValues: data as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: employee });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: MSG.ID_REQUIRED, code: 'ID_REQUIRED' },
                { status: 400 }
            );
        }

        const existing = await prisma.employee.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: MSG.EMPLOYEE_NOT_FOUND, code: 'EMPLOYEE_NOT_FOUND' },
                { status: 404 }
            );
        }

        // Use deleteMany with tenantId filter for defense-in-depth (TOCTOU protection)
        const deleteResult = await prisma.employee.deleteMany({ where: { id, tenantId } });
        if (deleteResult.count === 0) {
            return NextResponse.json(
                { success: false, error: MSG.EMPLOYEE_ACCESS_DENIED, code: 'EMPLOYEE_ACCESS_DENIED' },
                { status: 404 }
            );
        }

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'DELETE', entity: 'Employee', entityId: id, oldValues: existing as unknown as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        return handleApiError(error);
    }
}
