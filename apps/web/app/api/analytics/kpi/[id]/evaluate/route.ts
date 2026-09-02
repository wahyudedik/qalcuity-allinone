// ============================================
// KPI Evaluate API — POST
// Evaluate KPI current value against target
// ============================================

import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'
import { getKPIStatus } from '@qalcuity/analytics'

// ============================================
// HELPERS
// ============================================

function toNumber(val: unknown): number {
    if (val === null || val === undefined) return 0
    if (typeof val === 'number') return val
    if (typeof val === 'string') return parseFloat(val) || 0
    if (typeof val === 'object' && val !== null && 'toNumber' in val) {
        return (val as { toNumber: () => number }).toNumber()
    }
    return 0
}

function getCurrentPeriodKey(period: string): string {
    const now = new Date()
    switch (period) {
        case 'daily':
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        case 'weekly': {
            const startOfWeek = new Date(now)
            startOfWeek.setDate(now.getDate() - now.getDay())
            return `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`
        }
        case 'quarterly':
            return `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`
        case 'yearly':
            return `${now.getFullYear()}`
        case 'monthly':
        default:
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }
}

// ============================================
// METRIC VALUE CALCULATORS
// ============================================

async function calculateMetricValue(
    metricId: string,
    tenantId: string,
    dateFrom: Date,
    dateTo: Date
): Promise<number> {
    switch (metricId) {
        case 'revenue': {
            const result = await prisma.invoice.aggregate({
                where: {
                    tenantId,
                    status: { notIn: ['CANCELLED'] },
                    createdAt: { gte: dateFrom, lte: dateTo },
                },
                _sum: { total: true },
            })
            return toNumber(result._sum.total)
        }

        case 'total_expenses': {
            const result = await prisma.payment.aggregate({
                where: {
                    tenantId,
                    type: 'EXPENSE',
                    status: 'COMPLETED',
                    paymentDate: { gte: dateFrom, lte: dateTo },
                },
                _sum: { amount: true },
            })
            return toNumber(result._sum.amount)
        }

        case 'net_income': {
            const [revenueResult, expenseResult] = await Promise.all([
                prisma.invoice.aggregate({
                    where: {
                        tenantId,
                        status: { notIn: ['CANCELLED'] },
                        createdAt: { gte: dateFrom, lte: dateTo },
                    },
                    _sum: { total: true },
                }),
                prisma.payment.aggregate({
                    where: {
                        tenantId,
                        type: 'EXPENSE',
                        status: 'COMPLETED',
                        paymentDate: { gte: dateFrom, lte: dateTo },
                    },
                    _sum: { amount: true },
                }),
            ])
            return toNumber(revenueResult._sum.total) - toNumber(expenseResult._sum.amount)
        }

        case 'cash_flow': {
            const [incomeResult, expenseResult] = await Promise.all([
                prisma.payment.aggregate({
                    where: {
                        tenantId,
                        type: 'INCOME',
                        status: 'COMPLETED',
                        paymentDate: { gte: dateFrom, lte: dateTo },
                    },
                    _sum: { amount: true },
                }),
                prisma.payment.aggregate({
                    where: {
                        tenantId,
                        type: 'EXPENSE',
                        status: 'COMPLETED',
                        paymentDate: { gte: dateFrom, lte: dateTo },
                    },
                    _sum: { amount: true },
                }),
            ])
            return toNumber(incomeResult._sum.amount) - toNumber(expenseResult._sum.amount)
        }

        case 'gross_profit': {
            const [revenueResult, invoiceItems] = await Promise.all([
                prisma.invoice.aggregate({
                    where: {
                        tenantId,
                        status: { notIn: ['CANCELLED'] },
                        createdAt: { gte: dateFrom, lte: dateTo },
                    },
                    _sum: { total: true },
                }),
                prisma.invoiceItem.findMany({
                    where: {
                        invoice: {
                            tenantId,
                            status: { notIn: ['CANCELLED'] },
                            createdAt: { gte: dateFrom, lte: dateTo },
                        },
                    },
                    select: { quantity: true, unitPrice: true },
                }),
            ])
            const cogs = invoiceItems.reduce((sum: number, item: { quantity: unknown; unitPrice: unknown }) => {
                return sum + toNumber(item.quantity) * toNumber(item.unitPrice) * 0.6
            }, 0)
            return toNumber(revenueResult._sum.total) - cogs
        }

        case 'total_deals':
            return prisma.deal.count({
                where: {
                    tenantId,
                    createdAt: { gte: dateFrom, lte: dateTo },
                },
            })

        case 'win_rate': {
            const [wonDeals, totalQualifiedDeals] = await Promise.all([
                prisma.deal.count({
                    where: {
                        tenantId,
                        stage: 'CLOSED_WON',
                        createdAt: { gte: dateFrom, lte: dateTo },
                    },
                }),
                prisma.deal.count({
                    where: {
                        tenantId,
                        stage: { notIn: ['DISCOVERY'] },
                        createdAt: { gte: dateFrom, lte: dateTo },
                    },
                }),
            ])
            return totalQualifiedDeals > 0 ? (wonDeals / totalQualifiedDeals) * 100 : 0
        }

        case 'pipeline_value': {
            const result = await prisma.deal.aggregate({
                where: {
                    tenantId,
                    stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
                    createdAt: { gte: dateFrom, lte: dateTo },
                },
                _sum: { value: true },
            })
            return toNumber(result._sum.value)
        }

        case 'avg_deal_size': {
            const result = await prisma.deal.aggregate({
                where: {
                    tenantId,
                    stage: 'CLOSED_WON',
                    createdAt: { gte: dateFrom, lte: dateTo },
                },
                _avg: { value: true },
            })
            return toNumber(result._avg.value)
        }

        case 'lead_conversion_rate': {
            const [dealCount, leadCount] = await Promise.all([
                prisma.deal.count({
                    where: { tenantId, createdAt: { gte: dateFrom, lte: dateTo } },
                }),
                prisma.lead.count({
                    where: { tenantId, createdAt: { gte: dateFrom, lte: dateTo } },
                }),
            ])
            return leadCount > 0 ? (dealCount / leadCount) * 100 : 0
        }

        case 'total_stock_value': {
            const products = await prisma.product.findMany({
                where: { tenantId, isActive: true },
                select: { price: true, stock: true },
            })
            return products.reduce((sum: number, p: { price: unknown; stock: number }) => sum + toNumber(p.price) * p.stock, 0)
        }

        case 'low_stock_count': {
            const products = await prisma.product.findMany({
                where: { tenantId, isActive: true },
                select: { stock: true, minStock: true },
            })
            return products.filter((p: { stock: number; minStock: number }) => p.stock < p.minStock).length
        }

        case 'headcount':
            return prisma.employee.count({
                where: { tenantId, status: 'ACTIVE' },
            })

        case 'attendance_rate': {
            const records = await prisma.attendanceRecord.findMany({
                where: {
                    tenantId,
                    date: { gte: dateFrom, lte: dateTo },
                },
                select: { status: true },
            })
            const presentCount = records.filter(
                (r: { status: string }) => r.status === 'PRESENT' || r.status === 'LATE'
            ).length
            return records.length > 0 ? (presentCount / records.length) * 100 : 0
        }

        case 'total_payroll': {
            const result = await prisma.payrollRecord.aggregate({
                where: {
                    tenantId,
                    status: 'PAID',
                    createdAt: { gte: dateFrom, lte: dateTo },
                },
                _sum: { netSalary: true },
            })
            return toNumber(result._sum.netSalary)
        }

        case 'turnover_rate': {
            const [terminatedCount, totalCount] = await Promise.all([
                prisma.employee.count({
                    where: {
                        tenantId,
                        status: 'TERMINATED',
                        createdAt: { gte: dateFrom, lte: dateTo },
                    },
                }),
                prisma.employee.count({ where: { tenantId } }),
            ])
            return totalCount > 0 ? (terminatedCount / totalCount) * 100 : 0
        }

        case 'stock_turnover': {
            const movements = await prisma.stockMovement.findMany({
                where: {
                    tenantId,
                    type: 'OUT',
                    createdAt: { gte: dateFrom, lte: dateTo },
                },
                select: { quantity: true },
            })
            const totalSold = movements.reduce((sum: number, m: { quantity: number }) => sum + m.quantity, 0)
            const products = await prisma.product.findMany({
                where: { tenantId, isActive: true },
                select: { stock: true },
            })
            const avgInventory = products.reduce((sum: number, p: { stock: number }) => sum + p.stock, 0) / (products.length || 1)
            return avgInventory > 0 ? totalSold / avgInventory : 0
        }

        case 'ar_aging': {
            const result = await prisma.invoice.aggregate({
                where: {
                    tenantId,
                    status: { in: ['SENT', 'OVERDUE'] },
                    createdAt: { gte: dateFrom, lte: dateTo },
                },
                _sum: { total: true },
            })
            return toNumber(result._sum.total)
        }

        default:
            throw new Error(`Metric calculator not implemented for: ${metricId}`)
    }
}

// ============================================
// API HANDLER
// ============================================

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { id } = params

        // Find the KPI
        const kpi = await prisma.kPI.findFirst({
            where: { id, tenantId },
        })

        if (!kpi) {
            return NextResponse.json(
                { success: false, error: 'KPI not found' },
                { status: 404 }
            )
        }

        const target = toNumber(kpi.target)
        const warningThreshold = kpi.warningThreshold ? Number(kpi.warningThreshold) : 10
        const criticalThreshold = kpi.criticalThreshold ? Number(kpi.criticalThreshold) : 25

        // Determine date range based on KPI period
        const now = new Date()
        let dateFrom: Date
        const dateTo = now

        switch (kpi.period) {
            case 'daily':
                dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                break
            case 'weekly':
                dateFrom = new Date(now)
                dateFrom.setDate(now.getDate() - now.getDay())
                dateFrom.setHours(0, 0, 0, 0)
                break
            case 'quarterly':
                dateFrom = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
                break
            case 'yearly':
                dateFrom = new Date(now.getFullYear(), 0, 1)
                break
            case 'monthly':
            default:
                dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
                break
        }

        // Calculate current value
        const currentValue = await calculateMetricValue(
            kpi.metricId,
            tenantId,
            dateFrom,
            dateTo
        )

        // Get previous period value
        const previousDateTo = new Date(dateFrom)
        previousDateTo.setDate(previousDateTo.getDate() - 1)

        let previousDateFrom: Date
        switch (kpi.period) {
            case 'daily':
                previousDateFrom = new Date(dateFrom)
                previousDateFrom.setDate(previousDateFrom.getDate() - 1)
                break
            case 'weekly':
                previousDateFrom = new Date(dateFrom)
                previousDateFrom.setDate(previousDateFrom.getDate() - 7)
                break
            case 'monthly':
                previousDateFrom = new Date(dateFrom)
                previousDateFrom.setMonth(previousDateFrom.getMonth() - 1)
                break
            case 'quarterly':
                previousDateFrom = new Date(dateFrom)
                previousDateFrom.setMonth(previousDateFrom.getMonth() - 3)
                break
            case 'yearly':
                previousDateFrom = new Date(dateFrom)
                previousDateFrom.setFullYear(previousDateFrom.getFullYear() - 1)
                break
            default:
                previousDateFrom = new Date(dateFrom)
                previousDateFrom.setMonth(previousDateFrom.getMonth() - 1)
        }

        let previousValue: number
        try {
            previousValue = await calculateMetricValue(
                kpi.metricId,
                tenantId,
                previousDateFrom,
                previousDateTo
            )
        } catch {
            previousValue = 0
        }

        // Calculate change percent
        const changePercent = previousValue !== 0
            ? Math.round(((currentValue - previousValue) / Math.abs(previousValue)) * 10000) / 100
            : currentValue > 0 ? 100 : 0

        // Determine status using getKPIStatus from @qalcuity/analytics
        const status = getKPIStatus(currentValue, target, {
            warning: warningThreshold,
            critical: criticalThreshold,
        })

        const period = getCurrentPeriodKey(kpi.period)

        // Save evaluation
        const evaluation = await prisma.kPIEvaluation.create({
            data: {
                kpiId: id,
                tenantId,
                value: currentValue,
                target,
                status,
                changePercent,
                previousValue,
                period,
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                kpiId: id,
                value: currentValue,
                target,
                status,
                changePercent,
                previousValue,
                evaluatedAt: evaluation.evaluatedAt.toISOString(),
            },
        })
    } catch (error) {
        console.error('[KPI Evaluate Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
