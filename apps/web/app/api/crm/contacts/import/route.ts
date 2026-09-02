import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeObject } from '@/lib/sanitize';
import { importContactRowSchema, formatZodError } from '@/lib/validation-schemas';
import { parseCsv } from '@/lib/csv-parser';
import { parseExcel } from '@/lib/excel-parser';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BATCH_SIZE = 50;

interface ImportError {
    row: number;
    field?: string;
    message: string;
}

interface ImportResult {
    success: boolean;
    data?: {
        imported: number;
        errors: number;
        totalRows: number;
        errorDetails: ImportError[];
    };
    error?: string;
}

/**
 * POST /api/crm/contacts/import
 * Import contacts dari file CSV atau Excel.
 * 
 * Menerima FormData dengan field 'file'.
 * Return detailed report: success count, error count, error details.
 */
export async function POST(request: Request): Promise<NextResponse<ImportResult>> {
    try {
        // Rate limit
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:contacts:import:${ip}`, 5, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429 }
            );
        }

        // Auth check — VIEWER tidak boleh import
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        const { userId, tenantId } = auth;

        // Parse FormData
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'File wajib diupload' },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, error: 'Ukuran file maksimal 5MB' },
                { status: 400 }
            );
        }

        // Validate file type
        const fileName = file.name.toLowerCase();
        const isCsv = fileName.endsWith('.csv');
        const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

        if (!isCsv && !isExcel) {
            return NextResponse.json(
                { success: false, error: 'Format file tidak didukung. Gunakan .csv, .xlsx, atau .xls' },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Parse file
        let rows: Record<string, string>[];
        let headers: string[];

        if (isCsv) {
            const text = buffer.toString('utf-8');
            const result = parseCsv(text);
            rows = result.rows;
            headers = result.headers;
        } else {
            const result = parseExcel(buffer);
            rows = result.rows;
            headers = result.headers;
        }

        if (rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'File kosong atau tidak memiliki data' },
                { status: 400 }
            );
        }

        // Validate required columns
        const headerLower = headers.map((h) => h.toLowerCase().trim());
        const hasNameColumn = headerLower.some(
            (h) => h === 'name' || h === 'nama'
        );

        if (!hasNameColumn) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Kolom "name" atau "nama" wajib ada di file',
                },
                { status: 400 }
            );
        }

        // Column mapping — normalize header names
        const columnMap: Record<string, string> = {};
        for (const header of headers) {
            const lower = header.toLowerCase().trim();
            if (lower === 'name' || lower === 'nama') columnMap[header] = 'name';
            else if (lower === 'email') columnMap[header] = 'email';
            else if (lower === 'phone' || lower === 'telepon' || lower === 'telp') columnMap[header] = 'phone';
            else if (lower === 'company' || lower === 'perusahaan') columnMap[header] = 'company';
            else if (lower === 'address' || lower === 'alamat') columnMap[header] = 'address';
            else if (lower === 'notes' || lower === 'catatan') columnMap[header] = 'notes';
            else if (lower === 'type' || lower === 'tipe') columnMap[header] = 'type';
        }

        // Map and validate rows
        const validRows: Record<string, string>[] = [];
        const errors: ImportError[] = [];

        for (let i = 0; i < rows.length; i++) {
            const rawRow = rows[i];
            const mappedRow: Record<string, string> = {};

            for (const [originalHeader, mappedField] of Object.entries(columnMap)) {
                const value = rawRow[originalHeader];
                if (value !== undefined && value !== '') {
                    mappedRow[mappedField] = value;
                }
            }

            // Validate with Zod
            const validation = importContactRowSchema.safeParse(mappedRow);
            if (!validation.success) {
                for (const issue of validation.error.issues) {
                    errors.push({
                        row: i + 2, // +2 because row 1 is header, and 0-indexed
                        field: issue.path.join('.'),
                        message: issue.message,
                    });
                }
            } else {
                validRows.push(validation.data as Record<string, string>);
            }
        }

        // Batch insert ke database
        let importedCount = 0;

        if (validRows.length > 0) {
            // Process in batches
            for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
                const batch = validRows.slice(i, i + BATCH_SIZE);

                const createData = batch.map((row) => {
                    const sanitized = sanitizeObject(row);
                    return {
                        tenantId,
                        name: sanitized.name as string,
                        email: (sanitized.email as string) || null,
                        phone: (sanitized.phone as string) || null,
                        company: (sanitized.company as string) || null,
                        address: (sanitized.address as string) || null,
                        notes: (sanitized.notes as string) || null,
                        type: (sanitized.type as string || 'CUSTOMER').toUpperCase(),
                        isActive: true,
                    };
                });

                const result = await prisma.contact.createMany({
                    data: createData,
                    skipDuplicates: false,
                });

                importedCount += result.count;
            }

            // Log audit trail
            void logAudit({
                userId,
                tenantId,
                action: 'CREATE',
                entity: 'Contact',
                newValues: {
                    import: true,
                    fileName: file.name,
                    importedCount,
                    errorCount: errors.length,
                },
                request,
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                imported: importedCount,
                errors: errors.length,
                totalRows: rows.length,
                errorDetails: errors.slice(0, 50), // Limit error details to 50
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
