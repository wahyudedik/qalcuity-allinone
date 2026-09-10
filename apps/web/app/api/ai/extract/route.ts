export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { extractDocument, persistExtraction, type DocumentType } from '@/lib/ai/document-extraction';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { sanitizeInput } from '@/lib/sanitize';
import { z } from 'zod';
import { handleApiError } from '@/lib/api-error';

// --- Zod Schema ---

const extractRequestSchema = z.object({
    fileBase64: z.string().min(1, MSG.FILE_CANNOT_BE_EMPTY),
    fileName: z.string().min(1, MSG.FILE_NAME_REQUIRED).max(255),
    documentType: z.enum(['INVOICE', 'PURCHASE_ORDER', 'RECEIPT', 'KTP', 'NPWP'], {
        message: 'Tipe dokumen tidak valid',
    }),
    mimeType: z.enum(['image/png', 'image/jpeg', 'application/pdf'], {
        message: 'Tipe file tidak didukung. Gunakan PNG, JPEG, atau PDF.',
    }),
});

// --- API Route ---

export async function POST(req: Request) {
    try {
        const auth = await requirePermissionForRoute(req);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId, userId } = auth;

        // Rate limiting
        const ip = getClientIp(req);
        const rateLimitResult = checkRateLimit(`api:ai:extract:${tenantId}:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
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
            userId,
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

        // Persist extraction result to history (fire-and-forget)
        const fileSizeBytes = Math.ceil((fileBase64.length * 3) / 4);
        persistExtraction(tenantId, result, sanitizedFileName, mimeType, fileSizeBytes).catch(console.error);

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
