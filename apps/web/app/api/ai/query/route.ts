export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { getAIProvider, type AIChatMessage } from '@/lib/ai/provider';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { sanitizeInput } from '@/lib/sanitize';
import { z } from 'zod';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { parseQuery, type NLUParseResult } from '@/lib/ai/nlu-parser';
import { resolveSmartData, type ResolvedDataContext } from '@/lib/ai/data-resolver';
import {
    getSessionId,
    addTurn,
    getContext,
    resolveContextReference,
    buildConversationHistory,
    getActiveModule,
} from '@/lib/ai/conversation-context';

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const queryRequestSchema = z.object({
    query: z.string().min(1, 'Query tidak boleh kosong').max(500, 'Query maksimal 500 karakter'),
    module: z.string().max(50).optional(),
    sessionId: z.string().max(100).optional(),
});

// ─── System Prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Anda adalah AI Assistant untuk Qalcuity, sebuah Business Operating System (BOS) yang membantu bisnis berjalan lebih efisien.

## Peran Anda
- **Analisis Bisnis**: Membantu user memahami data bisnis mereka (penjualan, keuangan, inventory, HR, CRM)
- **Decision Support**: Memberikan insight dan rekomendasi berdasarkan data aktual
- **Actionable Guidance**: Menyarankan langkah konkret yang bisa diambil user

## Aturan Respons
1. **Bahasa**: Gunakan Bahasa Indonesia sebagai default. Gunakan Bahasa Inggris HANYA jika user menulis dalam Bahasa Inggris
2. **Data-Driven**: SELALU gunakan data konteks yang diberikan. JANGAN mengarang data — gunakan hanya data konteks yang diberikan
3. **Format Rapi**: Gunakan bullet points, angka, emoji (sparingly), dan struktur yang mudah dibaca
4. **Actionable**: Akhiri respons dengan rekomendasi atau langkah selanjutnya yang bisa diambil
5. **Spesifik**: Berikan angka spesifik, persentase, dan perbandingan jika memungkinkan
6. **Ringkas**: Respons harus efisien — tidak bertele-tele, langsung ke poin

## Format Respons Berdasarkan Intent
- **REPORT**: Tampilkan data dalam format tabel/ringkasan yang rapi
- **COMPARE**: Bandingkan secara berdampingan, highlight selisih dan perubahan
- **FILTER**: Tampilkan data yang sesuai filter, berikan jumlah total
- **AGGREGATE**: Tampilkan angka agregasi (total, rata-rata, min/max) dengan konteks
- **PREDICT**: Berikan prediksi berdasarkan data historis, sertakan confidence level
- **ACTION**: Berikan panduan langkah demi langkah untuk melakukan aksi
- **ANALYZE**: Berikan analisis mendalam dengan insight dan rekomendasi
- **GENERAL**: Berikan jawaban informatif tentang fitur Qalcuity

## Strategi Analisis
- **Revenue Analysis**: Bandingkan periode, identifikasi tren, hitung pertumbuhan
- **Cost Optimization**: Identifikasi area pengeluaran tertinggi, sarankan efisiensi
- **Customer Insights**: Analisis perilaku customer, identifikasi high-value customers
- **Inventory Health**: Cek stok rendah/berlebih, prediksi kebutuhan reorder
- **HR Metrics**: Hitung turnover, analisis distribusi department, monitoring absensi

## Format Angka
- Gunakan format Indonesia: Rp 1.000.000 (bukan Rp 1,000,000)
- Persentase: 25.5% (1 desimal)
- Tanggal: 13 September 2026 (Bahasa Indonesia) atau September 13, 2026 (English)

## Limitasi
- Anda TIDAK bisa membuat/mengubah/menghapus data secara langsung
- Untuk aksi (CREATE/UPDATE/DELETE), arahkan user ke fitur yang sesuai di dashboard
- Jika data tidak tersedia di konteks, saranakan user untuk memeriksa modul terkait`;

// ─── NLU Pipeline ───────────────────────────────────────────────────────────

/**
 * Build AI messages with NLU context, conversation history, and data context.
 */
function buildAIMessages(
    nluResult: NLUParseResult,
    dataContext: ResolvedDataContext | null,
    conversationHistory: string[],
    contextRef: ReturnType<typeof resolveContextReference>
): AIChatMessage[] {
    const messages: AIChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
    ];

    // Add conversation history if available
    if (conversationHistory.length > 0) {
        messages.push({
            role: 'system',
            content: `Riwayat percakapan sebelumnya:\n\n${conversationHistory.join('\n\n')}`,
        });
    }

    // Add context reference if available
    if (contextRef?.previousQuery) {
        messages.push({
            role: 'system',
            content: `User merujuk pada percakapan sebelumnya:
- Query sebelumnya: "${contextRef.previousQuery}"
- Module aktif: ${contextRef.activeModule || 'tidak diketahui'}
- Gunakan konteks ini untuk memahami query user saat ini.`,
        });
    }

    // Add NLU metadata for AI awareness
    const nluMeta = [
        `Intent terdeteksi: ${nluResult.intent} (confidence: ${Math.round(nluResult.confidence * 100)}%)`,
    ];
    if (nluResult.entities.timePeriod) {
        nluMeta.push(`Periode waktu: ${nluResult.entities.timePeriod.label}`);
    }
    if (nluResult.entities.moduleName) {
        nluMeta.push(`Modul: ${nluResult.entities.moduleName}`);
    }
    if (nluResult.entities.status) {
        nluMeta.push(`Status filter: ${nluResult.entities.status.join(', ')}`);
    }
    if (nluResult.entities.aggregationType) {
        nluMeta.push(`Tipe agregasi: ${nluResult.entities.aggregationType}`);
    }
    if (nluResult.entities.comparisonTarget) {
        nluMeta.push(`Target perbandingan: ${nluResult.entities.comparisonTarget}`);
    }

    messages.push({
        role: 'system',
        content: `Metadata NLU:\n- ${nluMeta.join('\n- ')}`,
    });

    // Add data context if available
    if (dataContext) {
        messages.push({
            role: 'system',
            content: `Berikut adalah data aktual dari sistem (${dataContext.description}):\n\n${dataContext.data}`,
        });
    }

    // Add the user query
    messages.push({ role: 'user', content: nluResult.rawQuery });

    return messages;
}

// ─── API Route ───────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    try {
        const auth = await requirePermissionForRoute(req);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId, userId } = auth;

        // Rate limiting (lower limit for query endpoint — heavier operation)
        const ip = getClientIp(req);
        const rateLimitResult = checkRateLimit(`api:ai:query:${tenantId}:${ip}`, 15, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const body = await req.json();

        // Zod validation
        const validation = queryRequestSchema.safeParse(body);
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

        const { query, module: requestModule, sessionId: customSessionId } = validation.data;

        // Sanitize query
        const sanitizedQuery = sanitizeInput(query);

        // Generate session ID
        const sessionId = customSessionId || getSessionId(tenantId, userId);

        // ── Step 1: Parse query with NLU ──────────────────────────────────────
        const nluResult = parseQuery(sanitizedQuery);
        logger.info('[AI Query] NLU parsed:', {
            intent: nluResult.intent,
            confidence: nluResult.confidence,
            moduleName: nluResult.entities.moduleName,
            timePeriod: nluResult.entities.timePeriod?.label,
        });

        // ── Step 2: Check for context references ─────────────────────────────
        const contextRef = resolveContextReference(sessionId, sanitizedQuery);

        // Determine effective module (request override > NLU detected > context active)
        const effectiveModule = (requestModule || nluResult.entities.moduleName || getActiveModule(sessionId)) as string | undefined;

        // ── Step 3: Resolve data context with smart resolver ──────────────────
        let dataContext: ResolvedDataContext | null = null;

        try {
            dataContext = await resolveSmartData({
                tenantId,
                nluResult: {
                    ...nluResult,
                    entities: {
                        ...nluResult.entities,
                        moduleName: effectiveModule as typeof nluResult.entities.moduleName,
                    },
                },
                requestModule,
            });
        } catch (error) {
            logger.error('[AI Query] Data resolution error:', error instanceof Error ? error.message : 'Unknown');
            // Continue without data context — AI can still respond
        }

        // ── Step 4: Build conversation history ───────────────────────────────
        const conversationHistory = buildConversationHistory(sessionId);

        // ── Step 5: Build AI messages ────────────────────────────────────────
        const messages = buildAIMessages(nluResult, dataContext, conversationHistory, contextRef);

        // ── Step 6: Audit logging ────────────────────────────────────────────
        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'AIQuery',
            newValues: {
                query: sanitizedQuery,
                intent: nluResult.intent,
                confidence: nluResult.confidence,
                moduleName: effectiveModule || 'general',
                hasContext: !!dataContext,
                hasConversationHistory: conversationHistory.length > 0,
            },
            request: req,
        });

        // ── Step 7: Get AI provider and generate response ────────────────────
        const provider = getAIProvider();
        const response = await provider.chat(messages);

        // ── Step 8: Store conversation turn ──────────────────────────────────
        addTurn(sessionId, sanitizedQuery, response, nluResult.intent, nluResult.entities.moduleName);

        // ── Step 9: Return response with metadata ────────────────────────────
        return NextResponse.json({
            success: true,
            response,
            metadata: {
                intent: nluResult.intent,
                confidence: nluResult.confidence,
                moduleName: effectiveModule || 'general',
                hasContext: !!dataContext,
                dataDescription: dataContext?.description,
                hasConversationHistory: conversationHistory.length > 0,
                entities: {
                    timePeriod: nluResult.entities.timePeriod?.label,
                    status: nluResult.entities.status,
                    aggregationType: nluResult.entities.aggregationType,
                    comparisonTarget: nluResult.entities.comparisonTarget,
                },
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
