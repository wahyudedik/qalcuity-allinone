import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/email';
import { sanitizeObject } from '@/lib/sanitize';
import { z } from 'zod';

const sendEmailSchema = z.object({
    to: z.string().email('Format email tidak valid'),
    subject: z.string().min(1, 'Subjek wajib diisi').max(255, 'Subjek maksimal 255 karakter'),
    body: z.string().min(1, 'Isi email wajib diisi'),
    entityType: z.enum(['CONTACT', 'LEAD', 'DEAL']).optional(),
    entityId: z.string().optional(),
});

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:crm-emails:${ip}`, 100, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;
        const { searchParams } = new URL(request.url);
        const entityType = searchParams.get('entityType');
        const entityId = searchParams.get('entityId');

        // List email activities for this entity
        const where: Record<string, unknown> = {
            tenantId,
            type: 'EMAIL',
        };

        if (entityType) {
            where.entityType = entityType.toUpperCase();
        }

        if (entityId) {
            where.entityId = entityId;
        }

        const activities = await prisma.activity.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        const data = activities.map((a) => ({
            id: a.id,
            entityType: a.entityType,
            entityId: a.entityId,
            subject: a.subject,
            description: a.description,
            createdAt: a.createdAt.toISOString(),
            createdBy: a.createdBy,
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:crm-emails:POST:${ip}`, 10, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak request. Coba lagi nanti.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { userId, tenantId: authTenantId } = auth;
        const body = await request.json();

        // Validasi input dengan Zod
        const validation = sanitizeObject(body);
        const parsed = sendEmailSchema.safeParse(validation);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        // Convert body to HTML (simple line-break to <br> conversion)
        const htmlBody = parsed.data.body
            .split('\n')
            .map((line) => `<p>${line}</p>`)
            .join('');

        // Send email
        const result = await sendEmail({
            to: parsed.data.to,
            subject: parsed.data.subject,
            html: htmlBody,
        });

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error || 'Gagal mengirim email' },
                { status: 500 }
            );
        }

        // Log as activity if entityType and entityId are provided
        if (parsed.data.entityType && parsed.data.entityId) {
            await prisma.activity.create({
                data: {
                    tenantId: authTenantId,
                    entityType: parsed.data.entityType,
                    entityId: parsed.data.entityId,
                    type: 'EMAIL',
                    subject: parsed.data.subject,
                    description: `Email dikirim ke ${parsed.data.to}\n\n${parsed.data.body}`,
                    createdBy: userId,
                },
            });
        }

        void logAudit({
            userId,
            tenantId: authTenantId,
            action: 'CREATE',
            entity: 'Email',
            entityId: result.messageId || 'unknown',
            newValues: { to: parsed.data.to, subject: parsed.data.subject },
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                messageId: result.messageId,
                to: parsed.data.to,
                subject: parsed.data.subject,
            },
        }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request body';
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}
