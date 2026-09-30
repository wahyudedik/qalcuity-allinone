export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join, resolve, sep, extname } from 'path';
import { getUploadBaseDir } from '@/lib/upload-dir';
import { MSG } from '@/lib/api-messages';

/**
 * Serving route untuk file upload di persistent base dir (UPLOAD_DIR).
 *
 * File LAMA di `apps/web/public/uploads/` tetap ter-serve statis oleh Next.js
 * SEBELUM route handler ini (public/ dicek lebih dulu) → tidak ada regresi.
 * Route handler ini hanya menangani file di base dir persistent.
 *
 * Security posture: file ter-serve TANPA auth — sama seperti perilaku
 * `public/` statis sebelumnya (bukan regresi; hardening auth di luar scope).
 */

const CONTENT_TYPE_MAP: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
};

interface UploadPathParams {
    path: string[];
}

export async function GET(
    _request: Request,
    { params }: { params: UploadPathParams }
) {
    const baseDir = resolve(getUploadBaseDir());

    // Validasi segmen path — tolak kosong / null byte
    const segments = params.path ?? [];
    if (segments.length === 0 || segments.some((segment) => !segment || segment.includes('\0'))) {
        return NextResponse.json(
            { success: false, error: { code: 'NOT_FOUND', message: MSG.FILE_NOT_FOUND } },
            { status: 404 }
        );
    }

    // Resolve path penuh, lalu WAJIB berada di dalam baseDir (anti path traversal)
    const filePath = resolve(join(baseDir, ...segments));
    if (filePath !== baseDir && !filePath.startsWith(baseDir + sep)) {
        return NextResponse.json(
            { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
            { status: 403 }
        );
    }

    try {
        const fileStat = await stat(filePath);
        if (!fileStat.isFile()) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: MSG.FILE_NOT_FOUND } },
                { status: 404 }
            );
        }

        const buffer = await readFile(filePath);
        const extension = extname(filePath).toLowerCase();
        const contentType = CONTENT_TYPE_MAP[extension] ?? 'application/octet-stream';

        // Nama file mengandung timestamp = unik per upload → immutable aman
        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': String(buffer.byteLength),
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch {
        return NextResponse.json(
            { success: false, error: { code: 'NOT_FOUND', message: MSG.FILE_NOT_FOUND } },
            { status: 404 }
        );
    }
}
