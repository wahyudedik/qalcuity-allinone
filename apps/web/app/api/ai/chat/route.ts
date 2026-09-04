import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAIProvider, type AIChatMessage } from '@/lib/ai/provider';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { sanitizeInput } from '@/lib/sanitize';
import { z } from 'zod';

const chatMessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1).max(10000),
});

const chatRequestSchema = z.object({
    messages: z.array(chatMessageSchema).min(1).max(50),
});

export async function POST(req: Request) {
    try {
        // Auth check
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limiting
        const ip = getClientIp(req);
        const tenantId = session.user.tenantId;
        const rateLimitResult = checkRateLimit(`api:ai:chat:${tenantId}:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const body = await req.json();

        // Zod validation
        const validation = chatRequestSchema.safeParse(body);
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

        const { messages } = validation.data;

        // Sanitize all message content
        const sanitizedMessages: AIChatMessage[] = messages.map((m) => ({
            role: m.role,
            content: sanitizeInput(m.content),
        }));

        // Audit logging
        void logAudit({
            userId: session.user.id || 'unknown',
            tenantId,
            action: 'CREATE',
            entity: 'AIChat',
            newValues: {
                messageCount: sanitizedMessages.length,
                lastRole: sanitizedMessages[sanitizedMessages.length - 1]?.role,
            },
            request: req,
        });

        // Get AI provider and generate response
        const provider = getAIProvider();
        const response = await provider.chat(sanitizedMessages);

        return NextResponse.json({ success: true, response });
    } catch (error) {
        console.error('AI Chat error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { success: false, error: 'AI service unavailable' },
            { status: 500 }
        );
    }
}
