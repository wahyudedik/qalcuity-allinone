import { prisma } from './db';

interface AuditLogParams {
    userId: string;
    tenantId: string;
    action: string;      // CREATE, UPDATE, DELETE
    entity: string;      // Invoice, Payment, Contact, Deal, etc.
    entityId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    request?: Request;   // Auto-extract IP and User-Agent
}

/**
 * Log an audit trail entry for any mutation.
 * Non-blocking — errors are logged but never thrown.
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
    try {
        const ipAddress = params.request
            ? params.request.headers.get('x-forwarded-for') ||
            params.request.headers.get('x-real-ip') ||
            'unknown'
            : undefined;

        const userAgent = params.request
            ? params.request.headers.get('user-agent') || undefined
            : undefined;

        await prisma.auditLog.create({
            data: {
                userId: params.userId,
                tenantId: params.tenantId,
                action: params.action,
                entity: params.entity,
                entityId: params.entityId || null,
                oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
                newValues: params.newValues ? JSON.stringify(params.newValues) : null,
                ipAddress: ipAddress || null,
                userAgent: userAgent || null,
            },
        });
    } catch (error) {
        // Audit logging should never break the main flow
        console.error('[AuditLog] Failed to write audit log:', error);
    }
}

/**
 * Extract only the changed fields between old and new values.
 */
export function diffValues(
    oldVal: Record<string, unknown>,
    newVal: Record<string, unknown>
): { old: Record<string, unknown>; new: Record<string, unknown> } {
    const old: Record<string, unknown> = {};
    const updated: Record<string, unknown> = {};

    for (const key of Object.keys(newVal)) {
        if (JSON.stringify(oldVal[key]) !== JSON.stringify(newVal[key])) {
            old[key] = oldVal[key];
            updated[key] = newVal[key];
        }
    }

    return { old, new: updated };
}
