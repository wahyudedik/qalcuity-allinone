export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { MSG, MSG_COMMUNITY, MSG_COMMUNITY_ASSETS, MSG_COMMUNITY_LOANS } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { logAudit, toAuditPayload } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { createCommunityLoanSchema, formatZodError } from '@/lib/validation-schemas';
import {
    LOAN_LIST_SELECT,
    LoanRequestError,
    serializeCommunityAssetLoan,
    startOfTodayAppTz,
} from '@/lib/community';

/**
 * GET /api/community/loans — daftar peminjaman aset (community:view).
 *
 * Filter: `?status=active|returned|overdue` (overdue = derived: returnedAt null +
 * dueDate < today APP_TZ), `?assetId=`, `?memberId=`, `?search=` (OR: member
 * fullName / asset name / assetCode ILIKE), `?page=`, `?limit=` (plans §3.1).
 * `where` selalu `tenantId` (model tanpa soft-delete). Tiap baris memuat
 * `isOverdue` (boolean derived via `serializeCommunityAssetLoan`).
 */
export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-loans:${ip}`, 100, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission(session, 'community:view'))) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }

        const { tenantId } = auth;
        const url = new URL(request.url);
        const statusParam = url.searchParams.get('status')?.toLowerCase();
        const assetId = url.searchParams.get('assetId');
        const memberId = url.searchParams.get('memberId');
        const search = url.searchParams.get('search')?.trim();
        const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10) || 20));

        const where: Record<string, unknown> = { tenantId };
        if (statusParam === 'active') where.status = 'ACTIVE';
        else if (statusParam === 'returned') where.status = 'RETURNED';
        else if (statusParam === 'overdue') {
            where.returnedAt = null;
            where.dueDate = { lt: startOfTodayAppTz() };
        }
        if (assetId) where.assetId = assetId;
        if (memberId) where.memberId = memberId;
        if (search) {
            where.OR = [
                { member: { fullName: { contains: search, mode: 'insensitive' } } },
                { asset: { name: { contains: search, mode: 'insensitive' } } },
                { asset: { assetCode: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const [rows, total] = await Promise.all([
            prisma.communityAssetLoan.findMany({
                where,
                select: LOAN_LIST_SELECT,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.communityAssetLoan.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: rows.map((row) => serializeCommunityAssetLoan(row)),
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * POST /api/community/loans — buat peminjaman (community:manage).
 *
 * Alur transaction (plans §3.2 / §3.6): row-lock aset `FOR UPDATE` → load aset
 * (`deletedAt: null`) → eligibility (status AKTIF & kondisi ≠ RUSAK_BERAT) →
 * active-loan check (satu pinjaman aktif per aset) → create dengan
 * `conditionAtLoan = asset.condition` (server-side snapshot).
 * `memberId` divalidasi milik tenant & belum dihapus → 404 MEMBER_NOT_FOUND.
 */
export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-loans-create:${ip}`, 30, 60_000);
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

        const { tenantId, userId } = auth;

        const body = sanitizeObject(await request.json().catch(() => ({})));
        const parsed = createCommunityLoanSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }

        const { assetId, memberId, loanDate, dueDate, notes } = parsed.data;

        // Validasi borrower = member milik tenant, belum di-soft-delete (pola custodian 4A).
        const member = await prisma.communityMember.findFirst({
            where: { id: memberId, tenantId, deletedAt: null },
            select: { id: true },
        });
        if (!member) {
            return NextResponse.json({ error: MSG_COMMUNITY.MEMBER_NOT_FOUND }, { status: 404 });
        }

        const result = await prisma.$transaction(async (tx) => {
            // Row-lock baris aset — serialize dua create-loan bersamaan untuk aset
            // yang sama; yang kedua melihat loan aktif milik yang pertama → 409.
            await tx.$queryRaw`
                SELECT "id" FROM "CommunityAsset"
                WHERE "id" = ${assetId} AND "tenantId" = ${tenantId}
                FOR UPDATE
            `;

            const asset = await tx.communityAsset.findFirst({
                where: { id: assetId, tenantId, deletedAt: null },
                select: { id: true, condition: true, status: true },
            });
            if (!asset) {
                throw new LoanRequestError(404, MSG_COMMUNITY_ASSETS.ASSET_NOT_FOUND);
            }
            if (asset.status !== 'AKTIF' || asset.condition === 'RUSAK_BERAT') {
                throw new LoanRequestError(409, MSG_COMMUNITY_LOANS.ASSET_NOT_AVAILABLE);
            }

            const activeLoan = await tx.communityAssetLoan.findFirst({
                where: { tenantId, assetId, returnedAt: null },
                select: { id: true },
            });
            if (activeLoan) {
                throw new LoanRequestError(409, MSG_COMMUNITY_LOANS.ASSET_ALREADY_ON_LOAN);
            }

            return tx.communityAssetLoan.create({
                data: {
                    tenantId,
                    assetId,
                    memberId,
                    loanDate,
                    dueDate,
                    notes: notes ?? null,
                    conditionAtLoan: asset.condition,
                    createdBy: userId,
                },
                select: LOAN_LIST_SELECT,
            });
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'CommunityAssetLoan',
            entityId: result.id,
            newValues: toAuditPayload(parsed.data),
            request,
        });

        return NextResponse.json(
            {
                success: true,
                message: MSG_COMMUNITY_LOANS.LOAN_CREATED,
                data: serializeCommunityAssetLoan(result),
            },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof LoanRequestError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        return handleApiError(error);
    }
}
