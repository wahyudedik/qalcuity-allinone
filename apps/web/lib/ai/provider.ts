import OpenAI from 'openai';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AIChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface AIChatOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface AIProvider {
    chat(messages: AIChatMessage[], options?: AIChatOptions): Promise<string>;
}

// ─── OpenAI Provider ─────────────────────────────────────────────────────────

export class OpenAIProvider implements AIProvider {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({
            apiKey: process.env.AI_API_KEY,
        });
    }

    async chat(messages: AIChatMessage[], options?: AIChatOptions): Promise<string> {
        const response = await this.client.chat.completions.create({
            model: options?.model || process.env.AI_MODEL || 'gpt-4o-mini',
            messages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens ?? 1000,
        });

        return response.choices[0]?.message?.content || 'No response';
    }
}

// ─── Mock Provider (Fallback) ────────────────────────────────────────────────

export class MockProvider implements AIProvider {
    async chat(messages: AIChatMessage[], _options?: AIChatOptions): Promise<string> {
        const lastMessage = messages[messages.length - 1]?.content || '';
        const lower = lastMessage.toLowerCase();

        // Keyword-based mock responses
        if (lower.includes('penjualan') || lower.includes('sales')) {
            return '📊 Ringkasan Penjualan Bulan Ini:\n\n• Total Revenue: Rp 45.750.000\n• Invoice Terbayar: 12 invoice\n• Invoice Pending: 5 invoice\n• Rata-rata per Invoice: Rp 3.812.500\n\n📈 Penjualan naik 12.5% dari bulan lalu.';
        }

        if (lower.includes('invoice') || lower.includes('faktur')) {
            return '📋 Invoice Status:\n\n• PAID: 12 invoice (Rp 35.000.000)\n• PENDING: 5 invoice (Rp 8.750.000)\n• OVERDUE: 2 invoice (Rp 2.000.000)\n\n⚠️ 2 invoice sudah overdue > 30 hari. Disarankan untuk follow up.';
        }

        if (lower.includes('customer') || lower.includes('kontak') || lower.includes('pelanggan')) {
            return '👥 Top 5 Customers:\n\n1. PT Maju Jaya - Rp 15.500.000\n2. CV Berkah Mandiri - Rp 12.250.000\n3. PT Sejahtera Abadi - Rp 8.000.000\n4. PT Nusantara Jaya - Rp 5.500.000\n5. CV Sukses Mandiri - Rp 4.500.000';
        }

        if (lower.includes('profit') || lower.includes('laba')) {
            return '💰 Profit & Loss Summary:\n\n• Revenue: Rp 45.750.000\n• COGS: Rp 22.500.000\n• Gross Profit: Rp 23.250.000 (50.8%)\n• Operating Expenses: Rp 12.000.000\n• Net Profit: Rp 11.250.000 (24.6%)\n\n✅ Margin sehat. Pertimbangkan untuk mengurangi operational expense.';
        }

        if (lower.includes('report') || lower.includes('laporan')) {
            return 'Laporan tersedia di menu Reports. Anda bisa melihat laporan penjualan, keuangan, dan inventory.';
        }

        if (lower.includes('stok') || lower.includes('inventory') || lower.includes('produk')) {
            return 'Untuk mengelola stok, buka menu Inventory → Products. Anda bisa menambah produk, melihat stok, dan melakukan stock movement.';
        }

        return 'Saya adalah AI Assistant Qalcuity. Saya bisa membantu Anda dengan:\n\n• Menampilkan data penjualan\n• Membuat invoice\n• Menganalisis profit & loss\n• Memberikan insight bisnis\n\nAda yang bisa saya bantu?';
    }
}

// ─── Provider Factory ────────────────────────────────────────────────────────

/**
 * Get AI provider based on AI_PROVIDER environment variable.
 * Defaults to 'mock' if not configured or if no API key is provided.
 */
export function getAIProvider(): AIProvider {
    const provider = process.env.AI_PROVIDER || 'mock';

    if (provider === 'openai' && process.env.AI_API_KEY) {
        return new OpenAIProvider();
    }

    // Fallback to mock provider
    return new MockProvider();
}
