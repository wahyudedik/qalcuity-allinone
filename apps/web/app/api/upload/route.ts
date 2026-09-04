import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { handleApiError } from '@/lib/api-error';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

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
        // 1. Auth check
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // 2. Rate limiting
        const ip = getClientIp(request);
        const tenantId = session.user.tenantId;
        const rateLimitResult = checkRateLimit(`api:upload:${tenantId}:${ip}`, 20, 60000); // 20 per minute
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak upload. Coba lagi nanti.' },
                { status: 429 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'File tidak ditemukan' },
                { status: 400 }
            );
        }

        // 2. Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, error: `Ukuran file maksimal ${MAX_FILE_SIZE / 1024 / 1024}MB` },
                { status: 400 }
            );
        }

        // 3. Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: 'Tipe file tidak didukung' },
                { status: 400 }
            );
        }

        // 4. Determine upload directory
        const uploadDir = process.env.UPLOAD_DIR
            ? join(process.cwd(), process.env.UPLOAD_DIR)
            : join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });

        // 5. Generate unique filename
        const timestamp = Date.now();
        const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${timestamp}-${originalName}`;
        const filePath = join(uploadDir, fileName);

        // 6. Save file
        const bytes = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(bytes));

        // 7. Return file URL
        const fileUrl = `/uploads/${fileName}`;

        return NextResponse.json({
            success: true,
            data: {
                url: fileUrl,
                fileName: file.name,
                size: file.size,
                type: file.type,
            },
            message: 'File berhasil diupload',
        });
    } catch (error) {
        console.error('Upload error:', error instanceof Error ? error.message : 'Unknown error');
        return handleApiError(error);
    }
}
