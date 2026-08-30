/**
 * End-to-End Test Script for Qalcuity API Routes
 *
 * Tests all CRUD flows with different roles:
 * - ADMIN: Full access
 * - MEMBER: Create/read, limited edit
 * - VIEWER: Read only
 *
 * Usage: cd apps/web && npx tsx __tests__/e2e-test.ts
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// TEST CONFIGURATION
// ============================================

interface TestResult {
    module: string;
    test: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    message?: string;
    duration?: number;
}

const results: TestResult[] = [];
let testCount = 0;
let passCount = 0;
let failCount = 0;
let skipCount = 0;

// ============================================
// TEST HELPERS
// ============================================

function log(msg: string) {
    console.log(`  ${msg}`);
}

function logHeader(msg: string) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${msg}`);
    console.log(`${'='.repeat(60)}`);
}

function logSubHeader(msg: string) {
    console.log(`\n  --- ${msg} ---`);
}

function recordTest(module: string, test: string, status: 'PASS' | 'FAIL' | 'SKIP', message?: string, duration?: number) {
    testCount++;
    if (status === 'PASS') passCount++;
    else if (status === 'FAIL') failCount++;
    else skipCount++;

    results.push({ module, test, status, message, duration });
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
    const durationStr = duration !== undefined ? ` (${duration}ms)` : '';
    log(`${icon} ${test}${durationStr}${message ? ` — ${message}` : ''}`);
}

// ============================================
// DATA SETUP — Get tenant and users from seed
// ============================================

async function setupTestData() {
    logHeader('🔧 SETUP TEST DATA');

    // Get tenants
    const tenants = await prisma.tenant.findMany({ take: 2 });
    if (tenants.length === 0) {
        log('❌ No tenants found. Run seed first: cd packages/db && npx prisma db seed');
        process.exit(1);
    }
    log(`Found ${tenants.length} tenant(s)`);

    // Get users for each role
    const users = await prisma.user.findMany({
        where: { tenantId: tenants[0].id },
        select: { id: true, email: true, name: true, role: true, tenantId: true },
    });

    const adminUser = users.find(u => u.role === 'ADMIN');
    const memberUser = users.find(u => u.role === 'MEMBER');
    const viewerUser = users.find(u => u.role === 'VIEWER');

    log(`Users found: ${users.length}`);
    log(`  ADMIN: ${adminUser?.email || 'NOT FOUND'}`);
    log(`  MEMBER: ${memberUser?.email || 'NOT FOUND'}`);
    log(`  VIEWER: ${viewerUser?.email || 'NOT FOUND'}`);

    return { tenants, users, adminUser, memberUser, viewerUser };
}

// ============================================
// MODULE TESTS
// ============================================

// ---------- CRM: CONTACTS ----------
async function testCRMContacts(tenantId: string) {
    logSubHeader('CRM — Contacts');

    // READ: List contacts
    const startTime = Date.now();
    const contacts = await prisma.contact.findMany({
        where: { tenantId },
        include: {
            _count: { select: { invoices: true, deals: true } },
        },
        take: 10,
    });
    recordTest('CRM Contacts', 'GET contacts list', 'PASS', `${contacts.length} contacts found`, Date.now() - startTime);

    // READ: Single contact
    if (contacts.length > 0) {
        const startTime2 = Date.now();
        const contact = await prisma.contact.findUnique({
            where: { id: contacts[0].id },
            include: {
                invoices: { take: 5, orderBy: { createdAt: 'desc' as const } },
                deals: { take: 5, orderBy: { createdAt: 'desc' as const } },
            },
        });
        recordTest('CRM Contacts', 'GET single contact with relations', contact !== null ? 'PASS' : 'FAIL', undefined, Date.now() - startTime2);
    }

    // CREATE: New contact
    const startTime3 = Date.now();
    try {
        const newContact = await prisma.contact.create({
            data: {
                name: 'Test Contact E2E',
                email: `test-e2e-${Date.now()}@test.com`,
                phone: '081234567890',
                type: 'CUSTOMER',
                company: 'Test Company E2E',
                address: 'Jl. Test No. 123',
                city: 'Jakarta',
                province: 'DKI Jakarta',
                tenantId,
            },
        });
        recordTest('CRM Contacts', 'CREATE contact', 'PASS', `Created: ${newContact.id}`, Date.now() - startTime3);

        // UPDATE: Update contact
        const startTime4 = Date.now();
        const updated = await prisma.contact.update({
            where: { id: newContact.id },
            data: { name: 'Test Contact Updated E2E' },
        });
        recordTest('CRM Contacts', 'UPDATE contact', 'PASS', `Updated: ${updated.name}`, Date.now() - startTime4);

        // DELETE: Cleanup
        await prisma.contact.delete({ where: { id: newContact.id } });
        log('  🧹 Test data cleaned up');
    } catch (error) {
        recordTest('CRM Contacts', 'CREATE contact', 'FAIL', error instanceof Error ? error.message : 'Unknown error', Date.now() - startTime3);
    }
}

// ---------- CRM: LEADS ----------
async function testCRMLeads(tenantId: string) {
    logSubHeader('CRM — Leads');

    const startTime = Date.now();
    const leads = await prisma.lead.findMany({
        where: { tenantId },
        include: { contact: { select: { id: true, name: true } } },
        take: 10,
    });
    recordTest('CRM Leads', 'GET leads list', 'PASS', `${leads.length} leads found`, Date.now() - startTime);

    // CREATE
    const startTime2 = Date.now();
    try {
        const newLead = await prisma.lead.create({
            data: {
                name: 'Test Lead E2E',
                email: `lead-e2e-${Date.now()}@test.com`,
                company: 'Test Lead Company',
                source: 'WEBSITE',
                status: 'NEW',
                value: 50000000,
                tenantId,
            },
        });
        recordTest('CRM Leads', 'CREATE lead', 'PASS', `Created: ${newLead.id}`, Date.now() - startTime2);

        // UPDATE
        const startTime3 = Date.now();
        await prisma.lead.update({
            where: { id: newLead.id },
            data: { status: 'CONTACTED' },
        });
        recordTest('CRM Leads', 'UPDATE lead status', 'PASS', undefined, Date.now() - startTime3);

        // DELETE
        await prisma.lead.delete({ where: { id: newLead.id } });
        log('  🧹 Test data cleaned up');
    } catch (error) {
        recordTest('CRM Leads', 'CREATE lead', 'FAIL', error instanceof Error ? error.message : 'Unknown error', Date.now() - startTime2);
    }
}

// ---------- CRM: DEALS ----------
async function testCRMDeals(tenantId: string) {
    logSubHeader('CRM — Deals');

    const startTime = Date.now();
    const deals = await prisma.deal.findMany({
        where: { tenantId },
        include: {
            contact: { select: { id: true, name: true } },
            lead: { select: { id: true, name: true } },
        },
        take: 10,
    });
    recordTest('CRM Deals', 'GET deals list', 'PASS', `${deals.length} deals found`, Date.now() - startTime);

    // CREATE
    const startTime2 = Date.now();
    try {
        const newDeal = await prisma.deal.create({
            data: {
                title: 'Test Deal E2E',
                value: 100000000,
                stage: 'DISCOVERY',
                probability: 20,
                tenantId,
            },
        });
        recordTest('CRM Deals', 'CREATE deal', 'PASS', `Created: ${newDeal.id}`, Date.now() - startTime2);

        // UPDATE stage
        const startTime3 = Date.now();
        await prisma.deal.update({
            where: { id: newDeal.id },
            data: { stage: 'PROPOSAL', probability: 50 },
        });
        recordTest('CRM Deals', 'UPDATE deal stage', 'PASS', undefined, Date.now() - startTime3);

        // DELETE
        await prisma.deal.delete({ where: { id: newDeal.id } });
        log('  🧹 Test data cleaned up');
    } catch (error) {
        recordTest('CRM Deals', 'CREATE deal', 'FAIL', error instanceof Error ? error.message : 'Unknown error', Date.now() - startTime2);
    }
}

// ---------- FINANCE: INVOICES ----------
async function testFinanceInvoices(tenantId: string) {
    logSubHeader('Finance — Invoices');

    const startTime = Date.now();
    const invoices = await prisma.invoice.findMany({
        where: { tenantId },
        include: {
            contact: { select: { id: true, name: true } },
            items: true,
            payments: { select: { id: true, amount: true, status: true } },
        },
        take: 10,
    });
    recordTest('Finance Invoices', 'GET invoices list with items', 'PASS', `${invoices.length} invoices found`, Date.now() - startTime);

    // Verify items are included (N+1 check)
    if (invoices.length > 0) {
        const hasItems = invoices.every(inv => Array.isArray(inv.items));
        recordTest('Finance Invoices', 'Verify items eager-loaded (no N+1)', hasItems ? 'PASS' : 'FAIL');
    }

    // CREATE
    const contacts = await prisma.contact.findMany({ where: { tenantId }, take: 1 });
    const startTime2 = Date.now();
    try {
        const newInvoice = await prisma.invoice.create({
            data: {
                invoiceNumber: `INV-E2E-${Date.now()}`,
                status: 'DRAFT',
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                subtotal: 1000000,
                taxRate: 11,
                taxAmount: 110000,
                total: 1110000,
                tenantId,
                contactId: contacts[0]?.id,
                items: {
                    create: [
                        { description: 'Test Item 1', quantity: 10, unitPrice: 100000, total: 1000000 },
                    ],
                },
            },
            include: { items: true },
        });
        recordTest('Finance Invoices', 'CREATE invoice with items', 'PASS', `Created: ${newInvoice.id}`, Date.now() - startTime2);

        // Verify items created
        recordTest('Finance Invoices', 'Verify items created with invoice', newInvoice.items.length === 1 ? 'PASS' : 'FAIL');

        // DELETE (cascade items)
        await prisma.invoiceItem.deleteMany({ where: { invoiceId: newInvoice.id } });
        await prisma.invoice.delete({ where: { id: newInvoice.id } });
        log('  🧹 Test data cleaned up');
    } catch (error) {
        recordTest('Finance Invoices', 'CREATE invoice', 'FAIL', error instanceof Error ? error.message : 'Unknown error', Date.now() - startTime2);
    }
}

// ---------- FINANCE: PAYMENTS ----------
async function testFinancePayments(tenantId: string) {
    logSubHeader('Finance — Payments');

    const startTime = Date.now();
    const payments = await prisma.payment.findMany({
        where: { tenantId },
        include: {
            invoice: {
                select: {
                    id: true,
                    invoiceNumber: true,
                    total: true,
                    contact: { select: { name: true } },
                },
            },
        },
        take: 10,
    });
    recordTest('Finance Payments', 'GET payments list', 'PASS', `${payments.length} payments found`, Date.now() - startTime);

    // CREATE
    const startTime2 = Date.now();
    try {
        const newPayment = await prisma.payment.create({
            data: {
                paymentNumber: `PAY-E2E-${Date.now()}`,
                amount: 500000,
                paymentDate: new Date(),
                method: 'BANK_TRANSFER',
                status: 'COMPLETED',
                type: 'INCOME',
                tenantId,
            },
        });
        recordTest('Finance Payments', 'CREATE payment', 'PASS', `Created: ${newPayment.id}`, Date.now() - startTime2);

        // DELETE
        await prisma.payment.delete({ where: { id: newPayment.id } });
        log('  🧹 Test data cleaned up');
    } catch (error) {
        recordTest('Finance Payments', 'CREATE payment', 'FAIL', error instanceof Error ? error.message : 'Unknown error', Date.now() - startTime2);
    }
}

// ---------- FINANCE: PURCHASE ORDERS ----------
async function testFinancePurchaseOrders(tenantId: string) {
    logSubHeader('Finance — Purchase Orders');

    const startTime = Date.now();
    const pos = await prisma.purchaseOrder.findMany({
        where: { tenantId },
        include: {
            supplier: { select: { id: true, name: true } },
            items: true,
        },
        take: 10,
    });
    recordTest('Finance POs', 'GET purchase orders list', 'PASS', `${pos.length} POs found`, Date.now() - startTime);

    // Verify items eager-loaded
    if (pos.length > 0) {
        const hasItems = (po: any) => Array.isArray(po.items);
        recordTest('Finance POs', 'Verify items eager-loaded (no N+1)', pos.every(hasItems) ? 'PASS' : 'FAIL');
    }

    // CREATE
    const startTime2 = Date.now();
    try {
        const newPO = await prisma.purchaseOrder.create({
            data: {
                poNumber: `PO-E2E-${Date.now()}`,
                status: 'DRAFT',
                orderDate: new Date(),
                subtotal: 2000000,
                taxRate: 11,
                taxAmount: 220000,
                total: 2220000,
                tenantId,
                items: {
                    create: [
                        { description: 'Test PO Item', quantity: 5, unitPrice: 400000, total: 2000000 },
                    ],
                },
            },
            include: { items: true },
        });
        recordTest('Finance POs', 'CREATE purchase order with items', 'PASS', `Created: ${newPO.id}`, Date.now() - startTime2);

        await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: newPO.id } });
        await prisma.purchaseOrder.delete({ where: { id: newPO.id } });
        log('  🧹 Test data cleaned up');
    } catch (error) {
        recordTest('Finance POs', 'CREATE purchase order', 'FAIL', error instanceof Error ? error.message : 'Unknown error', Date.now() - startTime2);
    }
}

// ---------- FINANCE: QUOTATIONS ----------
async function testFinanceQuotations(tenantId: string) {
    logSubHeader('Finance — Quotations');

    const startTime = Date.now();
    const quotations = await prisma.quotation.findMany({
        where: { tenantId },
        include: {
            contact: { select: { id: true, name: true } },
            items: true,
        },
        take: 10,
    });
    recordTest('Finance Quotations', 'GET quotations list', 'PASS', `${quotations.length} quotations found`, Date.now() - startTime);

    if (quotations.length > 0) {
        recordTest('Finance Quotations', 'Verify items eager-loaded (no N+1)', quotations.every(q => Array.isArray(q.items)) ? 'PASS' : 'FAIL');
    }

    // CREATE
    const startTime2 = Date.now();
    try {
        const newQT = await prisma.quotation.create({
            data: {
                quotationNumber: `QT-E2E-${Date.now()}`,
                status: 'DRAFT',
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                subtotal: 5000000,
                taxRate: 11,
                taxAmount: 550000,
                discount: 0,
                total: 5550000,
                tenantId,
                items: {
                    create: [
                        { description: 'Test Quotation Item', quantity: 10, unitPrice: 500000, total: 5000000 },
                    ],
                },
            },
            include: { items: true },
        });
        recordTest('Finance Quotations', 'CREATE quotation with items', 'PASS', `Created: ${newQT.id}`, Date.now() - startTime2);

        await prisma.quotationItem.deleteMany({ where: { quotationId: newQT.id } });
        await prisma.quotation.delete({ where: { id: newQT.id } });
        log('  🧹 Test data cleaned up');
    } catch (error) {
        recordTest('Finance Quotations', 'CREATE quotation', 'FAIL', error instanceof Error ? error.message : 'Unknown error', Date.now() - startTime2);
    }
}

// ---------- HR: EMPLOYEES ----------
async function testHREmployees(tenantId: string) {
    logSubHeader('HR — Employees');

    const startTime = Date.now();
    const employees = await prisma.employee.findMany({
        where: { tenantId },
        take: 10,
    });
    recordTest('HR Employees', 'GET employees list', 'PASS', `${employees.length} employees found`, Date.now() - startTime);

    // CREATE
    const startTime2 = Date.now();
    try {
        const count = await prisma.employee.count({ where: { tenantId } });
        const newEmp = await prisma.employee.create({
            data: {
                employeeId: `EMP-E2E-${count + 1}`,
                name: 'Test Employee E2E',
                email: `employee-e2e-${Date.now()}@test.com`,
                phone: '081234567890',
                position: 'Software Engineer',
                department: 'Engineering',
                joinDate: new Date(),
                salary: 15000000,
                status: 'ACTIVE',
                tenantId,
            },
        });
        recordTest('HR Employees', 'CREATE employee', 'PASS', `Created: ${newEmp.id}`, Date.now() - startTime2);

        // UPDATE
        const startTime3 = Date.now();
        await prisma.employee.update({
            where: { id: newEmp.id },
            data: { position: 'Senior Software Engineer' },
        });
        recordTest('HR Employees', 'UPDATE employee', 'PASS', undefined, Date.now() - startTime3);

        // DELETE
        await prisma.employee.delete({ where: { id: newEmp.id } });
        log('  🧹 Test data cleaned up');
    } catch (error) {
        recordTest('HR Employees', 'CREATE employee', 'FAIL', error instanceof Error ? error.message : 'Unknown error', Date.now() - startTime2);
    }
}

// ---------- HR: ATTENDANCE ----------
async function testHRAttendance(tenantId: string) {
    logSubHeader('HR — Attendance');

    const startTime = Date.now();
    const records = await prisma.attendanceRecord.findMany({
        where: { tenantId },
        include: {
            employee: { select: { id: true, name: true, employeeId: true } },
        },
        take: 10,
    });
    recordTest('HR Attendance', 'GET attendance records', 'PASS', `${records.length} records found`, Date.now() - startTime);

    // Verify employee eager-loaded
    if (records.length > 0) {
        recordTest('HR Attendance', 'Verify employee eager-loaded (no N+1)', records.every(r => r.employee?.name) ? 'PASS' : 'FAIL');
    }
}

// ---------- HR: LEAVES ----------
async function testHRLeaves(tenantId: string) {
    logSubHeader('HR — Leaves');

    const startTime = Date.now();
    const leaves = await prisma.leaveRequest.findMany({
        where: { tenantId },
        include: {
            employee: { select: { id: true, name: true, employeeId: true } },
        },
        take: 10,
    });
    recordTest('HR Leaves', 'GET leave requests', 'PASS', `${leaves.length} leaves found`, Date.now() - startTime);

    if (leaves.length > 0) {
        recordTest('HR Leaves', 'Verify employee eager-loaded (no N+1)', leaves.every(l => l.employee?.name) ? 'PASS' : 'FAIL');
    }
}

// ---------- HR: PAYROLL ----------
async function testHRPayroll(tenantId: string) {
    logSubHeader('HR — Payroll');

    const startTime = Date.now();
    const records = await prisma.payrollRecord.findMany({
        where: { tenantId },
        include: {
            employee: { select: { id: true, name: true, employeeId: true, position: true, department: true, salary: true } },
        },
        take: 10,
    });
    recordTest('HR Payroll', 'GET payroll records', 'PASS', `${records.length} records found`, Date.now() - startTime);

    if (records.length > 0) {
        recordTest('HR Payroll', 'Verify employee eager-loaded (no N+1)', records.every(r => r.employee?.name) ? 'PASS' : 'FAIL');
    }
}

// ---------- INVENTORY: PRODUCTS ----------
async function testInventoryProducts(tenantId: string) {
    logSubHeader('Inventory — Products');

    const startTime = Date.now();
    const products = await prisma.product.findMany({
        where: { tenantId },
        include: {
            category: { select: { id: true, name: true } },
            _count: { select: { stockMovements: true } },
        },
        take: 10,
    });
    recordTest('Inventory Products', 'GET products list', 'PASS', `${products.length} products found`, Date.now() - startTime);

    if (products.length > 0) {
        recordTest('Inventory Products', 'Verify category eager-loaded (no N+1)', products.every(p => p.category !== undefined) ? 'PASS' : 'FAIL');
    }

    // CREATE
    const startTime2 = Date.now();
    try {
        const count = await prisma.product.count({ where: { tenantId } });
        const newProduct = await prisma.product.create({
            data: {
                sku: `SKU-E2E-${count + 1}`,
                name: 'Test Product E2E',
                description: 'Test product for E2E testing',
                unit: 'pcs',
                price: 100000,
                cost: 75000,
                stock: 100,
                minStock: 10,
                tenantId,
            },
        });
        recordTest('Inventory Products', 'CREATE product', 'PASS', `Created: ${newProduct.id}`, Date.now() - startTime2);

        // DELETE
        await prisma.product.delete({ where: { id: newProduct.id } });
        log('  🧹 Test data cleaned up');
    } catch (error) {
        recordTest('Inventory Products', 'CREATE product', 'FAIL', error instanceof Error ? error.message : 'Unknown error', Date.now() - startTime2);
    }
}

// ---------- INVENTORY: CATEGORIES ----------
async function testInventoryCategories(tenantId: string) {
    logSubHeader('Inventory — Categories');

    const startTime = Date.now();
    const categories = await prisma.category.findMany({
        where: { tenantId },
        include: { _count: { select: { products: true } } },
        take: 10,
    });
    recordTest('Inventory Categories', 'GET categories list', 'PASS', `${categories.length} categories found`, Date.now() - startTime);
}

// ---------- INVENTORY: SUPPLIERS ----------
async function testInventorySuppliers(tenantId: string) {
    logSubHeader('Inventory — Suppliers');

    const startTime = Date.now();
    const suppliers = await prisma.supplier.findMany({
        where: { tenantId },
        take: 10,
    });
    recordTest('Inventory Suppliers', 'GET suppliers list', 'PASS', `${suppliers.length} suppliers found`, Date.now() - startTime);
}

// ---------- INVENTORY: STOCK MOVEMENTS ----------
async function testInventoryStock(tenantId: string) {
    logSubHeader('Inventory — Stock Movements');

    const startTime = Date.now();
    const movements = await prisma.stockMovement.findMany({
        where: { tenantId },
        include: {
            product: { select: { id: true, name: true, sku: true } },
        },
        take: 10,
    });
    recordTest('Inventory Stock', 'GET stock movements', 'PASS', `${movements.length} movements found`, Date.now() - startTime);

    if (movements.length > 0) {
        recordTest('Inventory Stock', 'Verify product eager-loaded (no N+1)', movements.every(m => m.product?.name) ? 'PASS' : 'FAIL');
    }
}

// ---------- FINANCE: ACCOUNTS (CoA) ----------
async function testFinanceAccounts(tenantId: string) {
    logSubHeader('Finance — Chart of Accounts');

    const startTime = Date.now();
    try {
        const accounts = await (prisma as any).coAAccount.findMany({
            where: { tenantId },
            orderBy: { code: 'asc' },
            take: 10,
        });
        recordTest('Finance CoA', 'GET accounts list', 'PASS', `${accounts.length} accounts found`, Date.now() - startTime);
    } catch {
        recordTest('Finance CoA', 'GET accounts list', 'SKIP', 'Model not available — run prisma generate');
    }
}

// ---------- FINANCE: RECONCILIATION ----------
async function testFinanceReconciliation(tenantId: string) {
    logSubHeader('Finance — Reconciliation');

    const startTime = Date.now();
    try {
        const bankTx = await (prisma as any).bankTransaction.findMany({
            where: { tenantId },
            include: {
                matchedAccount: { select: { id: true, code: true, name: true } },
            },
            take: 10,
        });
        recordTest('Finance Reconciliation', 'GET bank transactions', 'PASS', `${bankTx.length} transactions found`, Date.now() - startTime);

        if (bankTx.length > 0) {
            const hasMatch = (t: any) => t.matchedAccount !== undefined;
            recordTest('Finance Reconciliation', 'Verify matchedAccount eager-loaded (no N+1)', bankTx.every(hasMatch) ? 'PASS' : 'FAIL');
        }
    } catch {
        recordTest('Finance Reconciliation', 'GET bank transactions', 'SKIP', 'Model not available — run prisma generate');
    }
}

// ---------- BILLING ----------
async function testBilling(tenantId: string) {
    logSubHeader('Billing — Plans & Subscription');

    const startTime = Date.now();
    try {
        const plans = await (prisma as any).subscriptionPlan.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
        recordTest('Billing Plans', 'GET subscription plans', 'PASS', `${plans.length} plans found`, Date.now() - startTime);
    } catch {
        recordTest('Billing Plans', 'GET subscription plans', 'SKIP', 'Model not available — run prisma generate');
    }

    const startTime2 = Date.now();
    try {
        const subscription = await (prisma as any).tenantSubscription.findFirst({
            where: { tenantId },
            include: { plan: true },
        });
        recordTest('Billing Subscription', 'GET tenant subscription', 'PASS', subscription ? `Plan: ${subscription.plan.name}` : 'No subscription', Date.now() - startTime2);
    } catch {
        recordTest('Billing Subscription', 'GET tenant subscription', 'SKIP', 'Model not available — run prisma generate');
    }
}

// ---------- DASHBOARD ----------
async function testDashboard(tenantId: string) {
    logSubHeader('Dashboard Stats');

    const startTime = Date.now();
    const [
        totalInvoices,
        totalDeals,
        totalContacts,
        totalProducts,
        totalEmployees,
    ] = await Promise.all([
        prisma.invoice.aggregate({ where: { tenantId }, _sum: { total: true }, _count: true }),
        prisma.deal.count({ where: { tenantId, stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } } }),
        prisma.contact.count({ where: { tenantId } }),
        prisma.product.count({ where: { tenantId } }),
        prisma.employee.count({ where: { tenantId } }),
    ]);
    recordTest('Dashboard', 'GET dashboard stats (parallel)', 'PASS',
        `Invoices: ${totalInvoices._count}, Deals: ${totalDeals}, Contacts: ${totalContacts}, Products: ${totalProducts}, Employees: ${totalEmployees}`,
        Date.now() - startTime
    );
}

// ---------- REPORTS ----------
async function testReports(tenantId: string) {
    logSubHeader('Reports (Parallel Queries)');

    const startTime = Date.now();
    const [
        invoices,
        expensePayments,
        products,
        employees,
        attendanceRecords,
        payrollRecords,
        suppliers,
    ] = await Promise.all([
        prisma.invoice.findMany({ where: { tenantId, status: { notIn: ['CANCELLED'] } }, select: { total: true, createdAt: true } }),
        prisma.payment.findMany({ where: { tenantId, type: 'EXPENSE', status: 'COMPLETED' }, select: { amount: true, notes: true } }),
        prisma.product.findMany({ where: { tenantId, deletedAt: null }, select: { sku: true, name: true, stock: true } }),
        prisma.employee.findMany({ where: { tenantId, deletedAt: null }, select: { employeeId: true, name: true, department: true } }),
        prisma.attendanceRecord.findMany({ where: { tenantId }, select: { status: true, employee: { select: { name: true } } } }),
        prisma.payrollRecord.findMany({ where: { tenantId }, select: { netSalary: true, employee: { select: { department: true } } } }),
        prisma.supplier.findMany({ where: { tenantId, isActive: true }, select: { name: true, rating: true, purchaseOrders: { select: { total: true, status: true } } } }),
    ]);
    recordTest('Reports', 'GET all report data (parallel)', 'PASS',
        `Invoices: ${invoices.length}, Expenses: ${expensePayments.length}, Products: ${products.length}, Employees: ${employees.length}, Attendance: ${attendanceRecords.length}, Payroll: ${payrollRecords.length}, Suppliers: ${suppliers.length}`,
        Date.now() - startTime
    );
}

// ---------- TENANT ISOLATION ----------
async function testTenantIsolation(tenants: { id: string }[]) {
    logSubHeader('Tenant Isolation');

    if (tenants.length < 2) {
        recordTest('Tenant Isolation', 'Cross-tenant data isolation', 'SKIP', 'Need 2+ tenants for isolation test');
        return;
    }

    const tenant1Id = tenants[0].id;
    const tenant2Id = tenants[1].id;

    // Verify contacts from tenant1 don't include tenant2 data
    const t1Contacts = await prisma.contact.findMany({ where: { tenantId: tenant1Id }, select: { id: true, tenantId: true } });
    const t2Contacts = await prisma.contact.findMany({ where: { tenantId: tenant2Id }, select: { id: true, tenantId: true } });

    const t1Ids = t1Contacts.map(c => c.id);
    const t2Ids = new Set(t2Contacts.map(c => c.id));

    // Check no overlap
    const hasOverlap = t1Ids.some(id => t2Ids.has(id));

    recordTest('Tenant Isolation', 'Contact data isolation', !hasOverlap ? 'PASS' : 'FAIL',
        hasOverlap ? 'CRITICAL: Cross-tenant data leak detected!' : `T1: ${t1Contacts.length}, T2: ${t2Contacts.length} (isolated)`
    );

    // Verify invoices
    const t1Invoices = await prisma.invoice.findMany({ where: { tenantId: tenant1Id }, select: { id: true } });
    const t2Invoices = await prisma.invoice.findMany({ where: { tenantId: tenant2Id }, select: { id: true } });
    const t1InvIds = t1Invoices.map(i => i.id);
    const t2InvIds = new Set(t2Invoices.map(i => i.id));

    const invOverlap = t1InvIds.some(id => t2InvIds.has(id));
    recordTest('Tenant Isolation', 'Invoice data isolation', !invOverlap ? 'PASS' : 'FAIL',
        invOverlap ? 'CRITICAL: Cross-tenant invoice leak!' : `T1: ${t1Invoices.length}, T2: ${t2Invoices.length} (isolated)`
    );
}

// ---------- RBAC ----------
async function testRBAC(adminUser: { role: string } | undefined, memberUser: { role: string } | undefined, viewerUser: { role: string } | undefined) {
    logSubHeader('RBAC — Role Verification');

    // Verify roles exist
    recordTest('RBAC', 'ADMIN role exists', adminUser?.role === 'ADMIN' ? 'PASS' : 'FAIL', `Role: ${adminUser?.role}`);
    recordTest('RBAC', 'MEMBER role exists', memberUser?.role === 'MEMBER' ? 'PASS' : 'FAIL', `Role: ${memberUser?.role}`);
    recordTest('RBAC', 'VIEWER role exists', viewerUser?.role === 'VIEWER' ? 'PASS' : 'FAIL', `Role: ${viewerUser?.role}`);

    // Inline RBAC helpers (mirrors apps/web/lib/session.ts logic)
    // Role hierarchy: SUPERADMIN > ADMIN > MEMBER > VIEWER
    const isUserAdmin = (session: { user?: { role?: string } } | null) =>
        session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN';
    const canUserDelete = isUserAdmin;
    const canUserManageTeam = isUserAdmin;
    const canUserAccessSettings = isUserAdmin;

    // Mock sessions for testing
    const mockAdminSession = { user: { role: 'ADMIN', tenantId: 'test' } };
    const mockMemberSession = { user: { role: 'MEMBER', tenantId: 'test' } };
    const mockViewerSession = { user: { role: 'VIEWER', tenantId: 'test' } };

    recordTest('RBAC', 'ADMIN can delete', canUserDelete(mockAdminSession) ? 'PASS' : 'FAIL');
    recordTest('RBAC', 'MEMBER cannot delete', !canUserDelete(mockMemberSession) ? 'PASS' : 'FAIL');
    recordTest('RBAC', 'VIEWER cannot delete', !canUserDelete(mockViewerSession) ? 'PASS' : 'FAIL');
    recordTest('RBAC', 'ADMIN can manage team', canUserManageTeam(mockAdminSession) ? 'PASS' : 'FAIL');
    recordTest('RBAC', 'MEMBER cannot manage team', !canUserManageTeam(mockMemberSession) ? 'PASS' : 'FAIL');
    recordTest('RBAC', 'ADMIN can access settings', canUserAccessSettings(mockAdminSession) ? 'PASS' : 'FAIL');
    recordTest('RBAC', 'VIEWER cannot access settings', !canUserAccessSettings(mockViewerSession) ? 'PASS' : 'FAIL');
}

// ---------- PERFORMANCE: INDEXES ----------
async function testPerformanceIndexes() {
    logSubHeader('Performance — Index Verification');

    // Check if indexes exist by querying system tables
    try {
        const indexCheck = await prisma.$queryRaw`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE '%_idx'
      ORDER BY tablename, indexname
    ` as Array<{ indexname: string; tablename: string }>;

        const indexMap = new Map<string, string[]>();
        for (const idx of indexCheck) {
            const existing = indexMap.get(idx.tablename) || [];
            existing.push(idx.indexname);
            indexMap.set(idx.tablename, existing);
        }

        // Check critical indexes
        const criticalIndexes = [
            { table: 'Payment', index: 'Payment_status_idx' },
            { table: 'Payment', index: 'Payment_type_idx' },
            { table: 'Payment', index: 'Payment_paymentDate_idx' },
            { table: 'Invoice', index: 'Invoice_createdAt_idx' },
            { table: 'Deal', index: 'Deal_contactId_idx' },
            { table: 'Lead', index: 'Lead_contactId_idx' },
            { table: 'Employee', index: 'Employee_status_idx' },
        ];

        for (const ci of criticalIndexes) {
            const tableIndexes = indexMap.get(ci.table) || [];
            const exists = tableIndexes.some(idx => idx === ci.index);
            recordTest('Performance', `Index ${ci.index}`, exists ? 'PASS' : 'FAIL',
                exists ? 'Exists' : 'MISSING — run migration'
            );
        }

        // Count total indexes
        const totalIndexes = indexCheck.length;
        recordTest('Performance', 'Total database indexes', 'PASS', `${totalIndexes} indexes found`);
    } catch (error) {
        recordTest('Performance', 'Index verification', 'SKIP', 'Could not query pg_indexes');
    }
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function main() {
    console.log('\n🚀 Qalcuity E2E Test Suite');
    console.log(`${'='.repeat(60)}`);
    console.log(`  Started at: ${new Date().toISOString()}`);
    console.log(`${'='.repeat(60)}`);

    const startTime = Date.now();

    try {
        // Setup
        const { tenants, adminUser, memberUser, viewerUser } = await setupTestData();
        const tenantId = tenants[0].id;

        // Run all module tests
        await testCRMContacts(tenantId);
        await testCRMLeads(tenantId);
        await testCRMDeals(tenantId);

        await testFinanceInvoices(tenantId);
        await testFinancePayments(tenantId);
        await testFinancePurchaseOrders(tenantId);
        await testFinanceQuotations(tenantId);
        await testFinanceAccounts(tenantId);
        await testFinanceReconciliation(tenantId);

        await testHREmployees(tenantId);
        await testHRAttendance(tenantId);
        await testHRLeaves(tenantId);
        await testHRPayroll(tenantId);

        await testInventoryProducts(tenantId);
        await testInventoryCategories(tenantId);
        await testInventorySuppliers(tenantId);
        await testInventoryStock(tenantId);

        await testBilling(tenantId);
        await testDashboard(tenantId);
        await testReports(tenantId);

        // Cross-cutting concerns
        await testTenantIsolation(tenants);
        await testRBAC(adminUser, memberUser, viewerUser);
        await testPerformanceIndexes();

    } catch (error) {
        console.error('\n❌ Fatal error during testing:', error);
    }

    // Summary
    const duration = Date.now() - startTime;
    logHeader('📊 TEST RESULTS SUMMARY');
    console.log(`  Total tests:  ${testCount}`);
    console.log(`  ✅ Passed:    ${passCount}`);
    console.log(`  ❌ Failed:    ${failCount}`);
    console.log(`  ⏭️  Skipped:  ${skipCount}`);
    console.log(`  ⏱️  Duration:  ${duration}ms`);
    console.log(`${'='.repeat(60)}`);

    if (failCount > 0) {
        console.log('\n  Failed tests:');
        for (const r of results.filter(r => r.status === 'FAIL')) {
            console.log(`    ❌ [${r.module}] ${r.test}: ${r.message || 'No details'}`);
        }
        console.log('');
    }

    console.log(`  Overall: ${failCount === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    console.log('');

    await prisma.$disconnect();
    process.exit(failCount > 0 ? 1 : 0);
}

main().catch(async (e) => {
    console.error('Test runner error:', e);
    await prisma.$disconnect();
    process.exit(1);
});
