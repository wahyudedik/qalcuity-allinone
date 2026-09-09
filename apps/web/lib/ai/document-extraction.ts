// ─── Document Extraction Engine ─────────────────────────────────────────────
// Ekstraksi data otomatis dari dokumen (Invoice, PO, Receipt, KTP, NPWP)
// Menggunakan AI vision API dengan fallback ke regex-based extraction.

import { getAIProvider, type AIChatMessage } from './provider';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DocumentType = 'INVOICE' | 'PURCHASE_ORDER' | 'RECEIPT' | 'KTP' | 'NPWP';

export interface ExtractedField {
    key: string;
    label: string;
    value: string;
    confidence: number; // 0-1
}

export interface ExtractionResult {
    documentType: DocumentType;
    fields: ExtractedField[];
    rawText?: string;
    confidence: number; // overall confidence
    extractedAt: string;
    method: 'ai' | 'regex' | 'fallback';
}

export interface ExtractionRequest {
    fileBase64: string;
    fileName: string;
    documentType: DocumentType;
    mimeType: string;
}

// ─── Document Type Definitions ───────────────────────────────────────────────

const DOCUMENT_FIELDS: Record<DocumentType, { key: string; label: string }[]> = {
    INVOICE: [
        { key: 'invoiceNumber', label: 'Nomor Invoice' },
        { key: 'invoiceDate', label: 'Tanggal Invoice' },
        { key: 'dueDate', label: 'Tanggal Jatuh Tempo' },
        { key: 'vendorName', label: 'Nama Vendor/Penjual' },
        { key: 'vendorAddress', label: 'Alamat Vendor' },
        { key: 'vendorPhone', label: 'Telepon Vendor' },
        { key: 'customerName', label: 'Nama Customer/Pembeli' },
        { key: 'customerAddress', label: 'Alamat Customer' },
        { key: 'items', label: 'Item/Deskripsi' },
        { key: 'subtotal', label: 'Subtotal' },
        { key: 'taxAmount', label: 'Pajak' },
        { key: 'totalAmount', label: 'Total' },
        { key: 'paymentTerms', label: 'Syarat Pembayaran' },
    ],
    PURCHASE_ORDER: [
        { key: 'poNumber', label: 'Nomor PO' },
        { key: 'poDate', label: 'Tanggal PO' },
        { key: 'vendorName', label: 'Nama Supplier' },
        { key: 'vendorAddress', label: 'Alamat Supplier' },
        { key: 'customerName', label: 'Nama Pemesan' },
        { key: 'customerAddress', label: 'Alamat Pemesan' },
        { key: 'items', label: 'Item/Deskripsi' },
        { key: 'subtotal', label: 'Subtotal' },
        { key: 'taxAmount', label: 'Pajak' },
        { key: 'totalAmount', label: 'Total' },
        { key: 'deliveryDate', label: 'Tanggal Pengiriman' },
        { key: 'paymentTerms', label: 'Syarat Pembayaran' },
    ],
    RECEIPT: [
        { key: 'receiptNumber', label: 'Nomor Receipt' },
        { key: 'receiptDate', label: 'Tanggal' },
        { key: 'vendorName', label: 'Nama Toko/Penjual' },
        { key: 'items', label: 'Item/Deskripsi' },
        { key: 'subtotal', label: 'Subtotal' },
        { key: 'taxAmount', label: 'Pajak' },
        { key: 'totalAmount', label: 'Total' },
        { key: 'paymentMethod', label: 'Metode Pembayaran' },
    ],
    KTP: [
        { key: 'nik', label: 'NIK' },
        { key: 'fullName', label: 'Nama Lengkap' },
        { key: 'birthDate', label: 'Tanggal Lahir' },
        { key: 'birthPlace', label: 'Tempat Lahir' },
        { key: 'gender', label: 'Jenis Kelamin' },
        { key: 'address', label: 'Alamat' },
        { key: 'rtRw', label: 'RT/RW' },
        { key: 'kelurahan', label: 'Kelurahan/Desa' },
        { key: 'kecamatan', label: 'Kecamatan' },
        { key: 'kotaKab', label: 'Kabupaten/Kota' },
        { key: 'provinsi', label: 'Provinsi' },
        { key: 'religion', label: 'Agama' },
        { key: 'maritalStatus', label: 'Status Kawin' },
        { key: 'occupation', label: 'Pekerjaan' },
        { key: 'nationality', label: 'Kewarganegaraan' },
    ],
    NPWP: [
        { key: 'npwpNumber', label: 'Nomor NPWP' },
        { key: 'fullName', label: 'Nama' },
        { key: 'address', label: 'Alamat' },
        { key: 'taxOffice', label: 'Kantor Pajak' },
        { key: 'npjptkp', label: 'NPWP Terdaftar' },
    ],
};

// ─── System Prompts per Document Type ────────────────────────────────────────

const EXTRACTION_PROMPTS: Record<DocumentType, string> = {
    INVOICE: `Anda adalah AI yang ahli dalam mengekstrak data dari dokumen Invoice/Faktur.
Ekstrak semua field yang diminta dari gambar invoice ini.
Untuk field items, gabungkan semua item dalam format: "Item1 (qty x harga), Item2 (qty x harga)"
Untuk monetary values, gunakan angka saja (tanpa simbol mata uang).
Jika field tidak ditemukan, berikan string kosong "".
Return dalam format JSON yang tepat.`,
    PURCHASE_ORDER: `Anda adalah AI yang ahli dalam mengekstrak data dari dokumen Purchase Order (PO).
Ekstrak semua field yang diminta dari gambar PO ini.
Untuk field items, gabungkan semua item dalam format: "Item1 (qty x harga), Item2 (qty x harga)"
Untuk monetary values, gunakan angka saja (tanpa simbol mata uang).
Jika field tidak ditemukan, berikan string kosong "".
Return dalam format JSON yang tepat.`,
    RECEIPT: `Anda adalah AI yang ahli dalam mengekstrak data dari dokumen Receipt/Struk.
Ekstrak semua field yang diminta dari gambar receipt ini.
Untuk field items, gabungkan semua item dalam format: "Item1 (qty x harga), Item2 (qty x harga)"
Untuk monetary values, gunakan angka saja (tanpa simbol mata uang).
Jika field tidak ditemukan, berikan string kosong "".
Return dalam format JSON yang tepat.`,
    KTP: `Anda adalah AI yang ahli dalam mengekstrak data dari Kartu Tanda Penduduk (KTP) Indonesia.
Ekstrak semua field yang diminta dari gambar KTP ini.
Untuk NIK, pastikan 16 digit angka.
Untuk tanggal, gunakan format DD/MM/YYYY.
Jika field tidak ditemukan, berikan string kosong "".
Return dalam format JSON yang tepat.`,
    NPWP: `Anda adalah AI yang ahli dalam mengekstrak data dari Nomor Pokok Wajib Pajak (NPWP).
Ekstrak semua field yang diminta dari gambar NPWP ini.
Untuk nomor NPWP, pastikan format XX.XXX.XXX.X-XXX.XXX.
Jika field tidak ditemukan, berikan string kosong "".
Return dalam format JSON yang tepat.`,
};

// ─── AI Vision Extraction ────────────────────────────────────────────────────

async function extractWithAI(request: ExtractionRequest): Promise<ExtractionResult> {
    const provider = getAIProvider();
    const fields = DOCUMENT_FIELDS[request.documentType];
    const fieldList = fields.map((f) => `- ${f.key}: ${f.label}`).join('\n');

    const systemPrompt = EXTRACTION_PROMPTS[request.documentType];

    const userMessage = `Ekstrak data dari dokumen ini. Return HANYA JSON object dengan key-value pairs.

Field yang perlu diekstrak:
${fieldList}

Contoh format output:
{
${fields.map((f) => `  "${f.key}": "value"`).join(',\n')}
}

Pastikan semua key ada di output, meskipun value kosong.`;

    const messages: AIChatMessage[] = [
        { role: 'system', content: systemPrompt },
        {
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: userMessage,
                } as unknown as string,
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:${request.mimeType};base64,${request.fileBase64}`,
                        detail: 'high',
                    },
                } as unknown as string,
            ].map((c) => (typeof c === 'string' ? c : JSON.stringify(c))).join(' '),
        },
    ];

    // Build proper multimodal messages
    const multimodalMessages = [
        { role: 'system' as const, content: systemPrompt },
        {
            role: 'user' as const,
            content: [
                { type: 'text' as const, text: userMessage },
                {
                    type: 'image_url' as const,
                    image_url: {
                        url: `data:${request.mimeType};base64,${request.fileBase64}`,
                        detail: 'high' as const,
                    },
                },
            ],
        },
    ];

    try {
        // Use the OpenAI client directly for vision (multimodal)
        const OpenAI = (await import('openai')).default;
        const baseURL = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
        const apiKey = process.env.AI_API_KEY || 'sk-placeholder';
        const model = process.env.AI_VISION_MODEL || process.env.AI_MODEL || 'gpt-4o';

        const client = new OpenAI({ apiKey, baseURL });
        const response = await client.chat.completions.create({
            model,
            messages: multimodalMessages as never,
            temperature: 0.1,
            max_tokens: 2000,
        });

        const content = response.choices[0]?.message?.content || '';

        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in AI response');
        }

        const extracted = JSON.parse(jsonMatch[0]) as Record<string, string>;

        // Map to ExtractedField array
        const extractedFields: ExtractedField[] = fields.map((field) => ({
            key: field.key,
            label: field.label,
            value: extracted[field.key] || '',
            confidence: extracted[field.key] ? 0.85 : 0,
        }));

        const overallConfidence =
            extractedFields.reduce((sum, f) => sum + f.confidence, 0) / extractedFields.length;

        return {
            documentType: request.documentType,
            fields: extractedFields,
            confidence: overallConfidence,
            extractedAt: new Date().toISOString(),
            method: 'ai',
        };
    } catch (error) {
        console.error('[DocumentExtraction] AI extraction failed:', error instanceof Error ? error.message : 'Unknown');
        throw error;
    }
}

// ─── Regex-Based Fallback Extraction ─────────────────────────────────────────

const REGEX_PATTERNS: Record<DocumentType, Record<string, RegExp>> = {
    INVOICE: {
        invoiceNumber: /(?:invoice|faktur|inv)[\s.:#]*([A-Z0-9\-\/]+)/i,
        invoiceDate: /(?:tanggal|date|tgl)[\s.:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        dueDate: /(?:due|jatuh tempo|batas bayar)[\s.:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        vendorName: /(?:dari|from|vendor|penjual)[\s.:]*(.+)/i,
        totalAmount: /(?:total|jumlah|grand total|total bayar)[\s.:]*([0-9.,]+)/i,
        subtotal: /(?:subtotal|sub total|total sebelum pajak)[\s.:]*([0-9.,]+)/i,
        taxAmount: /(?:pajak|ppn|tax|vat)[\s.:]*([0-9.,]+)/i,
    },
    PURCHASE_ORDER: {
        poNumber: /(?:purchase\s*order|po)[\s.:#]*([A-Z0-9\-\/]+)/i,
        poDate: /(?:tanggal|date|tgl)[\s.:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        totalAmount: /(?:total|jumlah|grand total)[\s.:]*([0-9.,]+)/i,
    },
    RECEIPT: {
        receiptNumber: /(?:receipt|struk|bon|no)[\s.:#]*([A-Z0-9\-\/]+)/i,
        receiptDate: /(?:tanggal|date|tgl)[\s.:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        totalAmount: /(?:total|jumlah|bayar|total bayar)[\s.:]*([0-9.,]+)/i,
    },
    KTP: {
        nik: /\b(\d{16})\b/,
        fullName: /(?:nama)[\s.:]*(.+)/i,
        birthDate: /(?:tanggal lahir|tgl lahir|lahir)[\s.:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        birthPlace: /(?:tempat lahir)[\s.:]*(.+)/i,
        gender: /(?:jenis kelamin|kelamin)[\s.:]*(LAKI|PEREMPUAN|LAKI-LAKI|P)/i,
        address: /(?:alamat)[\s.:]*(.+)/i,
    },
    NPWP: {
        npwpNumber: /\b(\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3})\b/,
        fullName: /(?:nama|atas nama)[\s.:]*(.+)/i,
        address: /(?:alamat)[\s.:]*(.+)/i,
    },
};

function extractWithRegex(request: ExtractionRequest): ExtractionResult {
    const fields = DOCUMENT_FIELDS[request.documentType];
    const patterns = REGEX_PATTERNS[request.documentType];

    // We need the raw text - decode base64 to text (best effort for text-based PDFs)
    const rawText = decodeBase64ToText(request.fileBase64);

    const extractedFields: ExtractedField[] = fields.map((field) => {
        const pattern = patterns[field.key];
        if (pattern && rawText) {
            const match = rawText.match(pattern);
            if (match && match[1]) {
                return {
                    key: field.key,
                    label: field.label,
                    value: match[1].trim(),
                    confidence: 0.5, // Lower confidence for regex
                };
            }
        }
        return {
            key: field.key,
            label: field.label,
            value: '',
            confidence: 0,
        };
    });

    const overallConfidence =
        extractedFields.reduce((sum, f) => sum + f.confidence, 0) / extractedFields.length;

    return {
        documentType: request.documentType,
        fields: extractedFields,
        rawText: rawText || undefined,
        confidence: overallConfidence,
        extractedAt: new Date().toISOString(),
        method: 'regex',
    };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function decodeBase64ToText(base64: string): string {
    try {
        // Only works for text-based content (not images)
        const buffer = Buffer.from(base64, 'base64');
        return buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, '');
    } catch {
        return '';
    }
}

// ─── Main Extraction Function ────────────────────────────────────────────────

/**
 * Extract data from a document using AI vision with regex fallback.
 *
 * @param request - The extraction request containing file data and document type
 * @returns ExtractionResult with extracted fields and confidence scores
 */
export async function extractDocument(request: ExtractionRequest): Promise<ExtractionResult> {
    // Validate file size (max 10MB)
    const maxSizeBytes = 10 * 1024 * 1024;
    const fileSizeBytes = Math.ceil((request.fileBase64.length * 3) / 4);
    if (fileSizeBytes > maxSizeBytes) {
        throw new Error('File terlalu besar. Maksimal 10MB.');
    }

    // Validate mime type
    const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
    if (!allowedTypes.includes(request.mimeType)) {
        throw new Error('Tipe file tidak didukung. Gunakan PNG, JPEG, atau PDF.');
    }

    // Try AI extraction first
    try {
        return await extractWithAI(request);
    } catch (aiError) {
        console.warn('[DocumentExtraction] AI failed, falling back to regex:', aiError instanceof Error ? aiError.message : 'Unknown');

        // Fallback to regex (only useful for text-based PDFs)
        if (request.mimeType === 'application/pdf') {
            return extractWithRegex(request);
        }

        // For images without AI, return empty result with fallback method
        const fields = DOCUMENT_FIELDS[request.documentType];
        return {
            documentType: request.documentType,
            fields: fields.map((f) => ({
                key: f.key,
                label: f.label,
                value: '',
                confidence: 0,
            })),
            confidence: 0,
            extractedAt: new Date().toISOString(),
            method: 'fallback',
        };
    }
}

/**
 * Get the expected fields for a document type.
 */
export function getDocumentFields(documentType: DocumentType): { key: string; label: string }[] {
    return DOCUMENT_FIELDS[documentType];
}

/**
 * Get all supported document types.
 */
export function getSupportedDocumentTypes(): DocumentType[] {
    return Object.keys(DOCUMENT_FIELDS) as DocumentType[];
}

// ─── Persistence ─────────────────────────────────────────────────────────────

/**
 * Persist an extraction result to the database for history tracking.
 * This is fire-and-forget — persistence failure should not break extraction flow.
 */
export async function persistExtraction(
    tenantId: string,
    result: ExtractionResult,
    fileName: string,
    mimeType: string,
    fileSize?: number
): Promise<void> {
    try {
        const { prisma } = await import('@/lib/db');

        await prisma.extractionHistory.create({
            data: {
                tenantId,
                documentType: result.documentType,
                fileName,
                mimeType,
                fileSize: fileSize || null,
                fields: JSON.parse(JSON.stringify(result.fields)),
                confidence: result.confidence,
                method: result.method,
                extractedAt: result.extractedAt,
            },
        });
    } catch (error) {
        console.error('[DocumentExtraction] Failed to persist extraction:', error instanceof Error ? error.message : 'Unknown');
        // Don't throw — persistence failure shouldn't break extraction
    }
}
