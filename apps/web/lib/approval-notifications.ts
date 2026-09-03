// ============================================
// Approval Notification System
// Email notifications untuk approval workflow
// ============================================

import { prisma } from './db';
import { sendEmail } from './email';

const ENTITY_LABELS: Record<string, string> = {
    INVOICE: 'Invoice',
    PURCHASE_ORDER: 'Purchase Order',
    QUOTATION: 'Quotation',
};

/**
 * Format currency untuk email display.
 */
function formatAmount(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Get entity label berdasarkan entity type.
 */
function getEntityLabel(entityType: string): string {
    return ENTITY_LABELS[entityType] || entityType;
}

/**
 * Get entity display info (number + amount) dari database.
 */
async function getEntityInfo(
    tenantId: string,
    entityType: string,
    entityId: string
): Promise<{ display: string; amount: number | null }> {
    let display = entityId;
    let amount: number | null = null;

    if (entityType === 'INVOICE') {
        const inv = await prisma.invoice.findUnique({
            where: { id: entityId },
            select: { invoiceNumber: true, total: true },
        });
        if (inv) {
            display = inv.invoiceNumber;
            amount = Number(inv.total);
        }
    } else if (entityType === 'PURCHASE_ORDER') {
        const po = await prisma.purchaseOrder.findUnique({
            where: { id: entityId },
            select: { poNumber: true, total: true },
        });
        if (po) {
            display = po.poNumber;
            amount = Number(po.total);
        }
    } else if (entityType === 'QUOTATION') {
        const qt = await prisma.quotation.findUnique({
            where: { id: entityId },
            select: { quotationNumber: true, total: true },
        });
        if (qt) {
            display = qt.quotationNumber;
            amount = Number(qt.total);
        }
    }

    return { display, amount };
}

/**
 * Build HTML email table row.
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
 * Kirim email notifikasi ke approver saat ada approval request baru.
 */
export async function notifyApprover(
    approvalRequestId: string,
    approverId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const request = await prisma.approvalRequest.findUnique({
            where: { id: approvalRequestId },
        });

        if (!request) {
            return { success: false, error: 'Approval request tidak ditemukan' };
        }

        const approver = await prisma.user.findUnique({
            where: { id: approverId },
            select: { id: true, name: true, email: true },
        });

        if (!approver?.email) {
            return { success: false, error: 'Email approver tidak ditemukan' };
        }

        const requester = await prisma.user.findUnique({
            where: { id: request.requestedBy },
            select: { id: true, name: true },
        });

        const level = await prisma.approvalLevel.findFirst({
            where: {
                tenantId: request.tenantId,
                entityType: request.entityType,
                level: request.currentLevel,
            },
        });

        const tenant = await prisma.tenant.findUnique({
            where: { id: request.tenantId },
            select: { name: true },
        });

        const entityInfo = await getEntityInfo(request.tenantId, request.entityType, request.entityId);
        const entityLabel = getEntityLabel(request.entityType);
        const levelName = level?.name || ('Level ' + request.currentLevel);
        const companyName = tenant?.name || 'Qalcuity';
        const approverName = approver.name || 'Approver';
        const requesterName = requester?.name || 'Unknown';
        const dashboardUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000') + '/dashboard/settings/workflow';

        const amountRow = entityInfo.amount !== null
            ? tableRow('Total', formatAmount(entityInfo.amount), true)
            : '';

        const html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
            '<div style="background: linear-gradient(135deg, #3B82F6, #8B5CF6); padding: 24px; border-radius: 12px 12px 0 0;">' +
            '<h1 style="color: white; margin: 0; font-size: 20px;">Approval Diperlukan</h1>' +
            '<p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">' +
            companyName + ' — Approval Workflow</p>' +
            '</div>' +
            '<div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">' +
            '<p style="color: #334155; margin: 0 0 16px 0;">' +
            'Halo <strong>' + approverName + '</strong>,</p>' +
            '<p style="color: #334155; margin: 0 0 16px 0;">' +
            'Ada <strong>' + entityLabel + '</strong> yang memerlukan persetujuan Anda.</p>' +
            '<div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">' +
            '<table style="width: 100%; border-collapse: collapse;">' +
            tableRow('Jenis', entityLabel) +
            tableRow('Nomor', entityInfo.display) +
            amountRow +
            tableRow('Level Approval', levelName) +
            tableRow('Diajukan oleh', requesterName) +
            '</table></div>' +
            '<p style="color: #334155; margin: 16px 0; font-size: 14px;">' +
            'Silakan login ke dashboard untuk melakukan approval atau reject.</p>' +
            '<div style="text-align: center; margin: 24px 0;">' +
            '<a href="' + dashboardUrl + '" ' +
            'style="background: #3B82F6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">' +
            'Buka Dashboard</a></div>' +
            '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />' +
            '<p style="color: #94a3b8; font-size: 12px; margin: 0;">' +
            'Email ini dikirim otomatis oleh ' + companyName + '. Jika Anda tidak seharusnya menerima email ini, abaikan saja.</p>' +
            '</div></div>';

        const result = await sendEmail({
            to: approver.email,
            subject: '[Approval] ' + entityLabel + ' ' + entityInfo.display + ' — Menunggu Persetujuan Anda',
            html,
        });

        return result;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[ApprovalNotification] Gagal mengirim notifikasi ke approver:', message);
        return { success: false, error: message };
    }
}

/**
 * Kirim email notifikasi ke requester saat status approval berubah.
 */
export async function notifyRequester(
    approvalRequestId: string,
    status: 'APPROVED' | 'REJECTED' | 'NEW_LEVEL',
    comments?: string | null
): Promise<{ success: boolean; error?: string }> {
    try {
        const request = await prisma.approvalRequest.findUnique({
            where: { id: approvalRequestId },
        });

        if (!request) {
            return { success: false, error: 'Approval request tidak ditemukan' };
        }

        const requester = await prisma.user.findUnique({
            where: { id: request.requestedBy },
            select: { id: true, name: true, email: true },
        });

        if (!requester?.email) {
            return { success: false, error: 'Email requester tidak ditemukan' };
        }

        let resolverName = 'System';
        if (request.resolvedBy) {
            const resolver = await prisma.user.findUnique({
                where: { id: request.resolvedBy },
                select: { name: true },
            });
            resolverName = resolver?.name || 'Approver';
        }

        const level = await prisma.approvalLevel.findFirst({
            where: {
                tenantId: request.tenantId,
                entityType: request.entityType,
                level: request.currentLevel,
            },
        });

        const tenant = await prisma.tenant.findUnique({
            where: { id: request.tenantId },
            select: { name: true },
        });

        const entityInfo = await getEntityInfo(request.tenantId, request.entityType, request.entityId);
        const entityLabel = getEntityLabel(request.entityType);
        const companyName = tenant?.name || 'Qalcuity';
        const levelName = level?.name || ('Level ' + request.currentLevel);
        const requesterName = requester.name || 'User';
        const dashboardUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000') + '/dashboard/settings/workflow';

        // Status config
        const statusConfig: Record<string, { color: string; label: string; icon: string }> = {
            APPROVED: { color: '#16a34a', label: 'Disetujui', icon: '✅' },
            REJECTED: { color: '#dc2626', label: 'Ditolak', icon: '❌' },
            NEW_LEVEL: { color: '#d97706', label: 'Diproses ke Level Berikutnya', icon: '⏳' },
        };

        const config = statusConfig[status] || statusConfig.NEW_LEVEL;

        const amountRow = entityInfo.amount !== null
            ? tableRow('Total', formatAmount(entityInfo.amount), true)
            : '';

        const commentsBlock = comments
            ? '<div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px; margin: 16px 0;">' +
            '<p style="color: #92400e; font-size: 13px; margin: 0;"><strong>Komentar:</strong> ' + comments + '</p></div>'
            : '';

        const html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
            '<div style="background: ' + config.color + '; padding: 24px; border-radius: 12px 12px 0 0;">' +
            '<h1 style="color: white; margin: 0; font-size: 20px;">' +
            config.icon + ' ' + entityLabel + ' ' + config.label + '</h1>' +
            '<p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">' +
            companyName + ' — Approval Workflow</p>' +
            '</div>' +
            '<div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">' +
            '<p style="color: #334155; margin: 0 0 16px 0;">' +
            'Halo <strong>' + requesterName + '</strong>,</p>' +
            '<p style="color: #334155; margin: 0 0 16px 0;">' +
            entityLabel + ' <strong>' + entityInfo.display + '</strong> telah ' +
            '<span style="color: ' + config.color + '; font-weight: 700;">' + config.label.toLowerCase() + '</span> ' +
            'oleh <strong>' + resolverName + '</strong>.</p>' +
            '<div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">' +
            '<table style="width: 100%; border-collapse: collapse;">' +
            tableRow('Status', '<span style="color: ' + config.color + '; font-weight: 700;">' + config.label + '</span>') +
            tableRow('Level', levelName) +
            amountRow +
            tableRow('Diproses oleh', resolverName) +
            '</table></div>' +
            commentsBlock +
            '<p style="color: #334155; margin: 16px 0; font-size: 14px;">' +
            'Silakan login ke dashboard untuk melihat detail.</p>' +
            '<div style="text-align: center; margin: 24px 0;">' +
            '<a href="' + dashboardUrl + '" ' +
            'style="background: #3B82F6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">' +
            'Buka Dashboard</a></div>' +
            '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />' +
            '<p style="color: #94a3b8; font-size: 12px; margin: 0;">' +
            'Email ini dikirim otomatis oleh ' + companyName + '. Jika Anda tidak seharusnya menerima email ini, abaikan saja.</p>' +
            '</div></div>';

        const result = await sendEmail({
            to: requester.email,
            subject: '[Approval] ' + entityLabel + ' ' + entityInfo.display + ' — ' + config.label,
            html,
        });

        return result;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[ApprovalNotification] Gagal mengirim notifikasi ke requester:', message);
        return { success: false, error: message };
    }
}

/**
 * Kirim email notifikasi ke approver berikutnya saat request lanjut ke level berikutnya.
 */
export async function notifyNextLevelApprover(
    approvalRequestId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const request = await prisma.approvalRequest.findUnique({
            where: { id: approvalRequestId },
        });

        if (!request) {
            return { success: false, error: 'Approval request tidak ditemukan' };
        }

        const levelConfig = await prisma.approvalLevel.findFirst({
            where: {
                tenantId: request.tenantId,
                entityType: request.entityType,
                level: request.currentLevel,
                isActive: true,
            },
        });

        if (!levelConfig) {
            return { success: false, error: 'Konfigurasi level tidak ditemukan' };
        }

        const ROLE_HIERARCHY: Record<string, number> = {
            VIEWER: 0,
            MEMBER: 1,
            ADMIN: 2,
            SUPERADMIN: 3,
        };

        const requiredLevel = ROLE_HIERARCHY[levelConfig.requiredRole] ?? 0;

        const eligibleUsers = await prisma.user.findMany({
            where: {
                tenantId: request.tenantId,
                isActive: true,
                role: {
                    in: Object.entries(ROLE_HIERARCHY)
                        .filter(([, level]) => level >= requiredLevel)
                        .map(([role]) => role),
                },
            },
            select: { id: true, name: true, email: true },
        });

        const results = await Promise.allSettled(
            eligibleUsers.map((user) =>
                notifyApprover(approvalRequestId, user.id)
            )
        );

        const failures = results.filter(
            (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
        );

        if (failures.length > 0) {
            console.warn(
                '[ApprovalNotification] ' + failures.length + ' dari ' + eligibleUsers.length + ' notifikasi gagal dikirim'
            );
        }

        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[ApprovalNotification] Gagal mengirim notifikasi ke approver berikutnya:', message);
        return { success: false, error: message };
    }
}
