import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { createResourceAllocationSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';

// =============================================================================
// GET /api/projects/[id]/resources — List resource allocations
// =============================================================================

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        // Verify project belongs to tenant
        const project = await prisma.project.findFirst({
            where: { id, tenantId },
        });

        if (!project) {
            return NextResponse.json({ success: false, error: MSG.PROJECT_NOT_FOUND }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');
        const active = searchParams.get('active'); // 'true' to filter only active allocations

        const where: Record<string, unknown> = { projectId: id, tenantId };
        if (employeeId) {
            where.employeeId = employeeId;
        }
        if (active === 'true') {
            const now = new Date();
            where.startDate = { lte: now };
            where.endDate = { gte: now };
        }

        const allocations = await prisma.resourceAllocation.findMany({
            where,
            orderBy: { startDate: 'desc' },
        });

        // Calculate summary
        const totalAllocation = allocations.reduce((sum, a) => sum + a.allocationPct, 0);

        // Group by employee
        const byEmployee: Record<string, {
            employeeId: string;
            totalAllocation: number;
            allocations: number;
            roles: string[];
        }> = {};
        allocations.forEach((a) => {
            if (!byEmployee[a.employeeId]) {
                byEmployee[a.employeeId] = {
                    employeeId: a.employeeId,
                    totalAllocation: 0,
                    allocations: 0,
                    roles: [],
                };
            }
            byEmployee[a.employeeId].totalAllocation += a.allocationPct;
            byEmployee[a.employeeId].allocations += 1;
            if (!byEmployee[a.employeeId].roles.includes(a.role)) {
                byEmployee[a.employeeId].roles.push(a.role);
            }
        });

        return NextResponse.json({
            success: true,
            data: allocations.map((a) => ({
                id: a.id,
                projectId: a.projectId,
                employeeId: a.employeeId,
                role: a.role,
                allocationPct: a.allocationPct,
                startDate: a.startDate.toISOString(),
                endDate: a.endDate.toISOString(),
                hourlyRate: a.hourlyRate ? Number(a.hourlyRate) : null,
                notes: a.notes,
                createdAt: a.createdAt.toISOString(),
                updatedAt: a.updatedAt.toISOString(),
            })),
            summary: {
                totalAllocations: allocations.length,
                totalAllocationPct: totalAllocation,
                uniqueEmployees: Object.keys(byEmployee).length,
            },
            byEmployee: Object.values(byEmployee),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

// =============================================================================
// POST /api/projects/[id]/resources — Create resource allocation
// =============================================================================

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;
        const body = await request.json();

        const validation = createResourceAllocationSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        // Verify project belongs to tenant
        const project = await prisma.project.findFirst({
            where: { id, tenantId },
        });

        if (!project) {
            return NextResponse.json({ success: false, error: MSG.PROJECT_NOT_FOUND }, { status: 404 });
        }

        const { employeeId, role, allocationPct, startDate, endDate, hourlyRate, notes } = validation.data;

        // Validate date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end < start) {
            return NextResponse.json(
                { success: false, error: MSG.PROJECT_RESOURCE_END_BEFORE_START },
                { status: 400 }
            );
        }

        // Check for overlapping allocations for the same employee
        const overlapping = await prisma.resourceAllocation.findFirst({
            where: {
                tenantId,
                projectId: id,
                employeeId,
                OR: [
                    { startDate: { lte: end }, endDate: { gte: start } },
                ],
            },
        });

        if (overlapping) {
            return NextResponse.json(
                { success: false, error: MSG.PROJECT_RESOURCE_OVERLAP },
                { status: 409 }
            );
        }

        const allocation = await prisma.resourceAllocation.create({
            data: {
                tenantId,
                projectId: id,
                employeeId: employeeId.trim(),
                role: role || 'MEMBER',
                allocationPct,
                startDate: start,
                endDate: end,
                hourlyRate: hourlyRate || null,
                notes: notes?.trim() || null,
            },
        });

        // Audit logging non-blocking
        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'ResourceAllocation',
            entityId: allocation.id,
            newValues: validation.data as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: allocation.id,
                projectId: allocation.projectId,
                employeeId: allocation.employeeId,
                role: allocation.role,
                allocationPct: allocation.allocationPct,
                startDate: allocation.startDate.toISOString(),
                endDate: allocation.endDate.toISOString(),
                hourlyRate: allocation.hourlyRate ? Number(allocation.hourlyRate) : null,
                notes: allocation.notes,
                createdAt: allocation.createdAt.toISOString(),
                updatedAt: allocation.updatedAt.toISOString(),
            },
        }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
