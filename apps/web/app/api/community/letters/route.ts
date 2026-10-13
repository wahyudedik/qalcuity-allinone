export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { MSG, MSG_COMMUNITY } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { createCommunityLetterSchema, formatZodError } from '@/lib/validation-schemas';
import {
    LETTER_LIST_SELECT,
    LETTER_STATUSES,
    LETTER_TYPE_VALUES,
    serializeLetter,
} from '@/lib/community-letter';

/**
 * GET  /api/community/letters — daftar surat (community:manage).
 * POST /api/community/letters — buat DRAFT baru (community:manage).
 *
 * Filter list: ?status=&letterType=&memberId=&q= (q = nomor/purpose — spec §5.1#1).
 *
 * Aturan HARD (spec §3.4/§3.6/§3.8):
 * - DRAFT dibuat TANPA nomor/verifyToken/bodySnapshot/issuedAt (di-assign saat ISSUE).
 * - Response selalu melewati serializeLetter() — bodySnapshot & NIK plain TIDAK
 *   PERNAH ikut ke response JSON (minimisasi PII; NIK hanya hidup untuk render PDF).
 * - In-route hasPermission('community:manage') WAJIB — RBAC_STRICT aktif sehingga
 *   fallback role-hierarchy tidak berlaku; system ADMIN tanpa grant community = 403.
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-letters:${ip}`, 100, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission(session, 'community:manage'))) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const letterType = searchParams.get('letterType');
        const memberId = searchParams.get('memberId');
        const q = searchParams.get('q')?.trim() || '';
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));

        const where: Record<string, unknown> = { tenantId: auth.tenantId, deletedAt: null };
        if (status && (LETTER_STATUSES as readonly string[]).includes(status)) where.status = status;
        if (letterType && (LETTER_TYPE_VALUES as readonly string[]).includes(letterType)) {
            where.letterType = letterType;
        }
        if (memberId) where.memberId = memberId;
        if (q) {
            where.OR = [
                { letterNumber: { contains: q, mode: 'insensitive' } },
                { purpose: { contains: q, mode: 'insensitive' } },
            ];
        }

        const [rows, total] = await Promise.all([
            prisma.communityLetter.findMany({
                where,
                select: LETTER_LIST_SELECT,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.communityLetter.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: rows.map((row) => serializeLetter(row)),
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-letters-create:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission(session, 'community:manage'))) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const body = sanitizeObject(await request.json().catch(() => ({})));
        const parsed = createCommunityLetterSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        const { tenantId, userId } = auth;

        // Refine createCommunityLetterSchema menjamin ketiga field ini terisi.
        const data = {
            letterType: parsed.data.letterType!,
            memberId: parsed.data.memberId!,
            purpose: parsed.data.purpose!,
            destination: parsed.data.destination ?? null,
            notes: parsed.data.notes ?? null,
        };

        const member = await prisma.communityMember.findFirst({
            where: { id: data.memberId, tenantId, deletedAt: null },
            select: { id: true },
        });
        if (!member) {
            return NextResponse.json({ error: MSG_COMMUNITY.MEMBER_NOT_FOUND }, { status: 404 });
        }

        const created = await prisma.communityLetter.create({
            data: {
                tenantId,
                letterType: data.letterType,
                memberId: data.memberId,
                purpose: data.purpose,
                destination: data.destination,
                notes: data.notes,
                status: 'DRAFT',
                // Invarian DRAFT (§3.4/§3.6) — di-assign saat ISSUE, bukan saat create.
                letterNumber: null,
                verifyToken: null,
                bodySnapshot: Prisma.DbNull,
                issuedAt: null,
                createdBy: userId,
            },
            select: LETTER_LIST_SELECT,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'CommunityLetter',
            entityId: created.id,
            newValues: toAuditPayload(data),
            request,
        });

        return NextResponse.json({ success: true, data: serializeLetter(created) }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
