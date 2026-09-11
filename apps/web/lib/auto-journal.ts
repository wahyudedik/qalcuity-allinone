// ============================================
// Auto Journal Entry Generation
// Generates journal entries automatically when:
// - Invoice status → PAID
// - PurchaseOrder status → PAID / RECEIVED
// - Payment is created (COMPLETED)
//
// Also handles auto stock update when Invoice → PAID
// ============================================

import { prisma } from './db';
import { logAudit } from './audit';
import { Prisma } from '@prisma/client';

// ============================================
// Types
// ============================================

interface JournalEntryLineInput {
    accountId: string;
    debit: number;
    credit: number;
    description?: string;
}

interface AutoJournalResult {
    success: boolean;
    journalEntryId?: string;
    error?: string;
}

interface InvoiceData {
    id: string;
    invoiceNumber: string;
    total: number;
    subtotal: number;
    taxAmount: number;
    tenantId: string;
    contactId?: string | null;
    items: Array<{
        id: string;
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
        productId?: string | null;
    }>;
}

interface PurchaseOrderData {
    id: string;
    poNumber: string;
    total: number;
    subtotal: number;
    taxAmount: number;
    tenantId: string;
    supplierId?: string | null;
    items: Array<{
        id: string;
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
        productId?: string | null;
    }>;
}

interface PaymentData {
    id: string;
    paymentNumber: string;
    amount: number;
    type: string;       // INCOME | EXPENSE
    method: string;
    tenantId: string;
    invoiceId?: string | null;
}

// ============================================
// Account Lookup Helpers
// ============================================

/**
 * Find a CoA account by code for a tenant.
 * Returns the account ID, or null if not found.
 */
async function findAccountIdByCode(
    tenantId: string,
    code: string
): Promise<string | null> {
    const account = await prisma.coAAccount.findUnique({
        where: { tenantId_code: { tenantId, code } },
        select: { id: true },
    });
    return account?.id ?? null;
}

/**
 * Ensure standard CoA accounts exist for a tenant.
 * Creates them if they don't exist yet.
 * Returns the account IDs.
 */
async function ensureStandardAccounts(tenantId: string): Promise<{
    accountsReceivableId: string;
    accountsPayableId: string;
    revenueId: string;
    cashBankId: string;
    inventoryId: string;
    expenseId: string;
}> {
    const defaultAccounts = [
        { code: '1102', name: 'Piutang Usaha', type: 'ASSET' },       // Accounts Receivable
        { code: '2101', name: 'Utang Usaha', type: 'LIABILITY' },     // Accounts Payable
        { code: '4101', name: 'Pendapatan Usaha', type: 'REVENUE' },  // Revenue
        { code: '1101', name: 'Kas & Bank', type: 'ASSET' },          // Cash & Bank
        { code: '1201', name: 'Persediaan', type: 'ASSET' },          // Inventory
        { code: '5101', name: 'Biaya Operasional', type: 'EXPENSE' }, // Operating Expense
    ];

    const accountIds: Record<string, string> = {};

    for (const acct of defaultAccounts) {
        let existing = await prisma.coAAccount.findUnique({
            where: { tenantId_code: { tenantId, code: acct.code } },
            select: { id: true },
        });

        if (!existing) {
            existing = await prisma.coAAccount.create({
                data: {
                    tenantId,
                    code: acct.code,
                    name: acct.name,
                    type: acct.type,
                    description: `${acct.name} — Auto-created`,
                },
                select: { id: true },
            });
        }

        const keyMap: Record<string, string> = {
            '1102': 'accountsReceivableId',
            '2101': 'accountsPayableId',
            '4101': 'revenueId',
            '1101': 'cashBankId',
            '1201': 'inventoryId',
            '5101': 'expenseId',
        };

        accountIds[keyMap[acct.code]] = existing.id;
    }

    return accountIds as {
        accountsReceivableId: string;
        accountsPayableId: string;
        revenueId: string;
        cashBankId: string;
        inventoryId: string;
        expenseId: string;
    };
}

// ============================================
// Entry Number Generator
// ============================================

async function generateEntryNumber(
    tx: Prisma.TransactionClient,
    prefix: string
): Promise<string> {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const timestamp = Date.now().toString(36).toUpperCase();
    return `${prefix}-${dateStr}-${timestamp}`;
}

// ============================================
// Core: Create Journal Entry
// ============================================

async function createJournalEntry(
    tx: Prisma.TransactionClient,
    params: {
        tenantId: string;
        userId: string;
        description: string;
        reference: string;
        sourceType: string;
        sourceId: string;
        lines: JournalEntryLineInput[];
    }
): Promise<string> {
    const totalDebit = params.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = params.lines.reduce((sum, l) => sum + l.credit, 0);

    // Validate: debit must equal credit
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(
            `Journal entry imbalance: debit=${totalDebit}, credit=${totalCredit}`
        );
    }

    const entryNumber = await generateEntryNumber(tx, params.sourceType.toUpperCase().slice(0, 3));

    const journalEntry = await tx.journalEntry.create({
        data: {
            tenantId: params.tenantId,
            entryNumber,
            description: params.description,
            reference: params.reference,
            sourceType: params.sourceType,
            sourceId: params.sourceId,
            status: 'POSTED',
            totalDebit,
            totalCredit,
            createdBy: params.userId,
            items: {
                create: params.lines.map((line) => ({
                    tenantId: params.tenantId,
                    accountId: line.accountId,
                    debit: line.debit,
                    credit: line.credit,
                    description: line.description || null,
                })),
            },
        },
    });

    return journalEntry.id;
}

// ============================================
// Invoice PAID → Journal Entry + Stock Update
// ============================================

/**
 * Generate journal entry when invoice status changes to PAID.
 *
 * Journal Entry pattern:
 *   Debit  Accounts Receivable (1102)
 *   Credit Revenue (4101)
 *
 * Also updates stock for each item that has a productId.
 */
export async function generateInvoiceJournalEntry(
    invoice: InvoiceData,
    tenantId: string,
    userId: string,
    request?: Request
): Promise<AutoJournalResult> {
    try {
        // Ensure standard accounts exist
        const accounts = await ensureStandardAccounts(tenantId);

        // Check for duplicate journal entry (idempotency)
        const existingJE = await prisma.journalEntry.findFirst({
            where: {
                tenantId,
                sourceType: 'invoice',
                sourceId: invoice.id,
                status: 'POSTED',
            },
        });

        if (existingJE) {
            return {
                success: true,
                journalEntryId: existingJE.id,
            };
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Journal Entry
            const lines: JournalEntryLineInput[] = [
                {
                    accountId: accounts.accountsReceivableId,
                    debit: Number(invoice.total),
                    credit: 0,
                    description: `Piutang dari ${invoice.invoiceNumber}`,
                },
                {
                    accountId: accounts.revenueId,
                    debit: 0,
                    credit: Number(invoice.total),
                    description: `Pendapatan dari ${invoice.invoiceNumber}`,
                },
            ];

            const jeId = await createJournalEntry(tx, {
                tenantId,
                userId,
                description: `Auto JE: Invoice ${invoice.invoiceNumber} PAID`,
                reference: invoice.invoiceNumber,
                sourceType: 'invoice',
                sourceId: invoice.id,
                lines,
            });

            // 2. Auto Stock Update: decrease stock for each item with productId
            for (const item of invoice.items) {
                if (item.productId) {
                    // Decrease product stock
                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            stock: {
                                decrement: Number(item.quantity),
                            },
                        },
                    });

                    // Create StockMovement record for audit
                    await tx.stockMovement.create({
                        data: {
                            type: 'OUT',
                            quantity: Number(item.quantity),
                            reference: invoice.invoiceNumber,
                            notes: `Auto stock reduction: Invoice ${invoice.invoiceNumber} PAID`,
                            tenantId,
                            productId: item.productId,
                        },
                    });
                }
            }

            return jeId;
        });

        // Audit log (non-blocking)
        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'JournalEntry',
            entityId: result,
            newValues: {
                sourceType: 'invoice',
                sourceId: invoice.id,
                totalDebit: invoice.total,
                totalCredit: invoice.total,
                description: `Auto JE: Invoice ${invoice.invoiceNumber} PAID`,
            },
            request,
        });

        return { success: true, journalEntryId: result };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[AutoJournal] Failed for invoice:', message);
        return { success: false, error: message };
    }
}

// ============================================
// PurchaseOrder PAID/RECEIVED → Journal Entry + Stock Update
// ============================================

/**
 * Generate journal entry when purchase order status changes to PAID or RECEIVED.
 *
 * RECEIVED pattern:
 *   Debit  Inventory/Expense (1201/5101)
 *   Credit Accounts Payable (2101)
 *
 * PAID pattern:
 *   Debit  Accounts Payable (2101)
 *   Credit Cash/Bank (1101)
 *
 * Stock update: increase stock for each item with productId (on RECEIVED only).
 */
export async function generatePurchaseOrderJournalEntry(
    purchaseOrder: PurchaseOrderData,
    tenantId: string,
    userId: string,
    status: string,
    request?: Request
): Promise<AutoJournalResult> {
    try {
        const accounts = await ensureStandardAccounts(tenantId);

        // Check for duplicate journal entry (idempotency)
        const existingJE = await prisma.journalEntry.findFirst({
            where: {
                tenantId,
                sourceType: 'purchase_order',
                sourceId: purchaseOrder.id,
                status: 'POSTED',
                // Check if there's already an entry for this specific status
                description: { contains: status },
            },
        });

        if (existingJE) {
            return { success: true, journalEntryId: existingJE.id };
        }

        const result = await prisma.$transaction(async (tx) => {
            let lines: JournalEntryLineInput[] = [];
            let description = '';

            if (status === 'RECEIVED') {
                // Debit Inventory, Credit Accounts Payable
                lines = [
                    {
                        accountId: accounts.inventoryId,
                        debit: Number(purchaseOrder.total),
                        credit: 0,
                        description: `Persediaan dari ${purchaseOrder.poNumber}`,
                    },
                    {
                        accountId: accounts.accountsPayableId,
                        debit: 0,
                        credit: Number(purchaseOrder.total),
                        description: `Utang dari ${purchaseOrder.poNumber}`,
                    },
                ];
                description = `Auto JE: PO ${purchaseOrder.poNumber} RECEIVED`;

                // Auto stock update: increase stock for each item with productId
                for (const item of purchaseOrder.items) {
                    if (item.productId) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: {
                                stock: {
                                    increment: Number(item.quantity),
                                },
                            },
                        });

                        await tx.stockMovement.create({
                            data: {
                                type: 'IN',
                                quantity: Number(item.quantity),
                                reference: purchaseOrder.poNumber,
                                notes: `Auto stock increase: PO ${purchaseOrder.poNumber} RECEIVED`,
                                tenantId,
                                productId: item.productId,
                            },
                        });
                    }
                }
            } else if (status === 'PAID') {
                // Debit Accounts Payable, Credit Cash/Bank
                lines = [
                    {
                        accountId: accounts.accountsPayableId,
                        debit: Number(purchaseOrder.total),
                        credit: 0,
                        description: `Pembayaran utang ${purchaseOrder.poNumber}`,
                    },
                    {
                        accountId: accounts.cashBankId,
                        debit: 0,
                        credit: Number(purchaseOrder.total),
                        description: `Pembayaran PO ${purchaseOrder.poNumber}`,
                    },
                ];
                description = `Auto JE: PO ${purchaseOrder.poNumber} PAID`;
            } else {
                throw new Error(`Unsupported PO status for journal: ${status}`);
            }

            const jeId = await createJournalEntry(tx, {
                tenantId,
                userId,
                description,
                reference: purchaseOrder.poNumber,
                sourceType: 'purchase_order',
                sourceId: purchaseOrder.id,
                lines,
            });

            return jeId;
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'JournalEntry',
            entityId: result,
            newValues: {
                sourceType: 'purchase_order',
                sourceId: purchaseOrder.id,
                status,
                totalDebit: purchaseOrder.total,
                totalCredit: purchaseOrder.total,
                description: `Auto JE: PO ${purchaseOrder.poNumber} ${status}`,
            },
            request,
        });

        return { success: true, journalEntryId: result };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[AutoJournal] Failed for purchase order:', message);
        return { success: false, error: message };
    }
}

// ============================================
// Payment COMPLETED → Journal Entry
// ============================================

/**
 * Generate journal entry when a payment is completed.
 *
 * INCOME (customer pays us):
 *   Debit  Cash/Bank (1101)
 *   Credit Accounts Receivable (1102)
 *
 * EXPENSE (we pay supplier):
 *   Debit  Accounts Payable (2101)
 *   Credit Cash/Bank (1101)
 */
export async function generatePaymentJournalEntry(
    payment: PaymentData,
    tenantId: string,
    userId: string,
    request?: Request
): Promise<AutoJournalResult> {
    try {
        const accounts = await ensureStandardAccounts(tenantId);

        // Check for duplicate (idempotency)
        const existingJE = await prisma.journalEntry.findFirst({
            where: {
                tenantId,
                sourceType: 'payment',
                sourceId: payment.id,
                status: 'POSTED',
            },
        });

        if (existingJE) {
            return { success: true, journalEntryId: existingJE.id };
        }

        const result = await prisma.$transaction(async (tx) => {
            let lines: JournalEntryLineInput[] = [];
            let description = '';

            if (payment.type === 'INCOME') {
                // Customer pays us: Debit Cash, Credit AR
                lines = [
                    {
                        accountId: accounts.cashBankId,
                        debit: Number(payment.amount),
                        credit: 0,
                        description: `Penerimaan dari ${payment.paymentNumber}`,
                    },
                    {
                        accountId: accounts.accountsReceivableId,
                        debit: 0,
                        credit: Number(payment.amount),
                        description: `Pelunasan ${payment.paymentNumber}`,
                    },
                ];
                description = `Auto JE: Pembayaran Masuk ${payment.paymentNumber}`;
            } else {
                // We pay supplier: Debit AP, Credit Cash
                lines = [
                    {
                        accountId: accounts.accountsPayableId,
                        debit: Number(payment.amount),
                        credit: 0,
                        description: `Pembayaran ke ${payment.paymentNumber}`,
                    },
                    {
                        accountId: accounts.cashBankId,
                        debit: 0,
                        credit: Number(payment.amount),
                        description: `Pengeluaran ${payment.paymentNumber}`,
                    },
                ];
                description = `Auto JE: Pembayaran Keluar ${payment.paymentNumber}`;
            }

            const jeId = await createJournalEntry(tx, {
                tenantId,
                userId,
                description,
                reference: payment.paymentNumber,
                sourceType: 'payment',
                sourceId: payment.id,
                lines,
            });

            return jeId;
        });

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'JournalEntry',
            entityId: result,
            newValues: {
                sourceType: 'payment',
                sourceId: payment.id,
                type: payment.type,
                totalDebit: payment.amount,
                totalCredit: payment.amount,
                description: `Auto JE: Pembayaran ${payment.type} ${payment.paymentNumber}`,
            },
            request,
        });

        return { success: true, journalEntryId: result };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[AutoJournal] Failed for payment:', message);
        return { success: false, error: message };
    }
}
