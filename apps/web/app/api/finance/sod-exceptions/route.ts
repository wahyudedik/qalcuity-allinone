export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { requestSoDException, getSoDExceptions } from '@/lib/sod-exception';
import { requestSoDExceptionSchema, formatZodError } from '@/lib/validation-schemas';
import { sanitizeObject } from '@/lib/sanitize';

// ─── GET: List SoD exceptions for tenant ────────────────────────────────────

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:sod-exceptions:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') ?? undefined;
        const userId = searchParams.get('userId') ?? undefined;
        const ruleId = searchParams.get('ruleId') ?? undefined;

        const exceptions = await getSoDExceptions({
            tenantId,
            status,
            userId,
            ruleId,
        });

        // Batch-resolve display names (tenant-scoped, no N+1) — Session 70n
        const ruleIds = [...new Set(exceptions.map((e) => e.ruleId))];
        const userIds = [
            ...new Set(
                exceptions.flatMap((e) =>
                    e.approverId ? [e.userId, e.approverId] : [e.userId]
                )
            ),
        ];

        const [rules, users] = await Promise.all([
            ruleIds.length > 0
                ? prisma.soDRule.findMany({
                    where: { id: { in: ruleIds }, tenantId },
                    select: { id: true, name: true },
                })
                : Promise.resolve([]),
            userIds.length > 0
                ? prisma.user.findMany({
                    where: { id: { in: userIds }, tenantId },
                    select: { id: true, name: true, email: true },
                })
                : Promise.resolve([]),
        ]);

        const ruleNameById = new Map(rules.map((r) => [r.id, r.name]));
        const userById = new Map(users.map((u) => [u.id, u]));

        const data = exceptions.map((e) => ({
            id: e.id,
            ruleId: e.ruleId,
            ruleName: ruleNameById.get(e.ruleId) ?? null,
            userId: e.userId,
            userName: userById.get(e.userId)?.name ?? null,
            userEmail: userById.get(e.userId)?.email ?? null,
            reason: e.reason,
            approverId: e.approverId,
            approverName: e.approverId ? (userById.get(e.approverId)?.name ?? null) : null,
            status: e.status,
            decision: e.decision,
            expiresAt: e.expiresAt.toISOString(),
            decidedAt: e.decidedAt?.toISOString() ?? null,
            createdAt: e.createdAt.toISOString(),
            updatedAt: e.updatedAt.toISOString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── POST: Request a SoD exception ──────────────────────────────────────────

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:sod-exceptions:POST:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId, role } = auth;

        const body = await request.json();
        const sanitizedBody = sanitizeObject(body);
        const validation = requestSoDExceptionSchema.safeParse(sanitizedBody);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, ...formatZodError(validation.error) },
                { status: 400 }
            );
        }

        const { ruleId, reason, durationDays, userId: requestedUserId } = validation.data;

        // Admin on-behalf (Session 70n): ADMIN/SUPERADMIN may request an
        // exception for another tenant user. Non-admin callers always create
        // the exception for themselves (requestedUserId ignored).
        const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';
        const targetUserId = isAdmin && requestedUserId ? requestedUserId : userId;

        if (targetUserId !== userId) {
            const targetUser = await prisma.user.findFirst({
                where: { id: targetUserId, tenantId },
                select: { id: true },
            });
            if (!targetUser) {
                return NextResponse.json(
                    { success: false, error: MSG.DATA_NOT_FOUND },
                    { status: 404 }
                );
            }
        }

        const exception = await requestSoDException({
            tenantId,
            ruleId,
            userId: targetUserId,
            reason,
            durationDays,
            request,
        });

        return NextResponse.json({ success: true, data: exception }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
