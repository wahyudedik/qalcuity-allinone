import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { addProjectMemberSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { id } = params;

        // Verify project exists and belongs to tenant
        const project = await prisma.project.findFirst({
            where: { id, tenantId },
        });

        if (!project) {
            return NextResponse.json({ success: false, error: MSG.PROJECT_NOT_FOUND }, { status: 404 });
        }

        const members = await prisma.projectMember.findMany({
            where: { projectId: id, tenantId },
            orderBy: { joinedAt: 'asc' },
        });

        return NextResponse.json({ success: true, data: members });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:projects:members:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id } = params;
        const body = await request.json();

        // Validasi input dengan Zod
        const validation = addProjectMemberSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        // Verify project exists and belongs to tenant
        const project = await prisma.project.findFirst({
            where: { id, tenantId },
        });

        if (!project) {
            return NextResponse.json({ success: false, error: MSG.PROJECT_NOT_FOUND }, { status: 404 });
        }

        // Check for duplicate membership
        const existingMember = await prisma.projectMember.findUnique({
            where: {
                projectId_employeeId: {
                    projectId: id,
                    employeeId: validation.data.employeeId,
                },
            },
        });

        if (existingMember) {
            return NextResponse.json(
                { success: false, error: MSG.PROJECT_MEMBER_ALREADY_EXISTS },
                { status: 409 }
            );
        }

        const member = await prisma.projectMember.create({
            data: {
                tenantId,
                projectId: id,
                employeeId: validation.data.employeeId,
                role: validation.data.role || 'MEMBER',
            },
        });

        // Audit logging non-blocking
        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'ProjectMember',
            entityId: member.id,
            newValues: validation.data as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({ success: true, data: member }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
