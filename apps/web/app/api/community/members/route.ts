export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { MSG, MSG_COMMUNITY } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { encrypt } from '@/lib/encryption';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import {
    COMMUNITY_MEMBER_SELECT,
    serializeCommunityMember,
} from '@/lib/community';
import { createCommunityMemberSchema, formatZodError } from '@/lib/validation-schemas';

/**
 * GET  /api/community/members — list warga (community:manage).
 * POST /api/community/members — tambah warga; NIK/NKK di-enkripsi (write-only).
 *
 * Catatan keamanan:
 * - In-route hasPermission('community:manage') WAJIB — fallback role-hierarchy
 *   di requirePermissionForRoute melewatkan system ADMIN yang tidak punya
 *   permission community (spec §3.2 catatan).
 * - List TIDAK mengembalikan NIK — hanya flag nikStored.
 * - Pencarian hanya via fullName/code/address/phone (TANPA NIK).
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-members:${ip}`, 100, 60_000);
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

        const { tenantId } = auth;
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const status = searchParams.get('status');
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { tenantId, deletedAt: null };
        if (status && status !== 'all') where.status = status.toUpperCase();
        if (search) {
            where.OR = [
                { fullName: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [rows, total] = await Promise.all([
            prisma.communityMember.findMany({
                where,
                select: COMMUNITY_MEMBER_SELECT,
                orderBy: { code: 'asc' },
                skip,
                take: limit,
            }),
            prisma.communityMember.count({ where }),
        ]);

        const data = rows.map(serializeCommunityMember);
        return NextResponse.json({
            success: true,
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-members-create:${ip}`, 30, 60_000);
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
        const parsed = createCommunityMemberSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        const { tenantId, userId } = auth;
        const { nik, nomorKk, ...rest } = parsed.data;

        const existing = await prisma.communityMember.findFirst({
            where: { tenantId, code: parsed.data.code, deletedAt: null },
            select: { id: true },
        });
        if (existing) {
            return NextResponse.json({ error: MSG_COMMUNITY.MEMBER_CODE_EXISTS }, { status: 409 });
        }

        // Enkripsi NIK/NKK — plain text TIDAK PERNAH disimpan.
        let nikEncrypted: string | undefined;
        let nomorKkEncrypted: string | undefined;
        try {
            if (nik) nikEncrypted = encrypt(nik);
            if (nomorKk) nomorKkEncrypted = encrypt(nomorKk);
        } catch {
            return NextResponse.json({ error: MSG_COMMUNITY.NIK_ENCRYPT_FAILED }, { status: 500 });
        }

        const created = await prisma.communityMember.create({
            data: {
                ...rest,
                nikEncrypted,
                nomorKkEncrypted,
                tenantId,
                createdBy: userId,
            },
            select: COMMUNITY_MEMBER_SELECT,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'CommunityMember',
            entityId: created.id,
            // Jangan masukkan NIK plain ke audit trail.
            newValues: { ...toAuditPayload(rest), nikChanged: !!nik, nomorKkChanged: !!nomorKk },
            request,
        });

        return NextResponse.json({ success: true, data: serializeCommunityMember(created) }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
