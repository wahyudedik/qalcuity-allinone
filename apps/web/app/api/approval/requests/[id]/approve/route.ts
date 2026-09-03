import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { approveRequestSchema, formatZodError } from '@/lib/validation-schemas';
import { approveRequest } from '@/lib/approval';
import { notifyRequester, notifyNextLevelApprover } from '@/lib/approval-notifications';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:approval:approve:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, role } = auth;

        const body = await request.json();
        const validation = approveRequestSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const result = await approveRequest({
            requestId: params.id,
            userId,
            userRole: role,
            comments: validation.data.comments,
            request,
        });

        // Send notifications asynchronously (fire-and-forget)
        // Check if request is now fully approved or advanced to next level
        const updatedRequest = await prisma.approvalRequest.findUnique({
            where: { id: params.id },
        });

        if (updatedRequest) {
            if (updatedRequest.status === 'APPROVED') {
                // Final approval — notify requester
                void notifyRequester(params.id, 'APPROVED', validation.data.comments);
            } else if (updatedRequest.status === 'PENDING') {
                // Advanced to next level — notify requester + next level approvers
                void notifyRequester(params.id, 'NEW_LEVEL', validation.data.comments);
                void notifyNextLevelApprover(params.id);
            }
        }

        return NextResponse.json({ success: true, data: result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
