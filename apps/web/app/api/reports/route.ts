import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/session'

// ============================================
// TYPES
// ============================================

interface RevenueData {
    month: string
    revenue: number
    invoiceCount: number
}

interface ExpenseData {
    category: string
    amount: number
}

interface SalesByCustomerData {
    customer: string
    totalSales: number
    transactions: number
    lastOrder: string
}

interface SalesByProductData {
    product: string
    totalSold: number
    revenue: number
}

interface StockData {
    sku: string
    name: string
    stock: number
    minStock: number
    price: number
    cost: number
    category: string
}

interface EmployeeData {
    id: string
    name: string
    department: string
    position: string
    salary: number
    status: string
}

interface AttendanceData {
    name: string
    department: string
    present: number
    late: number
    absent: number
    wfh: number
}

interface PayrollData {
    department: string
    headcount: number
    totalSalary: number
    avgSalary: number
}

interface SupplierData {
    name: string
    rating: number
    orders: number
    onTime: number
    totalSpent: number
}

interface ReportsResponse {
    revenue: RevenueData[]
    expenses: ExpenseData[]
    salesByCustomer: SalesByCustomerData[]
    salesByProduct: SalesByProductData[]
    stock: StockData[]
    employees: EmployeeData[]
    attendance: AttendanceData[]
    payroll: PayrollData[]
    suppliers: SupplierData[]
}

// ============================================
// HELPERS
// ============================================

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function formatMonthLabel(date: Date): string {
    return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
}

/**
 * Categorize expense from payment notes using keyword matching
 */
function categorizeExpense(notes: string | null): string {
    if (!notes) return 'Lainnya'
    const lower = notes.toLowerCase()
    if (lower.includes('gaji') || lower.includes('salary') || lower.includes('payroll')) return 'Gaji Karyawan'
    if (lower.includes('sewa') || lower.includes('rent')) return 'Sewa Kantor'
    if (lower.includes('listrik') || lower.includes('internet') || lower.includes('telepon')) return 'Listrik & Internet'
    if (lower.includes('atk') || lower.includes('perlengkapan') || lower.includes('kantor') || lower.includes('supplies')) return 'Perlengkapan Kantor'
    if (lower.includes('marketing') || lower.includes('iklan') || lower.includes('ads')) return 'Marketing'
    if (lower.includes('transport') || lower.includes('logistik') || lower.includes('pengiriman') || lower.includes('delivery')) return 'Transport & Logistik'
    if (lower.includes('software') || lower.includes('tool') || lower.includes('license')) return 'Software & Tools'
    if (lower.includes('supplier') || lower.includes('pembelian') || lower.includes('purchase')) return 'Pembelian Bahan'
    return 'Lainnya'
}

// ============================================
// API HANDLER
// ============================================

export async function GET(request: Request) {
    try {
        const { tenantId } = await requireAuth()
        const { searchParams } = new URL(request.url)
        const dateFrom = searchParams.get('dateFrom')
        const dateTo = searchParams.get('dateTo')

        // Build date filter
        const dateFilter: Record<string, unknown> = {}
        if (dateFrom) {
            dateFilter.gte = new Date(dateFrom)
        }
        if (dateTo) {
            dateFilter.lte = new Date(dateTo)
        }

        // ============================================
        // 1. REVENUE DATA — from Invoice (group by month)
        // ============================================
        const invoices = await prisma.invoice.findMany({
            where: {
                tenantId,
                status: { notIn: ['CANCELLED'] },
                ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
            },
            select: {
                total: true,
                createdAt: true,
                status: true,
            },
            orderBy: { createdAt: 'asc' },
        })

        // Group by month
        const revenueMap = new Map<string, { revenue: number; count: number }>()
        for (const inv of invoices) {
            const key = formatMonthLabel(new Date(inv.createdAt))
            const existing = revenueMap.get(key) || { revenue: 0, count: 0 }
            existing.revenue += inv.total
            existing.count += 1
            revenueMap.set(key, existing)
        }

        const revenue: RevenueData[] = Array.from(revenueMap.entries()).map(([month, data]) => ({
            month,
            revenue: Math.round(data.revenue),
            invoiceCount: data.count,
        }))

        // ============================================
        // 2. EXPENSE DATA — from Payment (type=EXPENSE)
        // ============================================
        const expensePayments = await prisma.payment.findMany({
            where: {
                tenantId,
                type: 'EXPENSE',
                status: 'COMPLETED',
                ...(Object.keys(dateFilter).length > 0 ? { paymentDate: dateFilter } : {}),
            },
            select: {
                amount: true,
                notes: true,
            },
        })

        // Group by category
        const expenseMap = new Map<string, number>()
        for (const p of expensePayments) {
            const category = categorizeExpense(p.notes)
            expenseMap.set(category, (expenseMap.get(category) || 0) + p.amount)
        }

        const expenses: ExpenseData[] = Array.from(expenseMap.entries())
            .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
            .sort((a, b) => b.amount - a.amount)

        // ============================================
        // 3. SALES BY CUSTOMER — from Invoice grouped by contact
        // ============================================
        const customerInvoices = await prisma.invoice.findMany({
            where: {
                tenantId,
                status: { notIn: ['CANCELLED'] },
                contactId: { not: null },
                ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
            },
            select: {
                total: true,
                createdAt: true,
                contactId: true,
                contact: { select: { name: true } },
            },
        })

        const customerMap = new Map<string, { name: string; totalSales: number; transactions: number; lastOrder: string }>()
        for (const inv of customerInvoices) {
            if (!inv.contactId || !inv.contact) continue
            const existing = customerMap.get(inv.contactId)
            const dateStr = new Date(inv.createdAt).toISOString().split('T')[0]
            if (existing) {
                existing.totalSales += inv.total
                existing.transactions += 1
                if (dateStr > existing.lastOrder) existing.lastOrder = dateStr
            } else {
                customerMap.set(inv.contactId, {
                    name: inv.contact.name,
                    totalSales: inv.total,
                    transactions: 1,
                    lastOrder: dateStr,
                })
            }
        }

        const salesByCustomer: SalesByCustomerData[] = Array.from(customerMap.values())
            .map(d => ({ customer: d.name, totalSales: Math.round(d.totalSales), transactions: d.transactions, lastOrder: d.lastOrder }))
            .sort((a, b) => b.totalSales - a.totalSales)

        // ============================================
        // 4. SALES BY PRODUCT — from InvoiceItem (group by description)
        // ============================================
        const invoiceItems = await prisma.invoiceItem.findMany({
            where: {
                invoice: {
                    tenantId,
                    status: { notIn: ['CANCELLED'] },
                },
            },
            select: {
                description: true,
                quantity: true,
                total: true,
            },
        })

        // Parse product name from description (e.g., "Widget A x50" → "Widget A")
        const productMap = new Map<string, { totalSold: number; revenue: number }>()
        for (const item of invoiceItems) {
            // Extract product name: remove trailing " x<number>" pattern
            const productName = item.description.replace(/\s+x\d+(\.\d+)?\s*(jam|pcs|rim|unit|kg|ltr)?$/i, '').trim() || item.description
            const existing = productMap.get(productName)
            if (existing) {
                existing.totalSold += item.quantity
                existing.revenue += item.total
            } else {
                productMap.set(productName, { totalSold: item.quantity, revenue: item.total })
            }
        }

        const salesByProduct: SalesByProductData[] = Array.from(productMap.entries())
            .map(([product, data]) => ({ product, totalSold: Math.round(data.totalSold), revenue: Math.round(data.revenue) }))
            .sort((a, b) => b.revenue - a.revenue)

        // ============================================
        // 5. STOCK DATA — from Product
        // ============================================
        const products = await prisma.product.findMany({
            where: {
                tenantId,
                deletedAt: null,
            },
            select: {
                sku: true,
                name: true,
                stock: true,
                minStock: true,
                price: true,
                cost: true,
                category: { select: { name: true } },
            },
            orderBy: { name: 'asc' },
        })

        const stock: StockData[] = products.map(p => ({
            sku: p.sku,
            name: p.name,
            stock: p.stock,
            minStock: p.minStock,
            price: p.price,
            cost: p.cost,
            category: p.category?.name || 'Uncategorized',
        }))

        // ============================================
        // 6. EMPLOYEE DATA — from Employee
        // ============================================
        const employees = await prisma.employee.findMany({
            where: {
                tenantId,
                deletedAt: null,
            },
            select: {
                employeeId: true,
                name: true,
                department: true,
                position: true,
                salary: true,
                status: true,
            },
            orderBy: { name: 'asc' },
        })

        const employeeData: EmployeeData[] = employees.map(e => ({
            id: e.employeeId,
            name: e.name,
            department: e.department || 'Unassigned',
            position: e.position,
            salary: e.salary,
            status: e.status,
        }))

        // ============================================
        // 7. ATTENDANCE DATA — from AttendanceRecord grouped by employee
        // ============================================
        const attendanceRecords = await prisma.attendanceRecord.findMany({
            where: {
                tenantId,
                ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
            },
            select: {
                status: true,
                employee: { select: { name: true, department: true } },
            },
        })

        // Group by employee
        const attendanceMap = new Map<string, { name: string; department: string; present: number; late: number; absent: number; wfh: number }>()
        for (const record of attendanceRecords) {
            const key = record.employee.name
            const existing = attendanceMap.get(key)
            const status = record.status
            if (existing) {
                if (status === 'PRESENT') existing.present += 1
                else if (status === 'LATE') existing.late += 1
                else if (status === 'ABSENT') existing.absent += 1
                else if (status === 'WFH' || status === 'LEAVE') existing.wfh += 1
            } else {
                const entry: { name: string; department: string; present: number; late: number; absent: number; wfh: number } = {
                    name: record.employee.name,
                    department: record.employee.department || 'Unassigned',
                    present: 0,
                    late: 0,
                    absent: 0,
                    wfh: 0,
                }
                if (status === 'PRESENT') entry.present = 1
                else if (status === 'LATE') entry.late = 1
                else if (status === 'ABSENT') entry.absent = 1
                else if (status === 'WFH' || status === 'LEAVE') entry.wfh = 1
                attendanceMap.set(key, entry)
            }
        }

        const attendance: AttendanceData[] = Array.from(attendanceMap.values())

        // ============================================
        // 8. PAYROLL DATA — from PayrollRecord grouped by department
        // ============================================
        const payrollRecords = await prisma.payrollRecord.findMany({
            where: { tenantId },
            select: {
                netSalary: true,
                employee: { select: { department: true } },
            },
        })

        const payrollMap = new Map<string, { headcount: number; totalSalary: number }>()
        for (const record of payrollRecords) {
            const dept = record.employee.department || 'Unassigned'
            const existing = payrollMap.get(dept)
            if (existing) {
                existing.headcount += 1
                existing.totalSalary += record.netSalary
            } else {
                payrollMap.set(dept, { headcount: 1, totalSalary: record.netSalary })
            }
        }

        const payroll: PayrollData[] = Array.from(payrollMap.entries())
            .map(([department, data]) => ({
                department,
                headcount: data.headcount,
                totalSalary: Math.round(data.totalSalary),
                avgSalary: Math.round(data.totalSalary / data.headcount),
            }))
            .sort((a, b) => b.totalSalary - a.totalSalary)

        // ============================================
        // 9. SUPPLIER PERFORMANCE — from Supplier + PurchaseOrder
        // ============================================
        const suppliers = await prisma.supplier.findMany({
            where: {
                tenantId,
                isActive: true,
            },
            select: {
                name: true,
                rating: true,
                purchaseOrders: {
                    select: {
                        total: true,
                        status: true,
                        deliveryDate: true,
                        orderDate: true,
                    },
                },
            },
            orderBy: { rating: 'desc' },
        })

        const supplierData: SupplierData[] = suppliers.map(s => {
            const orders = s.purchaseOrders.length
            const onTime = s.purchaseOrders.filter(po => {
                if (!po.deliveryDate) return false
                return new Date(po.deliveryDate) >= new Date(po.orderDate)
            }).length
            const totalSpent = s.purchaseOrders.reduce((sum, po) => sum + po.total, 0)
            return {
                name: s.name,
                rating: s.rating,
                orders,
                onTime,
                totalSpent: Math.round(totalSpent),
            }
        })

        // ============================================
        // RESPONSE
        // ============================================
        const response: ReportsResponse = {
            revenue,
            expenses,
            salesByCustomer,
            salesByProduct,
            stock,
            employees: employeeData,
            attendance,
            payroll,
            suppliers: supplierData,
        }

        return NextResponse.json({ success: true, data: response })
    } catch (error) {
        console.error('Reports API error:', error)
        const message = error instanceof Error ? error.message : 'Internal server error'
        const status = message === 'Unauthorized' ? 401 : 500
        return NextResponse.json(
            { success: false, error: message },
            { status }
        )
    }
}
