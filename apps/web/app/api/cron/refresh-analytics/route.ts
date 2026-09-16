export const dynamic = 'force-dynamic';

// ============================================
// Cron: Refresh Analytics Materialized Views
// Triggered by the unified cron dispatcher.
// Uses CRON_SECRET auth (not user session).
// ============================================

import { verifyCronAuth, cronSuccess, cronError } from '@/lib/cron';
import { handleApiError } from '@/lib/api-error';
import { runRefreshAnalyticsViews } from '@/lib/analytics-refresh-handler';

export async function GET(req: Request) {
    try {
        if (!verifyCronAuth(req)) return cronError('Unauthorized', 401);

        const result = await runRefreshAnalyticsViews();

        if (result.success) {
            return cronSuccess({ message: result.message, data: result.data });
        }

        return cronError(result.message, 500);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: Request) {
    try {
        if (!verifyCronAuth(req)) return cronError('Unauthorized', 401);

        const result = await runRefreshAnalyticsViews();

        if (result.success) {
            return cronSuccess({ message: result.message, data: result.data });
        }

        return cronError(result.message, 500);
    } catch (error) {
        return handleApiError(error);
    }
}
