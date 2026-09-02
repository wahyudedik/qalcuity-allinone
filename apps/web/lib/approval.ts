import { prisma } from './db';
import { logAudit } from './audit';

// ============================================
// Approval Engine Service
// Multi-level approval workflow for transactions
// ============================================

const ROLE_HIERARCHY: Record<string, number> = {
    VIEWER: 0,
    MEMBER: 1,
    ADMIN: 2,
    SUPERADMIN: 3,
};

/**
 * Check if user's role meets the minimum required role for approval.
 */
function hasRequiredRole(userRole: string, requiredRole: string): boolean {
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
    return userLevel >= requiredLevel;
}

/**
 * 1. Get configured approval levels for a tenant and entity type.
 */
export async function getApprovalLevels(
    tenantId: string,
    entityType: string
) {
    return prisma.approvalLevel.findMany({
        where: {
            tenantId,
            entityType,
        },
        orderBy: { level: 'asc' },
    });
}

/**
 * 2. Create an approval request at level 1 (or skip if no levels configured).
 * Returns the created request or null if auto-approved.
 */
export async function createApprovalRequest(params: {
    tenantId: string;
    entityType: string;
    entityId: string;
    userId: string;
    request?: Request;
}) {
    const { tenantId, entityType, entityId, userId, request } = params;

    // Check if approval levels exist for this entity type
    const levels = await getApprovalLevels(tenantId, entityType);

    if (levels.length === 0) {
        // No approval levels configured — auto-approve
        return null;
    }

    // Check if there's already a pending request for this entity
    const existingRequest = await prisma.approvalRequest.findFirst({
        where: {
            tenantId,
            entityType,
            entityId,
            status: 'PENDING',
        },
    });

    if (existingRequest) {
        // Already has a pending request
        return existingRequest;
    }

    // Create request at level 1
    const activeLevels = levels.filter((l) => l.isActive);
    if (activeLevels.length === 0) {
        return null;
    }

    const request_record = await prisma.approvalRequest.create({
        data: {
            tenantId,
            entityType,
            entityId,
            currentLevel: activeLevels[0].level,
            status: 'PENDING',
            requestedBy: userId,
        },
    });

    void logAudit({
        userId,
        tenantId,
        action: 'CREATE',
        entity: 'ApprovalRequest',
        entityId: request_record.id,
        newValues: {
            entityType,
            entityId,
            currentLevel: activeLevels[0].level,
        },
        request,
    });

    return request_record;
}

/**
 * 3. Approve a request at the current level.
 * If current level is the last level, mark entity as APPROVED.
 * Otherwise, advance to the next level.
 */
export async function approveRequest(params: {
    requestId: string;
    userId: string;
    userRole: string;
    comments?: string;
    request?: Request;
}) {
    const { requestId, userId, userRole, comments, request } = params;

    const approvalRequest = await prisma.approvalRequest.findUnique({
        where: { id: requestId },
    });

    if (!approvalRequest) {
        throw new Error('Approval request tidak ditemukan');
    }

    if (approvalRequest.status !== 'PENDING') {
        throw new Error('Approval request sudah tidak dalam status PENDING');
    }

    // Get current level config
    const levelConfig = await prisma.approvalLevel.findFirst({
        where: {
            tenantId: approvalRequest.tenantId,
            entityType: approvalRequest.entityType,
            level: approvalRequest.currentLevel,
        },
    });

    if (!levelConfig) {
        throw new Error('Konfigurasi approval level tidak ditemukan');
    }

    // Check if user has required role
    if (!hasRequiredRole(userRole, levelConfig.requiredRole)) {
        throw new Error(
            `Anda tidak memiliki role yang cukup untuk approve level ini. Diperlukan: ${levelConfig.requiredRole}`
        );
    }

    // Get all active levels for this entity type
    const allLevels = await prisma.approvalLevel.findMany({
        where: {
            tenantId: approvalRequest.tenantId,
            entityType: approvalRequest.entityType,
            isActive: true,
        },
        orderBy: { level: 'asc' },
    });

    const maxLevel = allLevels.length > 0
        ? Math.max(...allLevels.map((l) => l.level))
        : approvalRequest.currentLevel;

    const isLastLevel = approvalRequest.currentLevel >= maxLevel;

    if (isLastLevel) {
        // Final approval — mark request as APPROVED
        const updatedRequest = await prisma.approvalRequest.update({
            where: { id: requestId },
            data: {
                status: 'APPROVED',
                resolvedBy: userId,
                resolvedAt: new Date(),
                comments: comments || null,
            },
        });

        // Update entity status to APPROVED
        await updateEntityStatus(
            approvalRequest.tenantId,
            approvalRequest.entityType,
            approvalRequest.entityId,
            'APPROVED'
        );

        void logAudit({
            userId,
            tenantId: approvalRequest.tenantId,
            action: 'UPDATE',
            entity: 'ApprovalRequest',
            entityId: requestId,
            oldValues: { status: 'PENDING', currentLevel: approvalRequest.currentLevel },
            newValues: { status: 'APPROVED', resolvedBy: userId },
            request,
        });

        return updatedRequest;
    } else {
        // Advance to next level
        const nextLevel = allLevels.find(
            (l) => l.level > approvalRequest.currentLevel
        );

        if (!nextLevel) {
            throw new Error('Level selanjutnya tidak ditemukan');
        }

        const updatedRequest = await prisma.approvalRequest.update({
            where: { id: requestId },
            data: {
                currentLevel: nextLevel.level,
                resolvedBy: userId,
                resolvedAt: new Date(),
                comments: comments || null,
            },
        });

        void logAudit({
            userId,
            tenantId: approvalRequest.tenantId,
            action: 'UPDATE',
            entity: 'ApprovalRequest',
            entityId: requestId,
            oldValues: { currentLevel: approvalRequest.currentLevel },
            newValues: { currentLevel: nextLevel.level, resolvedBy: userId },
            request,
        });

        return updatedRequest;
    }
}

/**
 * 4. Reject a request at the current level.
 * Mark entity as REJECTED.
 */
export async function rejectRequest(params: {
    requestId: string;
    userId: string;
    userRole: string;
    comments?: string;
    request?: Request;
}) {
    const { requestId, userId, userRole, comments, request } = params;

    const approvalRequest = await prisma.approvalRequest.findUnique({
        where: { id: requestId },
    });

    if (!approvalRequest) {
        throw new Error('Approval request tidak ditemukan');
    }

    if (approvalRequest.status !== 'PENDING') {
        throw new Error('Approval request sudah tidak dalam status PENDING');
    }

    // Get current level config to check role
    const levelConfig = await prisma.approvalLevel.findFirst({
        where: {
            tenantId: approvalRequest.tenantId,
            entityType: approvalRequest.entityType,
            level: approvalRequest.currentLevel,
        },
    });

    if (levelConfig && !hasRequiredRole(userRole, levelConfig.requiredRole)) {
        throw new Error(
            `Anda tidak memiliki role yang cukup untuk reject level ini. Diperlukan: ${levelConfig.requiredRole}`
        );
    }

    const updatedRequest = await prisma.approvalRequest.update({
        where: { id: requestId },
        data: {
            status: 'REJECTED',
            resolvedBy: userId,
            resolvedAt: new Date(),
            comments: comments || null,
        },
    });

    // Update entity status to REJECTED
    await updateEntityStatus(
        approvalRequest.tenantId,
        approvalRequest.entityType,
        approvalRequest.entityId,
        'REJECTED'
    );

    void logAudit({
        userId,
        tenantId: approvalRequest.tenantId,
        action: 'UPDATE',
        entity: 'ApprovalRequest',
        entityId: requestId,
        oldValues: { status: 'PENDING' },
        newValues: { status: 'REJECTED', resolvedBy: userId },
        request,
    });

    return updatedRequest;
}

/**
 * 5. Get current approval status for an entity.
 */
export async function getRequestStatus(
    tenantId: string,
    entityType: string,
    entityId: string
) {
    const request = await prisma.approvalRequest.findFirst({
        where: {
            tenantId,
            entityType,
            entityId,
        },
        orderBy: { createdAt: 'desc' },
    });

    if (!request) {
        return null;
    }

    // Get level info
    const level = await prisma.approvalLevel.findFirst({
        where: {
            tenantId,
            entityType,
            level: request.currentLevel,
        },
    });

    return {
        ...request,
        levelName: level?.name || `Level ${request.currentLevel}`,
    };
}

/**
 * 6. Check if user can approve a specific request.
 */
export async function canUserApprove(
    requestId: string,
    userId: string,
    userRole: string
): Promise<{ allowed: boolean; reason?: string }> {
    const approvalRequest = await prisma.approvalRequest.findUnique({
        where: { id: requestId },
    });

    if (!approvalRequest) {
        return { allowed: false, reason: 'Approval request tidak ditemukan' };
    }

    if (approvalRequest.status !== 'PENDING') {
        return { allowed: false, reason: 'Approval request sudah tidak PENDING' };
    }

    // Get current level config
    const levelConfig = await prisma.approvalLevel.findFirst({
        where: {
            tenantId: approvalRequest.tenantId,
            entityType: approvalRequest.entityType,
            level: approvalRequest.currentLevel,
        },
    });

    if (!levelConfig) {
        return { allowed: false, reason: 'Konfigurasi level tidak ditemukan' };
    }

    if (!hasRequiredRole(userRole, levelConfig.requiredRole)) {
        return {
            allowed: false,
            reason: `Role minimum: ${levelConfig.requiredRole}`,
        };
    }

    return { allowed: true };
}

/**
 * Update entity status after approval/rejection.
 */
async function updateEntityStatus(
    tenantId: string,
    entityType: string,
    entityId: string,
    newStatus: string
) {
    // Map approval status to entity status
    const statusMap: Record<string, string> = {
        APPROVED: 'SENT', // Approved entities go to SENT status
        REJECTED: 'CANCELLED', // Rejected entities go to CANCELLED status
    };

    const entityStatus = statusMap[newStatus] || newStatus;

    switch (entityType) {
        case 'INVOICE':
            await prisma.invoice.updateMany({
                where: { id: entityId, tenantId },
                data: { status: entityStatus },
            });
            break;
        case 'PURCHASE_ORDER':
            await prisma.purchaseOrder.updateMany({
                where: { id: entityId, tenantId },
                data: { status: entityStatus },
            });
            break;
        case 'QUOTATION':
            await prisma.quotation.updateMany({
                where: { id: entityId, tenantId },
                data: { status: entityStatus },
            });
            break;
    }
}

/**
 * Get pending approval count for a user.
 */
export async function getPendingApprovalCount(
    tenantId: string,
    userRole: string
) {
    // Get all active approval levels where user's role meets requirement
    const levels = await prisma.approvalLevel.findMany({
        where: {
            tenantId,
            isActive: true,
        },
    });

    const eligibleEntityTypes = levels
        .filter((l) => hasRequiredRole(userRole, l.requiredRole))
        .map((l) => l.entityType);

    if (eligibleEntityTypes.length === 0) {
        return 0;
    }

    const count = await prisma.approvalRequest.count({
        where: {
            tenantId,
            status: 'PENDING',
            entityType: { in: eligibleEntityTypes },
        },
    });

    return count;
}
