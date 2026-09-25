// ============================================
// Approval Escalation Mechanism
// Handles stale approval requests by sending
// reminders, escalating to superiors, and
// notifying admins when SLA thresholds are breached.
// ============================================

import { prisma } from './db';
import { logAudit } from './audit';
import { sendEmail } from './email';
import { getBaseUrl } from './utils';
import { logger } from '@/lib/logger';
import { notifyNewNotification } from '@/lib/notification-pubsub';
import type { CronTaskResult } from '@/lib/cron-scheduler';

// ============================================
// Types
// ============================================

export interface EscalationSLAConfig {
    /** Hours before sending reminder to approver */
    reminderHours: number;
    /** Hours before escalating to superior */
    escalateHours: number;
    /** Hours before notifying admin (max escalation) */
    adminNotifyHours: number;
}

export interface EscalationResult {
    processed: number;
    remindersSent: number;
    escalated: number;
    adminNotified: number;
    errors: number;
}

// ============================================
// Default SLA Configuration
// ============================================

const DEFAULT_SLA_CONFIG: EscalationSLAConfig = {
    reminderHours: 24,    // Reminder after 24 hours
    escalateHours: 48,    // Escalate to superior after 48 hours
    adminNotifyHours: 72, // Notify admin after 72 hours
};

// ============================================
// SLA Configuration (per-tenant, from tenant.settings)
// ============================================

/**
 * Get escalation SLA configuration for a tenant.
 * Uses tenant.settings.escalationSLA if available, otherwise defaults.
 */
async function getEscalationSLA(tenantId: string): Promise<EscalationSLAConfig> {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { settings: true },
        });

        if (!tenant?.settings) {
            return DEFAULT_SLA_CONFIG;
        }

        const settings = tenant.settings as Record<string, unknown>;
        const escalationSLA = settings.escalationSLA as Record<string, unknown> | undefined;

        if (!escalationSLA) {
            return DEFAULT_SLA_CONFIG;
        }

        return {
            reminderHours: Number(escalationSLA.reminderHours) || DEFAULT_SLA_CONFIG.reminderHours,
            escalateHours: Number(escalationSLA.escalateHours) || DEFAULT_SLA_CONFIG.escalateHours,
            adminNotifyHours: Number(escalationSLA.adminNotifyHours) || DEFAULT_SLA_CONFIG.adminNotifyHours,
        };
    } catch {
        return DEFAULT_SLA_CONFIG;
    }
}

// ============================================
// Entity Info Helpers
// ============================================

const ENTITY_LABELS: Record<string, string> = {
    INVOICE: 'Invoice',
    PURCHASE_ORDER: 'Purchase Order',
    QUOTATION: 'Quotation',
};

function getEntityLabel(entityType: string): string {
    return ENTITY_LABELS[entityType] || entityType;
}

function formatAmount(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

async function getEntityInfo(
    tenantId: string,
    entityType: string,
    entityId: string
): Promise<{ display: string; amount: number | null }> {
    let display = entityId;
    let amount: number | null = null;

    if (entityType === 'INVOICE') {
        const inv = await prisma.invoice.findFirst({
            where: { id: entityId, tenantId },
            select: { invoiceNumber: true, total: true },
        });
        if (inv) {
            display = inv.invoiceNumber;
            amount = Number(inv.total);
        }
    } else if (entityType === 'PURCHASE_ORDER') {
        const po = await prisma.purchaseOrder.findFirst({
            where: { id: entityId, tenantId },
            select: { poNumber: true, total: true },
        });
        if (po) {
            display = po.poNumber;
            amount = Number(po.total);
        }
    } else if (entityType === 'QUOTATION') {
        const qt = await prisma.quotation.findFirst({
            where: { id: entityId, tenantId },
            select: { quotationNumber: true, total: true },
        });
        if (qt) {
            display = qt.quotationNumber;
            amount = Number(qt.total);
        }
    }

    return { display, amount };
}

// ============================================
// Notification Helpers
// ============================================

/**
 * Build HTML table row for email.
 */
function tableRow(label: string, value: string, bold = false): string {
    const valueStyle = bold
        ? 'padding: 8px; border: 1px solid #ddd; font-weight: 700; font-size: 16px;'
        : 'padding: 8px; border: 1px solid #ddd; font-weight: 600; font-size: 14px;';
    return '<tr>' +
        '<td style="padding: 8px; border: 1px solid #ddd; color: #64748b; font-size: 14px;">' + label + '</td>' +
        '<td style="' + valueStyle + '">' + value + '</td>' +
        '</tr>';
}

/**
 * Send reminder email to the current approver.
 */
async function sendReminderEmail(params: {
    tenantId: string;
    approverId: string;
    approverName: string;
    approverEmail: string;
    entityType: string;
    entityId: string;
    hoursStale: number;
    levelName: string;
}): Promise<boolean> {
    try {
        const { tenantId, approverEmail, approverName, entityType, entityId, hoursStale, levelName } = params;
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true },
        });
        const entityInfo = await getEntityInfo(tenantId, entityType, entityId);
        const entityLabel = getEntityLabel(entityType);
        const companyName = tenant?.name || 'Qalcuity';
        const dashboardUrl = getBaseUrl() + '/dashboard/settings/workflow';

        const amountRow = entityInfo.amount !== null
            ? tableRow('Total', formatAmount(entityInfo.amount), true)
            : '';

        const html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
            '<div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 24px; border-radius: 12px 12px 0 0;">' +
            '<h1 style="color: white; margin: 0; font-size: 20px;">⏰ Reminder: Approval Menunggu</h1>' +
            '<p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">' +
            companyName + ' — Approval Workflow</p>' +
            '</div>' +
            '<div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">' +
            '<p style="color: #334155; margin: 0 0 16px 0;">' +
            'Halo <strong>' + approverName + '</strong>,</p>' +
            '<p style="color: #334155; margin: 0 0 16px 0;">' +
            'Ini adalah pengingat bahwa <strong>' + entityLabel + '</strong> masih menunggu persetujuan Anda selama <strong>' + hoursStale + ' jam</strong>.</p>' +
            '<div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">' +
            '<table style="width: 100%; border-collapse: collapse;">' +
            tableRow('Jenis', entityLabel) +
            tableRow('Nomor', entityInfo.display) +
            amountRow +
            tableRow('Level Approval', levelName) +
            tableRow('Menunggu selama', hoursStale + ' jam') +
            '</table></div>' +
            '<p style="color: #334155; margin: 16px 0; font-size: 14px;">' +
            'Silakan segera melakukan approval atau reject untuk menghindari eskalasi ke atasan Anda.</p>' +
            '<div style="text-align: center; margin: 24px 0;">' +
            '<a href="' + dashboardUrl + '" ' +
            'style="background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">' +
            'Buka Dashboard</a></div>' +
            '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />' +
            '<p style="color: #94a3b8; font-size: 12px; margin: 0;">' +
            'Email ini dikirim otomatis oleh ' + companyName + '. Jika Anda tidak seharusnya menerima email ini, abaikan saja.</p>' +
            '</div></div>';

        const result = await sendEmail({
            to: approverEmail,
            subject: '[Reminder] ' + entityLabel + ' ' + entityInfo.display + ' — Menunggu Persetujuan Anda (' + hoursStale + ' jam)',
            html,
        });

        return result.success;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[ApprovalEscalation] Gagal mengirim reminder email', error, { detail: message });
        return false;
    }
}

/**
 * Send escalation email to superior.
 */
async function sendEscalationEmail(params: {
    tenantId: string;
    superiorId: string;
    superiorName: string;
    superiorEmail: string;
    originalApproverName: string;
    entityType: string;
    entityId: string;
    hoursStale: number;
    levelName: string;
}): Promise<boolean> {
    try {
        const { tenantId, superiorEmail, superiorName, originalApproverName, entityType, entityId, hoursStale, levelName } = params;
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true },
        });
        const entityInfo = await getEntityInfo(tenantId, entityType, entityId);
        const entityLabel = getEntityLabel(entityType);
        const companyName = tenant?.name || 'Qalcuity';
        const dashboardUrl = getBaseUrl() + '/dashboard/settings/workflow';

        const amountRow = entityInfo.amount !== null
            ? tableRow('Total', formatAmount(entityInfo.amount), true)
            : '';

        const html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
            '<div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 24px; border-radius: 12px 12px 0 0;">' +
            '<h1 style="color: white; margin: 0; font-size: 20px;">🔔 Eskalasi: Approval Stale</h1>' +
            '<p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">' +
            companyName + ' — Approval Workflow</p>' +
            '</div>' +
            '<div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">' +
            '<p style="color: #334155; margin: 0 0 16px 0;">' +
            'Halo <strong>' + superiorName + '</strong>,</p>' +
            '<p style="color: #334155; margin: 0 0 16px 0;">' +
            'Approval untuk <strong>' + entityLabel + '</strong> telah di eskalasi kepada Anda karena ' +
            '<strong>' + originalApproverName + '</strong> belum merespon selama <strong>' + hoursStale + ' jam</strong>.</p>' +
            '<div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">' +
            '<table style="width: 100%; border-collapse: collapse;">' +
            tableRow('Jenis', entityLabel) +
            tableRow('Nomor', entityInfo.display) +
            amountRow +
            tableRow('Level Approval', levelName) +
            tableRow('Dieskalasi dari', originalApproverName) +
            tableRow('Menunggu selama', hoursStale + ' jam') +
            '</table></div>' +
            '<p style="color: #334155; margin: 16px 0; font-size: 14px;">' +
            'Silakan login ke dashboard untuk melakukan approval atau reject.</p>' +
            '<div style="text-align: center; margin: 24px 0;">' +
            '<a href="' + dashboardUrl + '" ' +
            'style="background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">' +
            'Buka Dashboard</a></div>' +
            '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />' +
            '<p style="color: #94a3b8; font-size: 12px; margin: 0;">' +
            'Email ini dikirim otomatis oleh ' + companyName + '. Jika Anda tidak seharusnya menerima email ini, abaikan saja.</p>' +
            '</div></div>';

        const result = await sendEmail({
            to: superiorEmail,
            subject: '[Eskalasi] ' + entityLabel + ' ' + entityInfo.display + ' — Approval Stale (' + hoursStale + ' jam)',
            html,
        });

        return result.success;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[ApprovalEscalation] Gagal mengirim eskalasi email', error, { detail: message });
        return false;
    }
}

/**
 * Send admin notification email.
 */
async function sendAdminNotificationEmail(params: {
    tenantId: string;
    adminId: string;
    adminName: string;
    adminEmail: string;
    entityType: string;
    entityId: string;
    hoursStale: number;
    levelName: string;
}): Promise<boolean> {
    try {
        const { tenantId, adminEmail, adminName, entityType, entityId, hoursStale, levelName } = params;
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true },
        });
        const entityInfo = await getEntityInfo(tenantId, entityType, entityId);
        const entityLabel = getEntityLabel(entityType);
        const companyName = tenant?.name || 'Qalcuity';
        const dashboardUrl = getBaseUrl() + '/dashboard/settings/workflow';

        const amountRow = entityInfo.amount !== null
            ? tableRow('Total', formatAmount(entityInfo.amount), true)
            : '';

        const html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
            '<div style="background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 24px; border-radius: 12px 12px 0 0;">' +
            '<h1 style="color: white; margin: 0; font-size: 20px;">🚨 Perlu Perhatian: Approval Stale</h1>' +
            '<p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">' +
            companyName + ' — Admin Notification</p>' +
            '</div>' +
            '<div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">' +
            '<p style="color: #334155; margin: 0 0 16px 0;">' +
            'Halo <strong>' + adminName + '</strong>,</p>' +
            '<p style="color: #334155; margin: 0 0 16px 0;">' +
            'Sebuah approval request untuk <strong>' + entityLabel + '</strong> telah melewati batas SLA dan belum ditangani oleh approver manapun selama <strong>' + hoursStale + ' jam</strong>.</p>' +
            '<div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">' +
            '<table style="width: 100%; border-collapse: collapse;">' +
            tableRow('Jenis', entityLabel) +
            tableRow('Nomor', entityInfo.display) +
            amountRow +
            tableRow('Level Approval', levelName) +
            tableRow('Menunggu selama', hoursStale + ' jam') +
            tableRow('Status', 'Belum ditangani') +
            '</table></div>' +
            '<p style="color: #334155; margin: 16px 0; font-size: 14px;">' +
            'Silakan login ke dashboard untuk menangani approval ini atau hubungi approver yang bersangkutan.</p>' +
            '<div style="text-align: center; margin: 24px 0;">' +
            '<a href="' + dashboardUrl + '" ' +
            'style="background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">' +
            'Buka Dashboard</a></div>' +
            '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />' +
            '<p style="color: #94a3b8; font-size: 12px; margin: 0;">' +
            'Email ini dikirim otomatis oleh ' + companyName + '. Jika Anda tidak seharusnya menerima email ini, abaikan saja.</p>' +
            '</div></div>';

        const result = await sendEmail({
            to: adminEmail,
            subject: '[Admin] ' + entityLabel + ' ' + entityInfo.display + ' — Approval Stale (' + hoursStale + ' jam)',
            html,
        });

        return result.success;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[ApprovalEscalation] Gagal mengirim admin notification email', error, { detail: message });
        return false;
    }
}

/**
 * Create in-app notification for escalation.
 */
async function createInAppNotification(params: {
    tenantId: string;
    userId: string;
    title: string;
    message: string;
    link: string;
    type: string;
}): Promise<void> {
    try {
        const { tenantId, userId, title, message, link, type } = params;

        await prisma.inAppNotification.create({
            data: {
                tenantId,
                userId,
                type,
                title,
                message,
                link,
            },
        });

        notifyNewNotification(tenantId, {
            id: `escalation_${Date.now()}`,
            title,
            type,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[ApprovalEscalation] Gagal membuat in-app notification', error, { detail: message });
    }
}

// ============================================
// Superior Finder
// ============================================

/**
 * Find the superior of a user based on role hierarchy.
 * Returns null if no superior exists.
 */
async function findSuperior(
    tenantId: string,
    currentApproverRole: string
): Promise<{ id: string; name: string; email: string } | null> {
    const ROLE_HIERARCHY: Record<string, number> = {
        VIEWER: 0,
        MEMBER: 1,
        ADMIN: 2,
        SUPERADMIN: 3,
    };

    const currentLevel = ROLE_HIERARCHY[currentApproverRole] ?? 0;

    // Find users with a higher role
    const superiorRoles = Object.entries(ROLE_HIERARCHY)
        .filter(([, level]) => level > currentLevel)
        .map(([role]) => role);

    if (superiorRoles.length === 0) {
        return null;
    }

    // Prefer the next-higher role first
    const nextLevel = currentLevel + 1;
    const preferredRole = Object.entries(ROLE_HIERARCHY)
        .find(([, level]) => level === nextLevel)?.[0];

    if (preferredRole) {
        const superior = await prisma.user.findFirst({
            where: {
                tenantId,
                role: preferredRole,
                isActive: true,
            },
            select: { id: true, name: true, email: true },
        });

        if (superior?.email) {
            return superior;
        }
    }

    // Fallback: any higher role
    const superior = await prisma.user.findFirst({
        where: {
            tenantId,
            role: { in: superiorRoles },
            isActive: true,
        },
        select: { id: true, name: true, email: true },
    });

    if (superior?.email) {
        return superior;
    }

    return null;
}

// ============================================
// Main Escalation Handler
// ============================================

/**
 * Process a single stale approval request.
 * Returns the escalation action taken (if any).
 */
async function processStaleRequest(
    request: {
        id: string;
        tenantId: string;
        entityType: string;
        entityId: string;
        currentLevel: number;
        requestedBy: string;
        createdAt: Date;
    },
    slaConfig: EscalationSLAConfig,
    now: Date
): Promise<'reminder' | 'escalated' | 'admin_notified' | null> {
    const hoursSinceCreation = (now.getTime() - request.createdAt.getTime()) / (1000 * 60 * 60);

    // Get the approval level config
    const levelConfig = await prisma.approvalLevel.findFirst({
        where: {
            tenantId: request.tenantId,
            entityType: request.entityType,
            level: request.currentLevel,
        },
    });

    const levelName = levelConfig?.name || `Level ${request.currentLevel}`;
    const requiredRole = levelConfig?.requiredRole || 'ADMIN';

    // Find eligible approvers for this level
    const ROLE_HIERARCHY: Record<string, number> = {
        VIEWER: 0,
        MEMBER: 1,
        ADMIN: 2,
        SUPERADMIN: 3,
    };

    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
    const eligibleRoles = Object.entries(ROLE_HIERARCHY)
        .filter(([, level]) => level >= requiredLevel)
        .map(([role]) => role);

    const eligibleApprovers = await prisma.user.findMany({
        where: {
            tenantId: request.tenantId,
            role: { in: eligibleRoles },
            isActive: true,
        },
        select: { id: true, name: true, email: true, role: true },
    });

    if (eligibleApprovers.length === 0) {
        return null;
    }

    // ─── Level 3: Admin Notification (72+ hours) ─────────────────────
    if (hoursSinceCreation >= slaConfig.adminNotifyHours) {
        // Find admin users
        const admins = await prisma.user.findMany({
            where: {
                tenantId: request.tenantId,
                role: { in: ['ADMIN', 'SUPERADMIN'] },
                isActive: true,
            },
            select: { id: true, name: true, email: true },
        });

        const hoursStale = Math.floor(hoursSinceCreation);
        let adminNotified = 0;

        for (const admin of admins) {
            if (!admin.email) continue;

            const success = await sendAdminNotificationEmail({
                tenantId: request.tenantId,
                adminId: admin.id,
                adminName: admin.name || 'Admin',
                adminEmail: admin.email,
                entityType: request.entityType,
                entityId: request.entityId,
                hoursStale,
                levelName,
            });

            if (success) {
                adminNotified++;
            }

            // Create in-app notification
            const entityInfo = await getEntityInfo(request.tenantId, request.entityType, request.entityId);
            const entityLabel = getEntityLabel(request.entityType);

            await createInAppNotification({
                tenantId: request.tenantId,
                userId: admin.id,
                title: `[Admin] Approval Stale: ${entityLabel} ${entityInfo.display}`,
                message: `Approval ${entityLabel} ${entityInfo.display} telah menunggu ${hoursStale} jam dan belum ditangani.`,
                link: `/dashboard/settings/workflow`,
                type: 'approval_escalation_admin',
            });
        }

        void logAudit({
            userId: 'system',
            tenantId: request.tenantId,
            action: 'UPDATE',
            entity: 'ApprovalRequest',
            entityId: request.id,
            oldValues: { escalationLevel: 'escalated_to_admin' },
            newValues: {
                escalationAction: 'admin_notified',
                hoursStale,
                adminNotified,
            },
        });

        return 'admin_notified';
    }

    // ─── Level 2: Escalate to Superior (48+ hours) ───────────────────
    if (hoursSinceCreation >= slaConfig.escalateHours) {
        // Pick the first approver as the one to escalate from
        const primaryApprover = eligibleApprovers[0];
        const superior = await findSuperior(request.tenantId, primaryApprover.role);

        if (superior?.email) {
            const hoursStale = Math.floor(hoursSinceCreation);

            const success = await sendEscalationEmail({
                tenantId: request.tenantId,
                superiorId: superior.id,
                superiorName: superior.name || 'Superior',
                superiorEmail: superior.email,
                originalApproverName: primaryApprover.name || 'Approver',
                entityType: request.entityType,
                entityId: request.entityId,
                hoursStale,
                levelName,
            });

            // Create in-app notification for superior
            const entityInfo = await getEntityInfo(request.tenantId, request.entityType, request.entityId);
            const entityLabel = getEntityLabel(request.entityType);

            await createInAppNotification({
                tenantId: request.tenantId,
                userId: superior.id,
                title: `[Eskalasi] Approval Stale: ${entityLabel} ${entityInfo.display}`,
                message: `Approval ${entityLabel} ${entityInfo.display} telah di eskalasi kepada Anda karena ${primaryApprover.name || 'approver'} belum merespon selama ${hoursStale} jam.`,
                link: `/dashboard/settings/workflow`,
                type: 'approval_escalation',
            });

            void logAudit({
                userId: 'system',
                tenantId: request.tenantId,
                action: 'UPDATE',
                entity: 'ApprovalRequest',
                entityId: request.id,
                oldValues: { escalationLevel: 'escalated_to_superior' },
                newValues: {
                    escalationAction: 'escalated',
                    hoursStale,
                    escalatedFrom: primaryApprover.id,
                    escalatedTo: superior.id,
                    superiorName: superior.name,
                },
            });

            return 'escalated';
        }
    }

    // ─── Level 1: Reminder (24+ hours) ───────────────────────────────
    if (hoursSinceCreation >= slaConfig.reminderHours) {
        const hoursStale = Math.floor(hoursSinceCreation);
        let remindersSent = 0;

        for (const approver of eligibleApprovers) {
            if (!approver.email) continue;

            const success = await sendReminderEmail({
                tenantId: request.tenantId,
                approverId: approver.id,
                approverName: approver.name || 'Approver',
                approverEmail: approver.email,
                entityType: request.entityType,
                entityId: request.entityId,
                hoursStale,
                levelName,
            });

            if (success) {
                remindersSent++;
            }

            // Create in-app notification
            const entityInfo = await getEntityInfo(request.tenantId, request.entityType, request.entityId);
            const entityLabel = getEntityLabel(request.entityType);

            await createInAppNotification({
                tenantId: request.tenantId,
                userId: approver.id,
                title: `[Reminder] Approval Menunggu: ${entityLabel} ${entityInfo.display}`,
                message: `Approval ${entityLabel} ${entityInfo.display} masih menunggu persetujuan Anda selama ${hoursStale} jam.`,
                link: `/dashboard/settings/workflow`,
                type: 'approval_reminder',
            });
        }

        void logAudit({
            userId: 'system',
            tenantId: request.tenantId,
            action: 'UPDATE',
            entity: 'ApprovalRequest',
            entityId: request.id,
            oldValues: { escalationLevel: 'reminder' },
            newValues: {
                escalationAction: 'reminder',
                hoursStale,
                remindersSent,
            },
        });

        return 'reminder';
    }

    return null;
}

// ============================================
// Cron Handler (exported for cron dispatcher)
// ============================================

/**
 * Main cron handler: check all stale approval requests across all tenants
 * and apply escalation logic.
 */
export async function runApprovalEscalation(): Promise<CronTaskResult> {
    logger.info('[ApprovalEscalation] Starting escalation scan...');

    const now = new Date();
    const totalResult: EscalationResult = {
        processed: 0,
        remindersSent: 0,
        escalated: 0,
        adminNotified: 0,
        errors: 0,
    };

    try {
        // Find all PENDING approval requests
        const pendingRequests = await prisma.approvalRequest.findMany({
            where: {
                status: 'PENDING',
            },
            select: {
                id: true,
                tenantId: true,
                entityType: true,
                entityId: true,
                currentLevel: true,
                requestedBy: true,
                createdAt: true,
            },
        });

        if (pendingRequests.length === 0) {
            return {
                success: true,
                message: 'No pending approval requests found',
                data: { ...totalResult },
            };
        }

        // Group by tenant to get SLA config per tenant
        const tenantIds = [...new Set(pendingRequests.map((r) => r.tenantId))];

        for (const tenantId of tenantIds) {
            const slaConfig = await getEscalationSLA(tenantId);
            const tenantRequests = pendingRequests.filter((r) => r.tenantId === tenantId);

            for (const request of tenantRequests) {
                try {
                    totalResult.processed++;
                    const action = await processStaleRequest(request, slaConfig, now);

                    if (action === 'reminder') {
                        totalResult.remindersSent++;
                    } else if (action === 'escalated') {
                        totalResult.escalated++;
                    } else if (action === 'admin_notified') {
                        totalResult.adminNotified++;
                    }
                } catch (error) {
                    totalResult.errors++;
                    const message = error instanceof Error ? error.message : 'Unknown error';
                    logger.error('[ApprovalEscalation] Error processing request', error, {
                        requestId: request.id,
                        detail: message,
                    });
                }
            }
        }

        const summary = [
            `Processed: ${totalResult.processed}`,
            `Reminders: ${totalResult.remindersSent}`,
            `Escalated: ${totalResult.escalated}`,
            `Admin Notified: ${totalResult.adminNotified}`,
            `Errors: ${totalResult.errors}`,
        ].join(', ');

        logger.info('[ApprovalEscalation] Scan completed', { ...totalResult });

        return {
            success: true,
            message: `Approval escalation scan completed. ${summary}`,
            data: { ...totalResult },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[ApprovalEscalation] Fatal error during escalation scan', error, { detail: message });

        return {
            success: false,
            message: `Approval escalation scan failed: ${message}`,
            data: { ...totalResult },
        };
    }
}
