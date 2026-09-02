// ============================================
// Analytics Dashboard API — GET
// Overview analytics dashboard with aggregated KPIs and summary stats
// ============================================

import { NextResponse } from 'next/server'
import { requirePermissionForRoute } from '@/lib/session'
import { prisma } from '@/lib/db'

// ============================================
// TYPES
// ============================================

interface DashboardSummary {
    totalRevenue: number
    totalExpenses: number
    netIncome: number
    cashFlow: number
    revenueChange: number
    expensesChange: number
    totalDeals: number
    winRate: number
    pipelineValue: number
    totalProducts: number
    lowStockCount: number
    activeEmployees: number
    attendanceRate: number
}

interface TimeSeries {
    labels: string[]
    values: number[]
}

interface AlertTriggerItem {
    id: string
    ruleId: string
    message: string
    severity: string
    currentValue: number
    threshold: number
    triggeredAt: string
    acknowledged: boolean
}

interface KPISummaryItem {
    kpiId: string
    name: string
    value: number
    target: number
    status: string
    category: string
}

interface DashboardResponse {
    summary: DashboardSummary
    recentTrends: {
        revenue: TimeSeries
        expenses: TimeSeries
    }
    alerts: AlertTriggerItem[]
    topKPIs: KPISummaryItem[]
}

// ============================================
// HELPERS
// ============================================

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function formatMonthLabel(date: Date): string {
    return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
}

function toNumber(val: unknown): number {
    if (val === null || val === undefined) return 0
    if (typeof val === 'number') return val
    if (typeof val === 'string') return parseFloat(val) || 0
    // Handle Prisma Decimal objects
    if (typeof val === 'object' && val !== null && 'toNumber' in val) {
        return (val as { toNumber: () => number }).toNumber()
    }
    return 0
}

function getPeriodDates(period: string): { currentFrom: Date; previousFrom: Date; previousTo: Date; currentTo: Date } {
    const now = new Date()
    let currentFrom: Date
    let previousFrom: Date
    const previousTo: Date = new Date(now)

    switch (period) {
        case 'daily':
            currentFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            previousFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
            previousTo.setTime(currentFrom.getTime() - 1)
            break
        case 'weekly': {
            currentFrom = new Date(now)
            currentFrom.setDate(now.getDate() - now.getDay())
            currentFrom.setHours(0, 0, 0, 0)
            previousFrom = new Date(currentFrom)
            previousFrom.setDate(currentFrom.getDate() - 7)
            previousTo.setTime(currentFrom.getTime() - 1)
            break
        }
        case 'quarterly': {
            const quarter = Math.floor(now.getMonth() / 3)
            currentFrom = new Date(now.getFullYear(), quarter * 3, 1)
            previousFrom = new Date(now.getFullYear(), (quarter - 1) * 3, 1)
            previousTo.setTime(currentFrom.getTime() - 1)
            break
        }
        case 'yearly':
            currentFrom = new Date(now.getFullYear(), 0, 1)
            previousFrom = new Date(now.getFullYear() - 1, 0, 1)
            previousTo.setTime(currentFrom.getTime() - 1)
            break
        case 'monthly':
        default:
            currentFrom = new Date(now.getFullYear(), now.getMonth(), 1)
            previousFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            previousTo.setTime(currentFrom.getTime() - 1)
            break
    }

    return { currentFrom, previousFrom, previousTo, currentTo: now }
}

function buildTimeSeriesFromMonthly(
    data: Array<{ month: string; value: number }>,
    currentFrom: Date
): TimeSeries {
    const labels: string[] = []
    const values: number[] = []

    const dataMap = new Map<string, number>()
    for (const item of data) {
        dataMap.set(item.month, item.value)
    }

    const startDate = new Date(currentFrom)
    startDate.setMonth(startDate.getMonth() - 5)

    for (let i = 0; i < 6; i++) {
        const d = new Date(startDate)
        d.setMonth(d.getMonth() + i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        labels.push(formatMonthLabel(d))
        values.push(dataMap.get(key) || 0)
    }

    return { labels, values }
}

// ============================================
// API HANDLER
// ============================================

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request)
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }
        const { tenantId } = auth
        const { searchParams } = new URL(request.url)
        const period = searchParams.get('period') || 'monthly'
        const dateFrom = searchParams.get('dateFrom')
        const dateTo = searchParams.get('dateTo')

        const { currentFrom, previousFrom, previousTo, currentTo } = getPeriodDates(period)

        const createdAtFilter = (dateFrom || dateTo)
            ? {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
            }
            : { gte: currentFrom, lte: currentTo }

        const previousCreatedAtFilter = { gte: previousFrom, lte: previousTo }

        // ============================================
        // PARALLEL QUERIES
        // ============================================
        const [
            currentInvoices,
            previousInvoices,
            currentExpenses,
            previousExpenses,
            revenueByMonth,
            expensesByMonth,
            totalDeals,
            wonDeals,
            qualifiedDeals,
            pipelineDeals,
            productCount,
            activeEmployees,
            currentAttendance,
            recentAlerts,
            topKPIs,
        ] = await Promise.all([
            // Current period revenue
            prisma.invoice.aggregate({
                where: {
                    tenantId,
                    status: { notIn: ['CANCELLED'] },
                    createdAt: createdAtFilter,
                },
                _sum: { total: true },
            }),

            // Previous period revenue
            prisma.invoice.aggregate({
                where: {
                    tenantId,
                    status: { notIn: ['CANCELLED'] },
                    createdAt: previousCreatedAtFilter,
                },
                _sum: { total: true },
            }),

            // Current period expenses
            prisma.payment.aggregate({
                where: {
                    tenantId,
                    type: 'EXPENSE',
                    status: 'COMPLETED',
                    paymentDate: createdAtFilter,
                },
                _sum: { amount: true },
            }),

            // Previous period expenses
            prisma.payment.aggregate({
                where: {
                    tenantId,
                    type: 'EXPENSE',
                    status: 'COMPLETED',
                    paymentDate: previousCreatedAtFilter,
                },
                _sum: { amount: true },
            }),

            // Revenue by month
            prisma.invoice.findMany({
                where: {
                    tenantId,
                    status: { notIn: ['CANCELLED'] },
                },
                select: { total: true, createdAt: true },
                orderBy: { createdAt: 'asc' },
            }),

            // Expenses by month
            prisma.payment.findMany({
                where: {
                    tenantId,
                    type: 'EXPENSE',
                    status: 'COMPLETED',
                },
                select: { amount: true, paymentDate: true },
                orderBy: { paymentDate: 'asc' },
            }),

            // Total deals
            prisma.deal.count({ where: { tenantId } }),

            // Won deals
            prisma.deal.count({ where: { tenantId, stage: 'CLOSED_WON' } }),

            // Qualified deals
            prisma.deal.count({
                where: { tenantId, stage: { notIn: ['DISCOVERY'] } },
            }),

            // Pipeline value
            prisma.deal.aggregate({
                where: {
                    tenantId,
                    stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
                },
                _sum: { value: true },
            }),

            // Product count
            prisma.product.count({ where: { tenantId, isActive: true } }),

            // Active employees
            prisma.employee.count({ where: { tenantId, status: 'ACTIVE' } }),

            // Current period attendance
            prisma.attendanceRecord.findMany({
                where: {
                    tenantId,
                    date: createdAtFilter,
                },
                select: { status: true },
            }),

            // Recent unacknowledged alerts
            prisma.alertTrigger.findMany({
                where: { tenantId, acknowledged: false },
                orderBy: { triggeredAt: 'desc' },
                take: 10,
            }),

            // Top KPIs
            prisma.kPI.findMany({
                where: { tenantId, isActive: true },
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    evaluations: {
                        orderBy: { evaluatedAt: 'desc' },
                        take: 1,
                    },
                },
            }),
        ])

        // ============================================
        // COMPUTE SUMMARY
        // ============================================

        const totalRevenue = toNumber(currentInvoices._sum.total)
        const prevRevenue = toNumber(previousInvoices._sum.total)
        const totalExpenses = toNumber(currentExpenses._sum.amount)
        const prevExpenses = toNumber(previousExpenses._sum.amount)
        const netIncome = totalRevenue - totalExpenses
        const cashFlow = totalRevenue - totalExpenses

        const revenueChange = prevRevenue !== 0
            ? Math.round(((totalRevenue - prevRevenue) / Math.abs(prevRevenue)) * 10000) / 100
            : totalRevenue > 0 ? 100 : 0

        const expensesChange = prevExpenses !== 0
            ? Math.round(((totalExpenses - prevExpenses) / Math.abs(prevExpenses)) * 10000) / 100
            : totalExpenses > 0 ? 100 : 0

        const winRate = qualifiedDeals > 0
            ? Math.round((wonDeals / qualifiedDeals) * 10000) / 100
            : 0

        const pipelineValue = toNumber(pipelineDeals._sum.value)

        // Low stock count
        const allProducts = await prisma.product.findMany({
            where: { tenantId, isActive: true },
            select: { stock: true, minStock: true },
        })
        const lowStockCount = allProducts.filter(p => p.stock < p.minStock).length

        // Attendance rate
        const presentCount = currentAttendance.filter(
            (a: { status: string }) => a.status === 'PRESENT' || a.status === 'LATE'
        ).length
        const attendanceRate = currentAttendance.length > 0
            ? Math.round((presentCount / currentAttendance.length) * 10000) / 100
            : 0

        const summary: DashboardSummary = {
            totalRevenue,
            totalExpenses,
            netIncome,
            cashFlow,
            revenueChange,
            expensesChange,
            totalDeals,
            winRate,
            pipelineValue,
            totalProducts: productCount,
            lowStockCount,
            activeEmployees,
            attendanceRate,
        }

        // ============================================
        // COMPUTE TRENDS
        // ============================================

        const revenueMonthlyMap = new Map<string, number>()
        for (const inv of revenueByMonth) {
            const d = new Date(inv.createdAt)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            revenueMonthlyMap.set(key, (revenueMonthlyMap.get(key) || 0) + toNumber(inv.total))
        }
        const revenueMonthlyData = Array.from(revenueMonthlyMap.entries()).map(([month, value]) => ({ month, value }))

        const expensesMonthlyMap = new Map<string, number>()
        for (const exp of expensesByMonth) {
            const d = new Date(exp.paymentDate)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            expensesMonthlyMap.set(key, (expensesMonthlyMap.get(key) || 0) + toNumber(exp.amount))
        }
        const expensesMonthlyData = Array.from(expensesMonthlyMap.entries()).map(([month, value]) => ({ month, value }))

        const revenueTrend = buildTimeSeriesFromMonthly(revenueMonthlyData, currentFrom)
        const expensesTrend = buildTimeSeriesFromMonthly(expensesMonthlyData, currentFrom)

        // ============================================
        // COMPUTE KPIs
        // ============================================

        const topKPIsData: KPISummaryItem[] = topKPIs.map((kpi) => {
            const evaluation = kpi.evaluations[0]
            return {
                kpiId: kpi.id,
                name: kpi.name,
                value: evaluation ? toNumber(evaluation.value) : 0,
                target: toNumber(kpi.target),
                status: evaluation?.status || 'on_target',
                category: kpi.category,
            }
        })

        // ============================================
        // ALERTS
        // ============================================

        const alertItems: AlertTriggerItem[] = recentAlerts.map((alert) => ({
            id: alert.id,
            ruleId: alert.ruleId,
            message: alert.message,
            severity: alert.severity,
            currentValue: toNumber(alert.currentValue),
            threshold: toNumber(alert.threshold),
            triggeredAt: alert.triggeredAt.toISOString(),
            acknowledged: alert.acknowledged,
        }))

        // ============================================
        // RESPONSE
        // ============================================

        const response: DashboardResponse = {
            summary,
            recentTrends: {
                revenue: revenueTrend,
                expenses: expensesTrend,
            },
            alerts: alertItems,
            topKPIs: topKPIsData,
        }

        return NextResponse.json({ success: true, data: response })
    } catch (error) {
        console.error('[Analytics Dashboard Error]', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
