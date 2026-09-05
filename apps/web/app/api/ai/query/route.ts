import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAIProvider, type AIChatMessage } from '@/lib/ai/provider';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { sanitizeInput } from '@/lib/sanitize';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const queryRequestSchema = z.object({
    query: z.string().min(1, 'Query tidak boleh kosong').max(500, 'Query maksimal 500 karakter'),
    module: z.string().max(50).optional(),
});

// ─── Query Resolver (MVP: keyword-based) ─────────────────────────────────────

interface QueryContext {
    tenantId: string;
    module?: string;
}

/**
 * Attempts to resolve common natural language queries by fetching real data.
 * Returns structured context that the AI can use to generate a better response.
 */
async function resolveQueryContext(
    query: string,
    context: QueryContext
): Promise<string | null> {
    const lower = query.toLowerCase();
    const { tenantId } = context;

    try {
        // Sales/Penjualan queries
        if (lower.includes('penjualan') || lower.includes('sales') || lower.includes('revenue')) {
            const invoices = await prisma.invoice.findMany({
                where: { tenantId },
                select: {
                    total: true,
                    status: true,
                    dueDate: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 50,
            });

            const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
            const paidInvoices = invoices.filter((inv) => inv.status === 'PAID');
            const pendingInvoices = invoices.filter((inv) => inv.status === 'PENDING');
            const overdueInvoices = invoices.filter((inv) => inv.status === 'OVERDUE');

            return `KONTEKS DATA AKTUAL (Penjualan):
- Total Revenue: Rp ${totalRevenue.toLocaleString('id-ID')}
- Total Invoice: ${invoices.length}
- PAID: ${paidInvoices.length} invoice (Rp ${paidInvoices.reduce((s, i) => s + Number(i.total), 0).toLocaleString('id-ID')})
- PENDING: ${pendingInvoices.length} invoice (Rp ${pendingInvoices.reduce((s, i) => s + Number(i.total), 0).toLocaleString('id-ID')})
- OVERDUE: ${overdueInvoices.length} invoice (Rp ${overdueInvoices.reduce((s, i) => s + Number(i.total), 0).toLocaleString('id-ID')})`;
        }

        // Invoice queries
        if (lower.includes('invoice') || lower.includes('faktur')) {
            const invoices = await prisma.invoice.findMany({
                where: { tenantId },
                select: {
                    invoiceNumber: true,
                    total: true,
                    status: true,
                    dueDate: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 20,
            });

            const statusCounts = invoices.reduce(
                (acc, inv) => {
                    acc[inv.status] = (acc[inv.status] || 0) + 1;
                    return acc;
                },
                {} as Record<string, number>
            );

            return `KONTEKS DATA AKTUAL (Invoice):
- Total Invoice: ${invoices.length}
- Status: ${Object.entries(statusCounts)
                    .map(([s, c]) => `${s}: ${c}`)
                    .join(', ')}
- Daftar terbaru: ${invoices
                    .slice(0, 5)
                    .map((inv) => `${inv.invoiceNumber} - Rp ${Number(inv.total).toLocaleString('id-ID')} (${inv.status})`)
                    .join('; ')}`;
        }

        // Customer/Kontak queries
        if (lower.includes('customer') || lower.includes('kontak') || lower.includes('pelanggan')) {
            const contacts = await prisma.contact.findMany({
                where: { tenantId },
                select: {
                    name: true,
                    company: true,
                    email: true,
                    phone: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
            });

            return `KONTEKS DATA AKTUAL (Customer):
- Total Kontak: ${contacts.length}
- Daftar: ${contacts
                    .map((c) => `${c.name}${c.company ? ` (${c.company})` : ''}`)
                    .join(', ')}`;
        }

        // Product/Inventory queries
        if (lower.includes('produk') || lower.includes('stok') || lower.includes('inventory') || lower.includes('barang')) {
            const products = await prisma.product.findMany({
                where: { tenantId },
                select: {
                    name: true,
                    sku: true,
                    price: true,
                    stock: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 20,
            });

            return `KONTEKS DATA AKTUAL (Produk):
- Total Produk: ${products.length}
- Daftar: ${products
                    .slice(0, 10)
                    .map((p) => `${p.name} (${p.sku}) - Rp ${Number(p.price).toLocaleString('id-ID')} [Stok: ${p.stock}]`)
                    .join('; ')}`;
        }

        // Employee/HR queries
        if (lower.includes('karyawan') || lower.includes('employee') || lower.includes('hr')) {
            const employees = await prisma.employee.findMany({
                where: { tenantId },
                select: {
                    name: true,
                    employeeId: true,
                    position: true,
                    department: true,
                    status: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 20,
            });

            return `KONTEKS DATA AKTUAL (Karyawan):
- Total Karyawan: ${employees.length}
- Daftar: ${employees
                    .map((e) => `${e.name} (${e.employeeId}) - ${e.position} (${e.department || 'N/A'}) [${e.status}]`)
                    .join('; ')}`;
        }

        // No specific context resolved — let AI handle it
        return null;
    } catch (error) {
        console.error('[AI Query] Context resolution error:', error instanceof Error ? error.message : 'Unknown');
        return null;
    }
}

// ─── System Prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Anda adalah AI Assistant untuk Qalcuity, sebuah Business Operating System (BOS).
Anda membantu user dengan pertanyaan seputar bisnis mereka: penjualan, invoice, customer, inventory, HR, dan keuangan.

Aturan:
- Jawab dalam Bahasa Indonesia kecuali user menulis dalam Bahasa Inggris
- Gunakan data konteks yang diberikan untuk menjawab pertanyaan
- Berikan jawaban yang actionable dan spesifik
- Gunakan format yang rapi (bullet points, angka, dll)
- Jika tidak ada data yang relevan, berikan panduan umum tentang fitur Qalcuity
- Jangan mengarang data — gunakan hanya data konteks yang diberikan`;

// ─── API Route ───────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    try {
        // Auth check
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limiting (lower limit for query endpoint — heavier operation)
        const ip = getClientIp(req);
        const tenantId = session.user.tenantId;
        const rateLimitResult = checkRateLimit(`api:ai:query:${tenantId}:${ip}`, 15, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
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

        const { query, module } = validation.data;

        // Sanitize query
        const sanitizedQuery = sanitizeInput(query);

        // Resolve query context from database
        const contextData = await resolveQueryContext(sanitizedQuery, { tenantId, module });

        // Build messages for AI
        const messages: AIChatMessage[] = [
            { role: 'system', content: SYSTEM_PROMPT },
        ];

        if (contextData) {
            messages.push({
                role: 'system',
                content: `Berikut adalah data aktual dari sistem:\n\n${contextData}`,
            });
        }

        messages.push({ role: 'user', content: sanitizedQuery });

        // Audit logging
        void logAudit({
            userId: session.user.id || 'unknown',
            tenantId,
            action: 'CREATE',
            entity: 'AIQuery',
            newValues: {
                query: sanitizedQuery,
                module: module || 'general',
                hasContext: !!contextData,
            },
            request: req,
        });

        // Get AI provider and generate response
        const provider = getAIProvider();
        const response = await provider.chat(messages);

        return NextResponse.json({
            success: true,
            response,
            metadata: {
                hasContext: !!contextData,
                module: module || 'general',
            },
        });
    } catch (error) {
        console.error('AI Query error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { success: false, error: 'AI service unavailable' },
            { status: 500 }
        );
    }
}
