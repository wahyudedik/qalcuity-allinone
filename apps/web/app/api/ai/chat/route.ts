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

const chatMessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1).max(10000),
});

const chatRequestSchema = z.object({
    messages: z.array(chatMessageSchema).min(1).max(50),
});

export async function POST(req: Request) {
    try {
        const auth = await requirePermissionForRoute(req);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId, userId } = auth;

        // Rate limiting
        const ip = getClientIp(req);
        const rateLimitResult = checkRateLimit(`api:ai:chat:${tenantId}:${ip}`, 30, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
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
            userId,
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
        return handleApiError(error);
    }
}
