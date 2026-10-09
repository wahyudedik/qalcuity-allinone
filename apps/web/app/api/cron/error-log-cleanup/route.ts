export const dynamic = 'force-dynamic';

import { handleApiError } from '@/lib/api-error';
import { verifyCronAuth, cronSuccess, cronError } from '@/lib/cron';
import { runErrorLogCleanup } from '@/lib/error-log-cleanup-handler';

// ─── GET: Cron endpoint (direct call) ───────────────────────────────────────
// Task handler ada di @/lib/error-log-cleanup-handler (pola sama dengan
// payment-reminder-handler). Retention config: env ERROR_LOG_RETENTION_DAYS
// (default 30 hari, clamp 1–365).

export async function GET(req: Request) {
    try {
        if (!verifyCronAuth(req)) return cronError('Unauthorized', 401);

        const result = await runErrorLogCleanup();
        return cronSuccess(result.data ?? {});
    } catch (error) {
        return handleApiError(error);
    }
}
