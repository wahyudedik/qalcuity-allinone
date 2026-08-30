/**
 * Reconciliation Seed Data
 * Bank transactions, book transactions, bank accounts, and summary.
 *
 * Karena tidak ada Prisma model khusus untuk reconciliation,
 * data ini di-export sebagai JSON constant yang di-import oleh API route.
 */

export interface BankAccount {
    id: string
    name: string
    number: string
    bank: string
}

export interface BankTransaction {
    id: string
    date: string
    description: string
    amount: number
    type: 'credit' | 'debit'
    status: 'matched' | 'unmatched' | 'discrepancy'
    bookTransactionId?: string
    bankReference?: string
}

export interface BookTransaction {
    id: string
    date: string
    description: string
    amount: number
    type: 'income' | 'expense'
    reference: string
    category: string
}

export const BANK_ACCOUNTS: BankAccount[] = [
    { id: '1', name: 'Bank BCA', number: '****1234', bank: 'BCA' },
    { id: '2', name: 'Bank Mandiri', number: '****5678', bank: 'Mandiri' },
    { id: '3', name: 'Bank BRI', number: '****9012', bank: 'BRI' },
]

export const BANK_TRANSACTIONS: BankTransaction[] = [
    { id: 'BT001', date: '2026-08-28', description: 'Transfer Masuk dari PT Maju Jaya', amount: 15500000, type: 'credit', status: 'unmatched', bankReference: 'TRF-20260828-001' },
    { id: 'BT002', date: '2026-08-27', description: 'Pembayaran Invoice INV-2026-0892', amount: -8250000, type: 'debit', status: 'matched', bookTransactionId: 'TX001', bankReference: 'TRF-20260827-002' },
    { id: 'BT003', date: '2026-08-27', description: 'Biaya Admin Bank', amount: -25000, type: 'debit', status: 'discrepancy', bankReference: 'ADM-20260827' },
    { id: 'BT004', date: '2026-08-26', description: 'Transfer Masuk dari CV Berkah', amount: 5000000, type: 'credit', status: 'unmatched', bankReference: 'TRF-20260826-004' },
    { id: 'BT005', date: '2026-08-26', description: 'Pembayaran Supplier PT ABC', amount: -3750000, type: 'debit', status: 'matched', bookTransactionId: 'TX003', bankReference: 'TRF-20260826-005' },
    { id: 'BT006', date: '2026-08-25', description: 'Transfer Masuk dari PT Sejahtera', amount: 23000000, type: 'credit', status: 'unmatched', bankReference: 'TRF-20260825-006' },
    { id: 'BT007', date: '2026-08-25', description: 'Pembayaran Gaji Karyawan', amount: -45000000, type: 'debit', status: 'matched', bookTransactionId: 'TX005', bankReference: 'SALARY-20260825' },
    { id: 'BT008', date: '2026-08-24', description: 'Biaya Transfer Out', amount: -6500, type: 'debit', status: 'discrepancy', bankReference: 'FEE-20260824' },
]

export const BOOK_TRANSACTIONS: BookTransaction[] = [
    { id: 'TX001', date: '2026-08-27', description: 'Pembayaran Invoice dari PT Maju Jaya', amount: 8250000, type: 'income', reference: 'INV-2026-0892', category: 'Penjualan' },
    { id: 'TX002', date: '2026-08-26', description: 'Pendapatan Service', amount: 5000000, type: 'income', reference: 'SVC-2026-012', category: 'Service' },
    { id: 'TX003', date: '2026-08-26', description: 'Pembelian Bahan Baku', amount: 3750000, type: 'expense', reference: 'PO-2026-0234', category: 'Pembelian' },
    { id: 'TX004', date: '2026-08-25', description: 'Biaya Operasional', amount: 2500000, type: 'expense', reference: 'EXP-2026-045', category: 'Operasional' },
    { id: 'TX005', date: '2026-08-25', description: 'Gaji Karyawan Agustus', amount: 45000000, type: 'expense', reference: 'PAYROLL-2026-08', category: 'Gaji' },
]

export const RECONCILIATION_SUMMARY = {
    bookBalance: 50000000,
    bankBalance: 52500000,
    difference: 2500000,
    matchedCount: 3,
    unmatchedCount: 3,
    discrepancyCount: 2,
    lastReconciliation: '2026-08-15',
}
