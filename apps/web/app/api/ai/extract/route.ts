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
import { logger } from '@/lib/logger';

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

/**
 * Single-file extraction result item.
 */
interface BatchResultItem {
    fileName: string;
    status: 'success' | 'error';
    data?: Awaited<ReturnType<typeof extractDocument>>;
    error?: string;
}

// --- API Route ---

/**
 * POST /api/ai/extract
 *
 * Supports two modes:
 * 1. **Single file (JSON body)** — backward compatible with existing client
 *    Body: { fileBase64, fileName, documentType, mimeType }
 *
 * 2. **Batch extraction (FormData)** — multiple files in one request
 *    FormData: files[] + documentType
 *    Returns batch results with per-file status.
 */
export async function POST(req: Request) {
    try {
        const auth = await requirePermissionForRoute(req);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId, userId } = auth;

        // Rate limiting — higher limit for batch (20 per minute)
        const ip = getClientIp(req);
        const rateLimitResult = checkRateLimit(`api:ai:extract:${tenantId}:${ip}`, 20, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const contentType = req.headers.get('content-type') || '';

        // ─── Batch mode (FormData) ───────────────────────────────────────
        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const files = formData.getAll('files') as File[];
            const documentType = (formData.get('documentType') as string) || 'INVOICE';

            // Validate document type
            const validDocTypes = ['INVOICE', 'PURCHASE_ORDER', 'RECEIPT', 'KTP', 'NPWP'] as const;
            if (!validDocTypes.includes(documentType as typeof validDocTypes[number])) {
                return NextResponse.json(
                    { success: false, error: 'Tipe dokumen tidak valid' },
                    { status: 400 }
                );
            }

            if (!files || files.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'Tidak ada file yang diunggah' },
                    { status: 400 }
                );
            }

            // Limit batch size to 20 files
            if (files.length > 20) {
                return NextResponse.json(
                    { success: false, error: 'Maksimal 20 file per batch' },
                    { status: 400 }
                );
            }

            // Audit logging for batch
            void logAudit({
                userId,
                tenantId,
                action: 'CREATE',
                entity: 'DocumentExtraction',
                newValues: {
                    mode: 'batch',
                    fileCount: files.length,
                    documentType,
                },
                request: req,
            });

            const results: BatchResultItem[] = [];
            let successCount = 0;
            let failedCount = 0;

            // Process files sequentially to avoid rate limiting on AI provider
            for (const file of files) {
                const sanitizedFileName = sanitizeInput(file.name);

                try {
                    // Validate file type
                    const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
                    if (!allowedTypes.includes(file.type)) {
                        results.push({
                            fileName: sanitizedFileName,
                            status: 'error',
                            error: 'Tipe file tidak didukung. Gunakan PNG, JPEG, atau PDF.',
                        });
                        failedCount++;
                        continue;
                    }

                    // Validate file size (10MB)
                    if (file.size > 10 * 1024 * 1024) {
                        results.push({
                            fileName: sanitizedFileName,
                            status: 'error',
                            error: 'File terlalu besar. Maksimal 10MB.',
                        });
                        failedCount++;
                        continue;
                    }

                    // Convert file to base64
                    const arrayBuffer = await file.arrayBuffer();
                    const base64 = Buffer.from(arrayBuffer).toString('base64');

                    // Extract document
                    const result = await extractDocument({
                        fileBase64: base64,
                        fileName: sanitizedFileName,
                        documentType: documentType as DocumentType,
                        mimeType: file.type,
                    });

                    // Persist extraction result (fire-and-forget)
                    persistExtraction(tenantId, result, sanitizedFileName, file.type, file.size).catch(
                        (err) => logger.error('[AI] Extraction persist failed', err)
                    );

                    results.push({
                        fileName: sanitizedFileName,
                        status: 'success',
                        data: result,
                    });
                    successCount++;
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : 'Gagal mengekstrak dokumen';
                    results.push({
                        fileName: sanitizedFileName,
                        status: 'error',
                        error: errorMsg,
                    });
                    failedCount++;
                    logger.error(`[AI] Batch extraction failed for file: ${sanitizedFileName}`, err);
                }
            }

            return NextResponse.json({
                success: true,
                results,
                summary: {
                    total: files.length,
                    success: successCount,
                    failed: failedCount,
                },
            });
        }

        // ─── Single file mode (JSON body) — backward compatible ──────────
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
        persistExtraction(tenantId, result, sanitizedFileName, mimeType, fileSizeBytes).catch((err) => logger.error('[AI] Extraction persist failed', err));

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
