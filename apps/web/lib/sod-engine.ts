/**
 * @qalcuity/web — Separation of Duties (SoD) Engine
 *
 * Evaluates SoD rules to detect conflicts when a user performs actions.
 * Checks cross-role conflicts against the SoDRule table.
 *
 * Phase 3 — UCE SoD Engine
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SoDConflictResult {
    hasConflict: boolean;
    conflicts: SoDConflict[];
}

export interface SoDConflict {
    ruleId: string;
    ruleName: string;
    role1: string;
    role2: string;
    module: string;
    action: string | null;
    message: string;
    severity: 'blocking' | 'warning';
}

export interface SoDCheckContext {
    tenantId: string;
    userId: string;
    userRole: string;
    action: string;
    module: string;
    metadata?: Record<string, unknown>;
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Check SoD conflicts for a user performing an action in a module.
 *
 * Evaluates all enabled SoD rules for the tenant and module.
 * A conflict is detected when the user's role matches one of the conflicting roles
 * in a rule, and the action matches (or the rule applies to all actions).
 *
 * @param context - The SoD check context
 * @returns Conflict result with list of detected conflicts
 */
export async function checkSoDConflicts(
    context: SoDCheckContext
): Promise<SoDConflictResult> {
    const { tenantId, userRole, action, module } = context;

    try {
        // Load all enabled SoD rules for this tenant and module
        const rules = await prisma.soDRule.findMany({
            where: {
                tenantId,
                enabled: true,
                module,
            },
        });

        const conflicts: SoDConflict[] = [];

        for (const rule of rules) {
            // Check if the user's role matches either side of the conflict
            const roleMatches = userRole === rule.role1 || userRole === rule.role2;

            if (!roleMatches) continue;

            // Check if the action matches (null = all actions)
            const actionMatches = !rule.action || rule.action === action || rule.action === '*';

            if (!actionMatches) continue;

            // Determine the conflicting role (the "other" side)
            const conflictingRole = userRole === rule.role1 ? rule.role2 : rule.role1;

            conflicts.push({
                ruleId: rule.id,
                ruleName: rule.name,
                role1: rule.role1,
                role2: rule.role2,
                module: rule.module,
                action: rule.action,
                message: `SoD violation: Role "${userRole}" tidak boleh melakukan "${action}" di module "${module}" karena konflik dengan role "${conflictingRole}" (Rule: ${rule.name})`,
                severity: 'blocking',
            });
        }

        return {
            hasConflict: conflicts.length > 0,
            conflicts,
        };
    } catch (error) {
        logger.error('[SoDEngine] Error checking SoD conflicts', {
            tenantId,
            userId: context.userId,
            action,
            module,
            error,
        });

        // Fail open — don't block if SoD check fails
        return { hasConflict: false, conflicts: [] };
    }
}

/**
 * Check if a user has any active SoD exceptions that allow them to bypass a specific rule.
 *
 * @param params.tenantId - Tenant ID
 * @param params.userId - User ID
 * @param params.ruleId - SoD Rule ID to check exception for
 * @returns Whether an active exception exists
 */
export async function hasActiveSoDException(params: {
    tenantId: string;
    userId: string;
    ruleId: string;
}): Promise<boolean> {
    const { tenantId, userId, ruleId } = params;

    const exception = await prisma.soDException.findFirst({
        where: {
            tenantId,
            ruleId,
            userId,
            status: 'APPROVED',
            expiresAt: { gt: new Date() },
        },
    });

    return !!exception;
}

/**
 * Check SoD conflicts with exception awareness.
 * If a user has an active exception for a rule, that conflict is excluded.
 *
 * @param context - The SoD check context
 * @returns Conflict result (excluding conflicts with active exceptions)
 */
export async function checkSoDConflictsWithExceptions(
    context: SoDCheckContext
): Promise<SoDConflictResult> {
    const result = await checkSoDConflicts(context);

    if (!result.hasConflict) {
        return result;
    }

    // Filter out conflicts where user has active exceptions
    const filteredConflicts: SoDConflict[] = [];

    for (const conflict of result.conflicts) {
        const hasException = await hasActiveSoDException({
            tenantId: context.tenantId,
            userId: context.userId,
            ruleId: conflict.ruleId,
        });

        if (!hasException) {
            filteredConflicts.push(conflict);
        }
    }

    return {
        hasConflict: filteredConflicts.length > 0,
        conflicts: filteredConflicts,
    };
}

/**
 * Get all SoD rules for a tenant, optionally filtered by module.
 *
 * @param params.tenantId - Tenant ID
 * @param params.module - Optional module filter
 * @returns Array of SoD rules
 */
export async function getSoDRules(params: {
    tenantId: string;
    module?: string;
}) {
    const { tenantId, module } = params;

    const where: Record<string, unknown> = { tenantId };
    if (module) where.module = module;

    return prisma.soDRule.findMany({
        where,
        orderBy: { name: 'asc' },
    });
}

/**
 * Get a summary of SoD coverage for a tenant.
 * Shows which modules have SoD rules and how many rules per module.
 *
 * @param tenantId - Tenant ID
 * @returns SoD coverage summary
 */
export async function getSoDCoverageSummary(tenantId: string): Promise<{
    totalRules: number;
    enabledRules: number;
    modules: Array<{ module: string; ruleCount: number; enabledCount: number }>;
}> {
    const allRules = await prisma.soDRule.findMany({
        where: { tenantId },
    });

    const moduleMap = new Map<string, { total: number; enabled: number }>();

    for (const rule of allRules) {
        const current = moduleMap.get(rule.module) ?? { total: 0, enabled: 0 };
        current.total++;
        if (rule.enabled) current.enabled++;
        moduleMap.set(rule.module, current);
    }

    const modules = Array.from(moduleMap.entries()).map(([module, counts]) => ({
        module,
        ruleCount: counts.total,
        enabledCount: counts.enabled,
    }));

    return {
        totalRules: allRules.length,
        enabledRules: allRules.filter((r) => r.enabled).length,
        modules,
    };
}
