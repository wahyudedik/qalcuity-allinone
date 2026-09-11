export const dynamic = 'force-dynamic';

import { verifyCronAuth, cronSuccess, cronError } from '@/lib/cron';
import { runAnomalyScanCron } from '@/lib/ai/anomaly-scan-handler';

// ─── GET: Cron endpoint (direct call) ───────────────────────────────────────

export async function GET(req: Request) {
    try {
        // Cron auth (CRON_SECRET Bearer token)
        if (!verifyCronAuth(req)) {
            return cronError('Unauthorized', 401);
        }

        const result = await runAnomalyScanCron();
        return cronSuccess(result.data ?? {});
    } catch (error) {
        console.error('[Cron Scan] Anomaly scan failed:', error);
        return cronError(error instanceof Error ? error.message : 'Internal server error', 500);
    }
}
