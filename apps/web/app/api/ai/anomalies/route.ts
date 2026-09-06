import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runAnomalyScan, type AnomalySeverity, type AnomalyStatus, type AnomalyEntityType } from '@/lib/ai/anomaly-detection';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const scanRequestSchema = z.object({
    force: z.boolean().optional(),
});

const querySchema = z.object({
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
    status: z.enum(['OPEN', 'DISMISSED', 'INVESTIGATING', 'BLOCKED']).optional(),
    entityType: z.enum(['INVOICE', 'PAYMENT', 'PURCHASE_ORDER', 'QUOTATION', 'JOURNAL_ENTRY']).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
});

// ─── In-memory cache (per-tenant, 5 min TTL) ─────────────────────────────────

const scanCache = new Map<string, { data: ReturnType<typeof runAnomalyScan> extends Promise<infer T> ? T : never; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── GET: List anomalies ─────────────────────────────────────────────────────

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ADMIN+ required for anomaly management
        const role = session.user.role;
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { error: 'Anda tidak memiliki akses untuk melihat anomali' },
                { status: 403 }
            );
        }

        const tenantId = session.user.tenantId;
        const { searchParams } = new URL(req.url);

        // Parse query params
        const queryResult = querySchema.safeParse({
            severity: searchParams.get('severity'),
            status: searchParams.get('status'),
            entityType: searchParams.get('entityType'),
            limit: searchParams.get('limit'),
            offset: searchParams.get('offset'),
        });

        if (!queryResult.success) {
            return NextResponse.json(
                { success: false, error: 'Parameter tidak valid', details: queryResult.error.issues },
                { status: 400 }
            );
        }

        const { severity, status, entityType, limit = 50, offset = 0 } = queryResult.data;

        // Get or run scan
        const cached = scanCache.get(tenantId);
        let scanResult;
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            scanResult = cached.data;
        } else {
            scanResult = await runAnomalyScan(tenantId);
            scanCache.set(tenantId, { data: scanResult, timestamp: Date.now() });
        }

        // Apply filters
        let filtered = scanResult.anomalies;
        if (severity) filtered = filtered.filter((a) => a.severity === severity);
        if (status) filtered = filtered.filter((a) => a.status === status);
        if (entityType) filtered = filtered.filter((a) => a.entityType === entityType);

        const total = filtered.length;
        filtered = filtered.slice(offset, offset + limit);

        return NextResponse.json({
            success: true,
            data: {
                anomalies: filtered,
                total,
                summary: scanResult.summary,
                scanDuration: scanResult.scanDuration,
                scannedAt: scanResult.scannedAt,
            },
        });
    } catch (error) {
        console.error(
            'Anomalies list error:',
            error instanceof Error ? error.message : 'Unknown error'
        );
        return NextResponse.json(
            { success: false, error: 'Gagal memuat data anomali' },
            { status: 500 }
        );
    }
}

// ─── POST: Trigger manual scan ───────────────────────────────────────────────

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ADMIN+ required for manual scan
        const role = session.user.role;
        if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.json(
                { error: 'Anda tidak memiliki akses untuk menjalankan scan' },
                { status: 403 }
            );
        }

        // Rate limiting (lower limit for scan — heavier operation)
        const ip = getClientIp(req);
        const tenantId = session.user.tenantId;
        const rateLimitResult = checkRateLimit(`api:ai:anomalies:scan:${tenantId}:${ip}`, 5, 300000); // 5 per 5 min
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Terlalu banyak scan request. Tunggu beberapa menit.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
            );
        }

        const body = await req.json().catch(() => ({}));
        const validation = scanRequestSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'Input tidak valid' },
                { status: 400 }
            );
        }

        // Audit logging
        void logAudit({
            userId: session.user.id || 'unknown',
            tenantId,
            action: 'CREATE',
            entity: 'AnomalyScan',
            newValues: { triggeredBy: 'manual', forced: validation.data.force || false },
            request: req,
        });

        // Run scan (clear cache if forced)
        if (validation.data.force) {
            scanCache.delete(tenantId);
        }

        const scanResult = await runAnomalyScan(tenantId);
        scanCache.set(tenantId, { data: scanResult, timestamp: Date.now() });

        return NextResponse.json({
            success: true,
            data: scanResult,
        });
    } catch (error) {
        console.error(
            'Anomaly scan error:',
            error instanceof Error ? error.message : 'Unknown error'
        );
        return NextResponse.json(
            { success: false, error: 'Gagal menjalankan scan anomali' },
            { status: 500 }
        );
    }
}
