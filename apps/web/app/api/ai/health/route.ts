import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAIProvider } from '@/lib/ai/provider';

// ─── GET: AI Health Check ────────────────────────────────────────────────────

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const provider = process.env.AI_PROVIDER || 'mock';
        const model = process.env.AI_MODEL || (provider === 'mock' ? 'mock' : 'unknown');
        const hasApiKey = !!process.env.AI_API_KEY;
        const visionModel = process.env.AI_VISION_MODEL || model;

        // Test connectivity (only for non-mock providers)
        let status: 'healthy' | 'degraded' | 'unavailable' = 'healthy';
        let message = 'AI service is operational';
        let latencyMs: number | null = null;

        if (provider !== 'mock' && hasApiKey) {
            try {
                const start = Date.now();
                const aiProvider = getAIProvider();
                const testResponse = await aiProvider.chat(
                    [{ role: 'user', content: 'test' }],
                    { maxTokens: 5, temperature: 0 }
                );
                latencyMs = Date.now() - start;

                if (!testResponse || testResponse === 'No response') {
                    status = 'degraded';
                    message = 'AI provider returned empty response';
                }
            } catch (error) {
                status = 'unavailable';
                message = error instanceof Error ? error.message : 'Connection failed';
            }
        } else if (provider === 'mock') {
            status = 'healthy';
            message = 'Running in mock mode (no API key configured)';
        } else {
            status = 'degraded';
            message = 'AI_API_KEY not configured';
        }

        return NextResponse.json({
            success: true,
            data: {
                status,
                message,
                provider,
                model,
                visionModel,
                hasApiKey,
                latencyMs,
                capabilities: {
                    chat: true,
                    vision: provider !== 'mock' && hasApiKey,
                    documentExtraction: provider !== 'mock' && hasApiKey,
                    anomalyDetection: true, // Always available (rule-based)
                },
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                data: {
                    status: 'unavailable',
                    message: error instanceof Error ? error.message : 'Health check failed',
                    provider: process.env.AI_PROVIDER || 'unknown',
                    model: 'unknown',
                    visionModel: 'unknown',
                    hasApiKey: false,
                    latencyMs: null,
                    capabilities: {
                        chat: false,
                        vision: false,
                        documentExtraction: false,
                        anomalyDetection: true,
                    },
                },
            },
            { status: 200 } // Return 200 with degraded status
        );
    }
}
