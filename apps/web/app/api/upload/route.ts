export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { handleApiError } from '@/lib/api-error';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { requirePermissionForRoute } from '@/lib/session';
import { MSG } from '@/lib/api-messages';
import { logger } from '@/lib/logger';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
];

export async function POST(request: Request) {
    try {
        // 1. Auth + RBAC check â€” minimal MEMBER ke atas
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json(
                { success: false, error: auth.error },
                { status: auth.status }
            );
        }
        const { userId, tenantId } = auth;

        // 2. Rate limiting
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:upload:${tenantId}:${ip}`, 20, 60000); // 20 per minute
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.UPLOAD_RATE_LIMIT },
                { status: 429 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: MSG.UPLOAD_FILE_REQUIRED },
                { status: 400 }
            );
        }

        // 2. Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, error: MSG.FILE_TOO_LARGE },
                { status: 400 }
            );
        }

        // 3. Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: MSG.UPLOAD_FILE_TYPE_NOT_SUPPORTED },
                { status: 400 }
            );
        }

        // 4. Determine upload directory â€” tenant-isolated path
        const baseUploadDir = process.env.UPLOAD_DIR
            ? join(process.cwd(), process.env.UPLOAD_DIR)
            : join(process.cwd(), 'public', 'uploads');
        const uploadDir = join(baseUploadDir, tenantId);
        await mkdir(uploadDir, { recursive: true });

        // 5. Generate unique filename
        const timestamp = Date.now();
        const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${timestamp}-${originalName}`;
        const filePath = join(uploadDir, fileName);

        // 6. Save file
        const bytes = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(bytes));

        // 7. Return file URL (tenant-isolated path)
        const fileUrl = `/uploads/${tenantId}/${fileName}`;

        return NextResponse.json({
            success: true,
            data: {
                url: fileUrl,
                fileName: file.name,
                size: file.size,
                type: file.type,
            },
            message: MSG.UPLOAD_SUCCESS,
        });
    } catch (error) {
        logger.error('Upload error:', error instanceof Error ? error.message : 'Unknown error');
        return handleApiError(error);
    }
}
