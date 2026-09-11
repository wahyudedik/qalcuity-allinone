export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { sanitizeInput } from '@/lib/sanitize';
import { logAudit } from '@/lib/audit';
import { createDepartmentSchema, formatZodError } from '@/lib/validation-schemas';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:departments:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: MSG.TOO_MANY_REQUESTS, code: 'TOO_MANY_REQUESTS' }, { status: 429 });
        }
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const isActive = searchParams.get('isActive');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (isActive !== null && isActive !== undefined && isActive !== '') {
            where.isActive = isActive === 'true';
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { description: { contains: search } },
            ];
        }

        const [departments, total] = await Promise.all([
            prisma.department.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { employees: true },
                    },
                },
            }),
            prisma.department.count({ where }),
        ]);

        const data = departments.map((dept) => ({
            id: dept.id,
            name: dept.name,
            description: dept.description || '',
            isActive: dept.isActive,
            employeeCount: dept._count.employees,
            createdAt: dept.createdAt.toISOString(),
            updatedAt: dept.updatedAt.toISOString(),
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
        const rateLimitResult = checkRateLimit(`api:departments:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: MSG.TOO_MANY_REQUESTS, code: 'TOO_MANY_REQUESTS' }, { status: 429 });
        }
        const body = await request.json();

        const validation = createDepartmentSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const validatedData = validation.data;

        // Sanitize text inputs
        const sanitizedName = sanitizeInput(validatedData.name);
        const sanitizedDescription = validatedData.description ? sanitizeInput(validatedData.description) : null;

        // Check duplicate name within tenant
        const existingDepartment = await prisma.department.findFirst({
            where: { name: sanitizedName, tenantId, deletedAt: null },
        });

        if (existingDepartment) {
            return NextResponse.json(
                { success: false, error: MSG.DEPARTMENT_NAME_DUPLICATE, code: 'DEPARTMENT_NAME_DUPLICATE' },
                { status: 409 }
            );
        }

        const department = await prisma.department.create({
            data: {
                tenantId,
                name: sanitizedName,
                description: sanitizedDescription,
                isActive: validatedData.isActive ?? true,
            },
        });

        // Audit logging non-blocking
        void logAudit({ userId, tenantId, action: 'CREATE', entity: 'Department', entityId: department.id, newValues: { name: department.name } as Record<string, unknown>, request });

        return NextResponse.json({ success: true, data: department }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
