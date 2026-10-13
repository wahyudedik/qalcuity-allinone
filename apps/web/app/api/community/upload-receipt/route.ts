export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { getServerSession } from 'next-auth';
import { MSG, MSG_COMMUNITY } from '@/lib/api-messages';
import { authOptions } from '@/lib/auth';
import { requirePermissionForRoute } from '@/lib/session';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { handleApiError } from '@/lib/api-error';
import { getUploadSubDir } from '@/lib/upload-dir';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB — spesifikasi community MVP
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

/**
 * POST /api/community/upload-receipt — upload bukti bayar iuran (community:finance).
 *
 * Validasi: ≤2MB, jpg/png/pdf saja. Disimpan di uploads/community/<tenantId>/.
 * Response berisi URL relative yang bisa langsung dipakai field receiptUrl
 * pada pay bill atau attachmentUrl pada cash transaction.
 */
export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`community-upload-receipt:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const session = await getServerSession(authOptions);
        if (!session || !(await hasPermission(session, 'community:finance'))) {
            return NextResponse.json({ error: MSG_COMMUNITY.PERMISSION_DENIED }, { status: 403 });
        }
        const { userId, tenantId } = auth;

        const formData = await request.formData().catch(() => null);
        if (!formData) {
            return NextResponse.json({ success: false, error: MSG.FILE_UPLOAD_REQUIRED }, { status: 400 });
        }
        const file = formData.get('file') as File | null;
        if (!file || typeof file === 'string') {
            return NextResponse.json({ success: false, error: MSG.FILE_UPLOAD_REQUIRED }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, error: 'File too large — maximum 2MB', code: 'FILE_TOO_LARGE' },
                { status: 400 }
            );
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: 'Unsupported file type — allowed: jpg, png, pdf', code: 'UNSUPPORTED_FILE_TYPE' },
                { status: 400 }
            );
        }

        // uploads/community/<tenantId>/ — tenantId cuid aman (tanpa path separator)
        const uploadDir = join(getUploadSubDir('community'), tenantId);
        await mkdir(uploadDir, { recursive: true });

        const timestamp = Date.now();
        const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${timestamp}-${originalName}`;
        await writeFile(join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));

        const fileUrl = `/uploads/community/${tenantId}/${fileName}`;

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'CommunityReceiptUpload',
            entityId: fileName,
            newValues: { fileName: file.name, fileSize: file.size, fileType: file.type },
            request,
        });

        return NextResponse.json({
            success: true,
            data: { url: fileUrl, fileName: file.name, size: file.size, type: file.type },
            message: MSG.FILE_UPLOAD_SUCCESS,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
