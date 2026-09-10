export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createFieldJobSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:field-jobs:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'MSG.TOO_MANY_REQUESTS' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');
        const scheduledDate = searchParams.get('scheduledDate');
        const employeeId = searchParams.get('employeeId');
        const projectId = searchParams.get('projectId');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId };

        if (status) {
            where.status = status.toUpperCase();
        }
        if (priority) {
            where.priority = priority.toUpperCase();
        }
        if (projectId) {
            where.projectId = projectId;
        }
        if (scheduledDate) {
            // Filter by date range for the given day
            const date = new Date(scheduledDate);
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            where.scheduledDate = { gte: date, lt: nextDay };
        }
        if (employeeId) {
            where.assignments = { some: { employeeId } };
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { customerName: { contains: search, mode: 'insensitive' } },
                { location: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [jobs, total] = await Promise.all([
            prisma.fieldJob.findMany({
                where,
                include: {
                    assignments: true,
                    _count: {
                        select: {
                            checklistResults: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: [
                    { scheduledDate: 'asc' },
                    { createdAt: 'desc' },
                ],
            }),
            prisma.fieldJob.count({ where }),
        ]);

        const data = jobs.map((j) => ({
            id: j.id,
            title: j.title,
            description: j.description,
            location: j.location,
            address: j.address,
            latitude: j.latitude ? Number(j.latitude) : null,
            longitude: j.longitude ? Number(j.longitude) : null,
            scheduledDate: j.scheduledDate?.toISOString() || null,
            scheduledTime: j.scheduledTime,
            estimatedDuration: j.estimatedDuration,
            status: j.status,
            priority: j.priority,
            customerName: j.customerName,
            customerPhone: j.customerPhone,
            customerEmail: j.customerEmail,
            notes: j.notes,
            projectId: j.projectId,
            completedAt: j.completedAt?.toISOString() || null,
            assignmentCount: j.assignments.length,
            checklistCount: j._count.checklistResults,
            assignments: j.assignments.map((a) => ({
                id: a.id,
                employeeId: a.employeeId,
                role: a.role,
                assignedAt: a.assignedAt.toISOString(),
                notes: a.notes,
            })),
            createdAt: j.createdAt.toISOString(),
            updatedAt: j.updatedAt.toISOString(),
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
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:field-jobs:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'MSG.TOO_MANY_REQUESTS' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const body = await request.json();

        const validation = createFieldJobSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const data = validation.data;

        const job = await prisma.fieldJob.create({
            data: {
                tenantId,
                projectId: data.projectId || null,
                title: data.title.trim(),
                description: data.description?.trim() || null,
                location: data.location?.trim() || null,
                address: data.address?.trim() || null,
                latitude: data.latitude || null,
                longitude: data.longitude || null,
                scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
                scheduledTime: data.scheduledTime || null,
                estimatedDuration: data.estimatedDuration || null,
                status: data.status || 'SCHEDULED',
                priority: data.priority || 'MEDIUM',
                customerName: data.customerName?.trim() || null,
                customerPhone: data.customerPhone?.trim() || null,
                customerEmail: data.customerEmail?.trim() || null,
                notes: data.notes?.trim() || null,
            },
        });

        await logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'FieldJob',
            entityId: job.id,
            newValues: { title: job.title, status: job.status, priority: job.priority },
            request,
        });

        return NextResponse.json({ success: true, data: job }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
