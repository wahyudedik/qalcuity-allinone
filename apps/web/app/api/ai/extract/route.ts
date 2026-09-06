import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extractDocument, type DocumentType } from '@/lib/ai/document-extraction';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { sanitizeInput } from '@/lib/sanitize';
import { z } from 'zod';

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const extractRequestSchema = z.object({
    fileBase64: z.string().min(1, 'File tidak boleh kosong'),
    fileName: z.string().min(1, 'Nama file wajib diisi').max(255),
    documentType: z.enum(['INVOICE', 'PURCHASE_ORDER', 'RECEIPT', 'KTP', 'NPWP'], {
        message: 'Tipe dokumen tidak valid',
    }),
    mimeType: z.enum(['image/png', 'image/jpeg', 'application/pdf'], {
        message: 'Tipe file tidak didukung. Gunakan PNG, JPEG, atau PDF.',
    }),
});

// ─── API Route ───────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    try {
        // Auth check — MEMBER+ required for document extraction
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = session.user.role;
        if (role === 'VIEWER') {
            return NextResponse.json(
                { error: 'Anda tidak memiliki akses untuk ekstraksi dokumen' },
                { status: 403 }
            );
        }

        // Rate limiting
        const ip = getClientIp(req);
        const tenantId = session.user.tenantId;
        const rateLimitResult = checkRateLimit(`api:ai:extract:${tenantId}:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const body = await req.json();

        // Zod validation
        const validation = extractRequestSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid input',
                    details: validation.error.issues.map((i) => ({
                        field: i.path.join('.'),
                        message: i.message,
                    })),
                },
                { status: 400 }
            );
        }

        const { fileBase64, fileName, documentType, mimeType } = validation.data;

        // Sanitize filename
        const sanitizedFileName = sanitizeInput(fileName);

        // Audit logging
        void logAudit({
            userId: session.user.id || 'unknown',
            tenantId,
            action: 'CREATE',
            entity: 'DocumentExtraction',
            newValues: {
                fileName: sanitizedFileName,
                documentType,
                mimeType,
            },
            request: req,
        });

        // Extract document
        const result = await extractDocument({
            fileBase64,
            fileName: sanitizedFileName,
            documentType: documentType as DocumentType,
            mimeType,
        });

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error(
            'Document extraction error:',
            error instanceof Error ? error.message : 'Unknown error'
        );
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Gagal mengekstrak dokumen. Silakan coba lagi.',
            },
            { status: 500 }
        );
    }
}
