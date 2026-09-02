import { NextResponse } from 'next/server';
import { requirePermissionForRoute } from '@/lib/session';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { logAudit } from '@/lib/audit';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
];

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId } = auth;

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'File tidak ditemukan' },
                { status: 400 }
            );
        }

        // Validasi ukuran file
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, error: 'Ukuran file maksimal 5MB' },
                { status: 400 }
            );
        }

        // Validasi tipe file
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: 'Tipe file tidak didukung. Gunakan JPG, PNG, WebP, atau PDF' },
                { status: 400 }
            );
        }

        // Buat direktori jika belum ada
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'billing');
        await mkdir(uploadDir, { recursive: true });

        // Generate filename unik
        const timestamp = Date.now();
        const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${timestamp}-${originalName}`;
        const filePath = join(uploadDir, fileName);

        // Simpan file
        const bytes = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(bytes));

        const fileUrl = `/uploads/billing/${fileName}`;

        // Non-blocking audit log
        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'FileUpload',
            entityId: fileName,
            newValues: { fileName: file.name, fileSize: file.size, fileType: file.type } as Record<string, unknown>,
            request,
        });

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
        console.error('Error uploading file:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { success: false, error: 'Gagal mengupload file' },
            { status: 500 }
        );
    }
}
