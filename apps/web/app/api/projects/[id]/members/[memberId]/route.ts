import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { updateProjectMemberSchema, formatZodError } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string; memberId: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id, memberId } = params;
        const body = await request.json();

        // Validasi input dengan Zod
        const validation = updateProjectMemberSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        // Verify project exists
        const project = await prisma.project.findFirst({
            where: { id, tenantId },
        });

        if (!project) {
            return NextResponse.json({ success: false, error: MSG.PROJECT_NOT_FOUND }, { status: 404 });
        }

        // Find the member
        const existingMember = await prisma.projectMember.findFirst({
            where: { id: memberId, projectId: id, tenantId },
        });

        if (!existingMember) {
            return NextResponse.json({ success: false, error: MSG.PROJECT_MEMBER_NOT_FOUND }, { status: 404 });
        }

        const member = await prisma.projectMember.update({
            where: { id: memberId },
            data: { role: validation.data.role },
        });

        // Audit logging non-blocking
        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'ProjectMember',
            entityId: memberId,
            oldValues: { role: existingMember.role } as Record<string, unknown>,
            newValues: validation.data as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({ success: true, data: member });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string; memberId: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;
        const { id, memberId } = params;

        // Verify project exists
        const project = await prisma.project.findFirst({
            where: { id, tenantId },
        });

        if (!project) {
            return NextResponse.json({ success: false, error: MSG.PROJECT_NOT_FOUND }, { status: 404 });
        }

        // Find the member
        const existingMember = await prisma.projectMember.findFirst({
            where: { id: memberId, projectId: id, tenantId },
        });

        if (!existingMember) {
            return NextResponse.json({ success: false, error: MSG.PROJECT_MEMBER_NOT_FOUND }, { status: 404 });
        }

        await prisma.projectMember.delete({ where: { id: memberId } });

        // Audit logging non-blocking
        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'ProjectMember',
            entityId: memberId,
            oldValues: existingMember as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({ success: true, data: null });
    } catch (error) {
        return handleApiError(error);
    }
}
