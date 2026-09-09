import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { rejectRequestSchema, formatZodError } from '@/lib/validation-schemas';
import { rejectRequest } from '@/lib/approval';
import { notifyRequester } from '@/lib/approval-notifications';
import { handleApiError } from '@/lib/api-error';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:approval:reject:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'MSG.TOO_MANY_REQUESTS' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, role } = auth;

        const body = await request.json();
        const validation = rejectRequestSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const result = await rejectRequest({
            requestId: params.id,
            userId,
            userRole: role,
            comments: validation.data.comments,
            request,
        });

        // Send rejection notification to requester (fire-and-forget)
        void notifyRequester(params.id, 'REJECTED', validation.data.comments);

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        return handleApiError(error);
    }
}
