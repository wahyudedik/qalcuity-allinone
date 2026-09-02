import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermissionForRoute } from '@/lib/session'
import { logAudit } from '@/lib/audit'

/**
 * GET /api/settings/profile/export
 *
 * Export all user data as JSON for download (GDPR / UU PDP compliance).
 * Returns user profile, company info, and summary of related data.
 */
export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
        const { userId, tenantId } = auth

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                lastLoginAt: true,
            },
        })

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User tidak ditemukan' },
                { status: 404 }
            )
        }

        // Fetch company info
        const company = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                address: true,
                website: true,
                createdAt: true,
            },
        })

        // Count related data (summary only, not full data for export)
        const [
            invoiceCount,
            contactCount,
            leadCount,
            dealCount,
            productCount,
            employeeCount,
            attendanceCount,
            payrollCount,
            leaveCount,
        ] = await Promise.all([
            prisma.invoice.count({ where: { tenantId } }),
            prisma.contact.count({ where: { tenantId } }),
            prisma.lead.count({ where: { tenantId } }),
            prisma.deal.count({ where: { tenantId } }),
            prisma.product.count({ where: { tenantId } }),
            prisma.employee.count({ where: { tenantId } }),
            prisma.attendanceRecord.count({ where: { tenantId } }),
            prisma.payrollRecord.count({ where: { tenantId } }),
            prisma.leaveRequest.count({ where: { tenantId } }),
        ])

        const exportData = {
            exportDate: new Date().toISOString(),
            exportVersion: '1.0',
            user: {
                ...user,
                createdAt: user.createdAt.toISOString(),
                updatedAt: user.updatedAt.toISOString(),
                lastLoginAt: user.lastLoginAt?.toISOString() || null,
            },
            company: company
                ? {
                    ...company,
                    createdAt: company.createdAt.toISOString(),
                }
                : null,
            dataSummary: {
                invoices: invoiceCount,
                contacts: contactCount,
                leads: leadCount,
                deals: dealCount,
                products: productCount,
                employees: employeeCount,
                attendanceRecords: attendanceCount,
                payrollRecords: payrollCount,
                leaveRequests: leaveCount,
            },
            note: 'Ini adalah export data profil Anda. Data lengkap dapat diminta melalui support@qalcuity.com sesuai dengan UU Perlindungan Data Pribadi.',
        }

        // Audit log
        void logAudit({
            userId,
            tenantId,
            action: 'EXPORT',
            entity: 'User',
            entityId: userId,
            newValues: { exportType: 'profile_data' },
        })

        // Return as downloadable JSON
        return new NextResponse(JSON.stringify(exportData, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="qalcuity-data-export-${new Date().toISOString().split('T')[0]}.json"`,
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
