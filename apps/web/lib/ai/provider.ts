import OpenAI from 'openai';
import { logger } from '@/lib/logger';

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

// ─── OpenAI-Compatible Provider ──────────────────────────────────────────────
// Supports: OpenAI, OpenRouter, Ollama, and any OpenAI-compatible API

export class OpenAICompatibleProvider implements AIProvider {
    private client: OpenAI;
    private defaultModel: string;
    private defaultTemperature: number;
    private defaultMaxTokens: number;

    constructor(config?: { baseURL?: string; apiKey?: string; model?: string }) {
        const baseURL = config?.baseURL || process.env.AI_BASE_URL || 'https://api.openai.com/v1';
        const apiKey = config?.apiKey || process.env.AI_API_KEY || 'sk-placeholder';

        this.client = new OpenAI({ apiKey, baseURL });
        this.defaultModel = config?.model || process.env.AI_MODEL || 'gpt-3.5-turbo';
        this.defaultTemperature = Number(process.env.AI_TEMPERATURE) || 0.7;
        this.defaultMaxTokens = Number(process.env.AI_MAX_TOKENS) || 2000;
    }

    async chat(messages: AIChatMessage[], options?: AIChatOptions): Promise<string> {
        const response = await this.client.chat.completions.create({
            model: options?.model || this.defaultModel,
            messages,
            temperature: options?.temperature ?? this.defaultTemperature,
            max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
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
 * Resolves the base URL for a given AI provider.
 */
function resolveBaseURL(provider: string): string | undefined {
    switch (provider) {
        case 'openrouter':
            return process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';
        case 'ollama':
            return process.env.AI_BASE_URL || 'http://localhost:11434/v1';
        default:
            return process.env.AI_BASE_URL || undefined;
    }
}

/**
 * Resolves the default model for a given AI provider.
 */
function resolveModel(provider: string): string | undefined {
    switch (provider) {
        case 'ollama':
            return process.env.AI_MODEL || 'llama3';
        default:
            return process.env.AI_MODEL || undefined;
    }
}

/**
 * Get AI provider based on AI_PROVIDER environment variable.
 *
 * Supported providers:
 *   - "openai"     → OpenAI API (default base URL: https://api.openai.com/v1)
 *   - "openrouter" → OpenRouter API (default base URL: https://openrouter.ai/api/v1)
 *   - "ollama"     → Ollama local (default base URL: http://localhost:11434/v1)
 *   - "mock"       → Mock provider (no API key needed)
 *
 * If AI_API_KEY is not set and provider is not "mock", falls back to mock provider
 * for backward compatibility.
 */
export function getAIProvider(): AIProvider {
    const provider = process.env.AI_PROVIDER || 'mock';

    // If no API key configured, always use mock (backward compatible)
    if (!process.env.AI_API_KEY && provider !== 'mock') {
        logger.warn(
            `[AI] ⚠️  AI_PROVIDER="${provider}" but AI_API_KEY is not set. Falling back to mock provider.`
        );
        return new MockProvider();
    }

    switch (provider) {
        case 'openai':
        case 'openrouter':
        case 'ollama':
            return new OpenAICompatibleProvider({
                baseURL: resolveBaseURL(provider),
                model: resolveModel(provider),
            });

        case 'mock':
            return new MockProvider();

        default:
            logger.warn(`[AI] Unknown provider "${provider}". Falling back to mock.`);
            return new MockProvider();
    }
}
