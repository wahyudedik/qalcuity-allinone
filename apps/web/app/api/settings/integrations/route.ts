import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/settings/integrations
 *
 * Returns the connection status of each integration based on
 * whether the corresponding environment variables are configured.
 *
 * This endpoint is server-side only, so it can safely read process.env
 * without exposing secrets to the client.
 */
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const integrations = {
        whatsapp: !!process.env.WHATSAPP_API_KEY,
        email: !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS,
        midtrans: !!process.env.MIDTRANS_SERVER_KEY,
        xendit: !!process.env.XENDIT_SECRET_KEY,
        ai: !!process.env.AI_API_KEY && process.env.AI_PROVIDER !== 'mock',
        payment: !!process.env.MIDTRANS_SERVER_KEY || !!process.env.XENDIT_SECRET_KEY,
    };

    return NextResponse.json({ integrations });
}
