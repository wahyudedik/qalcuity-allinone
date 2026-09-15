export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { handleApiError } from '@/lib/api-error';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sendTextMessage, isWhatsAppConfigured } from '@/lib/whatsapp/client';
import { whatsappTestSchema } from '@/lib/validation-schemas';

/**
 * POST /api/settings/integrations/whatsapp/test
 *
 * Test WhatsApp connection by sending a test message to the provided phone number.
 *
 * Rate limit: 5/minute per IP.
 * Auth: requirePermissionForRoute (system.admin fallback).
 */
export async function POST(request: Request) {
    try {
        // Rate limit: 5 requests per minute
        const ip = getClientIp(request);
        const rl = checkRateLimit(`whatsapp:test:${ip}`, 5, 60_000);
        if (!rl.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429 }
            );
        }

        // Auth check
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json(
                { success: false, error: auth.error },
                { status: auth.status }
            );
        }
        const { tenantId } = auth;

        // Check if WhatsApp is configured for this tenant
        const configured = await isWhatsAppConfigured(tenantId);
        if (!configured) {
            return NextResponse.json(
                { success: false, error: MSG.WHATSAPP_NOT_CONFIGURED },
                { status: 400 }
            );
        }

        // Validate input
        const body = await request.json();
        const validated = whatsappTestSchema.parse(body);

        // Send test message
        const result = await sendTextMessage(
            tenantId,
            validated.phone,
            'Ini adalah pesan test dari Qalcuity. Jika Anda menerima pesan ini, berarti WhatsApp Business API sudah terkonfigurasi dengan benar. ✅',
            { channel: 'test' }
        );

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error || MSG.WHATSAPP_SEND_FAILED },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: MSG.WHATSAPP_SENT_SUCCESS,
            data: {
                messageId: result.messageId,
                skipped: result.skipped || false,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
