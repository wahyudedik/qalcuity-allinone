export const dynamic = 'force-dynamic';

import { handleApiError } from '@/lib/api-error';
import { verifyCronAuth, cronSuccess, cronError } from '@/lib/cron';
import { runRecurringInvoice } from '@/lib/recurring-invoice-handler';

// ─── GET: Cron endpoint (direct call) ───────────────────────────────────────

export async function GET(req: Request) {
    try {
        if (!verifyCronAuth(req)) return cronError('Unauthorized', 401);

        const result = await runRecurringInvoice();
        return cronSuccess(result.data ?? {});
    } catch (error) {
        return handleApiError(error);
    }
}
