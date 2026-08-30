import { z } from 'zod';

// ============================================
// Helper: Error messages dalam Bahasa Indonesia
// ============================================

// ============================================
// CRM Schemas
// ============================================

export const createContactSchema = z.object({
    name: z.string().min(1, 'Nama wajib diisi').max(255, 'Nama maksimal 255 karakter'),
    email: z.string().email('Format email tidak valid').max(255).optional().nullable(),
    phone: z.string().max(50, 'Nomor telepon maksimal 50 karakter').optional().nullable(),
    type: z.string().max(50).optional(),
    address: z.string().optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    province: z.string().max(100).optional().nullable(),
    postalCode: z.string().max(10).optional().nullable(),
    taxId: z.string().max(50).optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const updateContactSchema = z.object({
    name: z.string().min(1, 'Nama wajib diisi').max(255, 'Nama maksimal 255 karakter').optional(),
    email: z.string().email('Format email tidak valid').max(255).optional().nullable(),
    phone: z.string().max(50, 'Nomor telepon maksimal 50 karakter').optional().nullable(),
    type: z.string().max(50).optional(),
    company: z.string().max(255).optional().nullable(),
    position: z.string().max(255).optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    province: z.string().max(100).optional().nullable(),
    postalCode: z.string().max(10).optional().nullable(),
    taxId: z.string().max(50).optional().nullable(),
    notes: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
});

export const createLeadSchema = z.object({
    name: z.string().min(1, 'Nama wajib diisi').max(255, 'Nama maksimal 255 karakter'),
    email: z.string().email('Format email tidak valid').max(255).optional().nullable(),
    phone: z.string().max(50, 'Nomor telepon maksimal 50 karakter').optional().nullable(),
    company: z.string().max(255).optional().nullable(),
    source: z.string().max(100).optional().nullable(),
    status: z.string().max(50).optional(),
    value: z.number().min(0, 'Nilai tidak boleh negatif').optional(),
    notes: z.string().optional().nullable(),
    contactId: z.string().optional().nullable(),
});

export const updateLeadSchema = z.object({
    name: z.string().min(1, 'Nama wajib diisi').max(255, 'Nama maksimal 255 karakter').optional(),
    email: z.string().email('Format email tidak valid').max(255).optional().nullable(),
    phone: z.string().max(50, 'Nomor telepon maksimal 50 karakter').optional().nullable(),
    company: z.string().max(255).optional().nullable(),
    source: z.string().max(100).optional().nullable(),
    status: z.string().max(50).optional(),
    value: z.number().min(0, 'Nilai tidak boleh negatif').optional(),
    notes: z.string().optional().nullable(),
    contactId: z.string().optional().nullable(),
});

export const createDealSchema = z.object({
    title: z.string().min(1, 'Judul deal wajib diisi').max(255, 'Judul maksimal 255 karakter'),
    value: z.number().min(0, 'Nilai deal tidak boleh negatif').optional(),
    stage: z.string().max(50).optional(),
    probability: z.number().min(0, 'Probabilitas minimal 0').max(100, 'Probabilitas maksimal 100').optional(),
    closeDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    contactId: z.string().optional().nullable(),
    leadId: z.string().optional().nullable(),
});

export const updateDealSchema = z.object({
    title: z.string().min(1, 'Judul deal wajib diisi').max(255, 'Judul maksimal 255 karakter').optional(),
    value: z.number().min(0, 'Nilai deal tidak boleh negatif').optional(),
    stage: z.string().max(50).optional(),
    probability: z.number().min(0, 'Probabilitas minimal 0').max(100, 'Probabilitas maksimal 100').optional(),
    closeDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    contactId: z.string().optional().nullable(),
    leadId: z.string().optional().nullable(),
});

// ============================================
// Finance Schemas
// ============================================

const invoiceItemSchema = z.object({
    description: z.string().min(1, 'Deskripsi item wajib diisi'),
    quantity: z.number().int('Jumlah harus bilangan bulat').min(1, 'Jumlah minimal 1'),
    unitPrice: z.number().min(0, 'Harga satuan tidak boleh negatif'),
    total: z.number().min(0).optional(),
});

export const createInvoiceSchema = z.object({
    contactId: z.string().optional().nullable(),
    customerName: z.string().min(1, 'Nama customer wajib diisi').max(255).optional(),
    customerEmail: z.string().email('Format email tidak valid').optional().nullable(),
    customerPhone: z.string().max(50).optional().nullable(),
    customerAddress: z.string().optional().nullable(),
    items: z.array(invoiceItemSchema).min(1, 'Minimal 1 item wajib diisi'),
    dueDate: z.string().optional().nullable(),
    taxRate: z.number().min(0).max(100, 'Pajak maksimal 100%').optional(),
    notes: z.string().optional().nullable(),
}).refine((data) => data.contactId || data.customerName, {
    message: 'Customer wajib diisi (contactId atau customerName)',
});

export const updateInvoiceSchema = z.object({
    status: z.string().max(50).optional(),
    dueDate: z.string().optional().nullable(),
    taxRate: z.number().min(0).max(100, 'Pajak maksimal 100%').optional(),
    notes: z.string().optional().nullable(),
    items: z.array(invoiceItemSchema).min(1, 'Minimal 1 item wajib diisi').optional(),
});

const paymentMethodEnum = z.enum([
    'BANK_TRANSFER', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'E_WALLET', 'CHECK', 'OTHER',
]);
const paymentStatusEnum = z.enum(['PENDING', 'COMPLETED', 'FAILED']);
const paymentTypeEnum = z.enum(['INCOME', 'EXPENSE']);

export const createPaymentSchema = z.object({
    amount: z.number().min(0.01, 'Jumlah pembayaran harus lebih dari 0'),
    method: paymentMethodEnum,
    status: paymentStatusEnum.optional(),
    type: paymentTypeEnum.optional(),
    date: z.string().optional().nullable(),
    reference: z.string().max(255).optional().nullable(),
    notes: z.string().optional().nullable(),
    invoiceId: z.string().optional().nullable(),
});

export const updatePaymentSchema = z.object({
    amount: z.number().min(0.01, 'Jumlah pembayaran harus lebih dari 0').optional(),
    method: paymentMethodEnum.optional(),
    status: paymentStatusEnum.optional(),
    type: paymentTypeEnum.optional(),
    date: z.string().optional().nullable(),
    reference: z.string().max(255).optional().nullable(),
    notes: z.string().optional().nullable(),
});

const poItemSchema = z.object({
    description: z.string().min(1, 'Deskripsi item wajib diisi'),
    quantity: z.number().int('Jumlah harus bilangan bulat').min(1, 'Jumlah minimal 1'),
    unitPrice: z.number().min(0, 'Harga satuan tidak boleh negatif'),
    total: z.number().min(0).optional(),
});

export const createPurchaseOrderSchema = z.object({
    supplierId: z.string().optional().nullable(),
    supplierName: z.string().min(1, 'Nama supplier wajib diisi').max(255).optional(),
    supplierEmail: z.string().email('Format email tidak valid').optional().nullable(),
    supplierPhone: z.string().max(50).optional().nullable(),
    supplierAddress: z.string().optional().nullable(),
    items: z.array(poItemSchema).min(1, 'Minimal 1 item wajib diisi'),
    expectedDelivery: z.string().optional().nullable(),
    taxRate: z.number().min(0).max(100, 'Pajak maksimal 100%').optional(),
    notes: z.string().optional().nullable(),
}).refine((data) => data.supplierId || data.supplierName, {
    message: 'Supplier wajib diisi (supplierId atau supplierName)',
});

export const updatePurchaseOrderSchema = z.object({
    status: z.string().max(50).optional(),
    expectedDelivery: z.string().optional().nullable(),
    taxRate: z.number().min(0).max(100, 'Pajak maksimal 100%').optional(),
    notes: z.string().optional().nullable(),
    items: z.array(poItemSchema).min(1, 'Minimal 1 item wajib diisi').optional(),
});

const quotationItemSchema = z.object({
    description: z.string().min(1, 'Deskripsi item wajib diisi'),
    quantity: z.number().int('Jumlah harus bilangan bulat').min(1, 'Jumlah minimal 1'),
    unitPrice: z.number().min(0, 'Harga satuan tidak boleh negatif'),
    total: z.number().min(0).optional(),
});

export const createQuotationSchema = z.object({
    contactId: z.string().optional().nullable(),
    customerName: z.string().min(1, 'Nama customer wajib diisi').max(255).optional(),
    customerEmail: z.string().email('Format email tidak valid').optional().nullable(),
    customerPhone: z.string().max(50).optional().nullable(),
    customerAddress: z.string().optional().nullable(),
    items: z.array(quotationItemSchema).min(1, 'Minimal 1 item wajib diisi'),
    validUntil: z.string().optional().nullable(),
    taxRate: z.number().min(0).max(100, 'Pajak maksimal 100%').optional(),
    discount: z.number().min(0, 'Diskon tidak boleh negatif').optional(),
    notes: z.string().optional().nullable(),
    terms: z.string().optional().nullable(),
}).refine((data) => data.contactId || data.customerName, {
    message: 'Customer wajib diisi (contactId atau customerName)',
});

export const updateQuotationSchema = z.object({
    status: z.string().max(50).optional(),
    validUntil: z.string().optional().nullable(),
    taxRate: z.number().min(0).max(100, 'Pajak maksimal 100%').optional(),
    discount: z.number().min(0, 'Diskon tidak boleh negatif').optional(),
    notes: z.string().optional().nullable(),
    terms: z.string().optional().nullable(),
    items: z.array(quotationItemSchema).min(1, 'Minimal 1 item wajib diisi').optional(),
});

// ============================================
// HR Schemas
// ============================================

export const createEmployeeSchema = z.object({
    name: z.string().min(2, 'Nama harus minimal 2 karakter').max(255, 'Nama maksimal 255 karakter'),
    email: z.string().email('Format email tidak valid').max(255),
    phone: z.string().max(50, 'Nomor telepon maksimal 50 karakter').optional().nullable(),
    position: z.string().min(1, 'Posisi wajib diisi').max(255),
    department: z.string().min(1, 'Departemen wajib diisi').max(255),
    joinDate: z.string().min(1, 'Tanggal bergabung wajib diisi'),
    salary: z.number().min(0, 'Gaji tidak boleh negatif').optional(),
    status: z.string().max(50).optional(),
});

export const updateEmployeeSchema = z.object({
    name: z.string().min(2, 'Nama harus minimal 2 karakter').max(255, 'Nama maksimal 255 karakter').optional(),
    email: z.string().email('Format email tidak valid').max(255).optional(),
    phone: z.string().max(50, 'Nomor telepon maksimal 50 karakter').optional().nullable(),
    position: z.string().min(1, 'Posisi wajib diisi').max(255).optional(),
    department: z.string().min(1, 'Departemen wajib diisi').max(255).optional(),
    joinDate: z.string().optional(),
    salary: z.number().min(0, 'Gaji tidak boleh negatif').optional(),
    status: z.string().max(50).optional(),
});

export const createLeaveSchema = z.object({
    employeeId: z.string().min(1, 'ID karyawan wajib diisi'),
    type: z.string().min(1, 'Tipe cuti wajib diisi').max(50),
    startDate: z.string().min(1, 'Tanggal mulai wajib diisi'),
    endDate: z.string().min(1, 'Tanggal selesai wajib diisi'),
    reason: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const updateLeaveSchema = z.object({
    type: z.string().max(50).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    days: z.number().int().min(1).optional(),
    reason: z.string().optional().nullable(),
    status: z.string().max(50).optional(),
    approvedBy: z.string().max(255).optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const approveLeaveSchema = z.object({
    id: z.string().min(1, 'ID wajib diisi'),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED'], {
        message: 'Status harus PENDING, APPROVED, atau REJECTED',
    }),
    approvedBy: z.string().max(255).optional().nullable(),
});

export const createPayrollSchema = z.object({
    employeeId: z.string().min(1, 'ID karyawan wajib diisi'),
    period: z.string().min(1, 'Periode wajib diisi').max(50),
    baseSalary: z.number().min(0, 'Gaji pokok tidak boleh negatif'),
    allowances: z.number().min(0, 'Tunjangan tidak boleh negatif').optional(),
    deductions: z.number().min(0, 'Potongan tidak boleh negatif').optional(),
    bonus: z.number().min(0, 'Bonus tidak boleh negatif').optional(),
    notes: z.string().optional().nullable(),
});

export const updatePayrollSchema = z.object({
    period: z.string().max(50).optional(),
    baseSalary: z.number().min(0, 'Gaji pokok tidak boleh negatif').optional(),
    allowances: z.number().min(0, 'Tunjangan tidak boleh negatif').optional(),
    deductions: z.number().min(0, 'Potongan tidak boleh negatif').optional(),
    bonus: z.number().min(0, 'Bonus tidak boleh negatif').optional(),
    status: z.string().max(50).optional(),
    notes: z.string().optional().nullable(),
});

export const approvePayrollSchema = z.object({
    id: z.string().min(1, 'ID wajib diisi'),
    status: z.enum(['PENDING', 'PROCESSED', 'PAID'], {
        message: 'Status harus PENDING, PROCESSED, atau PAID',
    }),
});

// ============================================
// Inventory Schemas
// ============================================

export const createProductSchema = z.object({
    sku: z.string().min(1, 'SKU wajib diisi').max(50, 'SKU maksimal 50 karakter').regex(
        /^[A-Za-z0-9_-]+$/,
        'SKU hanya boleh berisi huruf, angka, hyphen, dan underscore'
    ),
    name: z.string().min(1, 'Nama produk wajib diisi').max(255, 'Nama produk maksimal 255 karakter'),
    description: z.string().optional().nullable(),
    unit: z.string().max(20).optional(),
    price: z.number().min(0, 'Harga jual tidak boleh negatif').optional(),
    cost: z.number().min(0, 'Harga beli tidak boleh negatif').optional(),
    stock: z.number().int('Stok harus bilangan bulat').min(0, 'Stok tidak boleh negatif').optional(),
    minStock: z.number().int('Minimum stok harus bilangan bulat').min(0, 'Minimum stok tidak boleh negatif').optional(),
    categoryId: z.string().optional().nullable(),
});

export const updateProductSchema = z.object({
    sku: z.string().min(1, 'SKU wajib diisi').max(50, 'SKU maksimal 50 karakter').regex(
        /^[A-Za-z0-9_-]+$/,
        'SKU hanya boleh berisi huruf, angka, hyphen, dan underscore'
    ).optional(),
    name: z.string().min(2, 'Nama produk harus minimal 2 karakter').max(255, 'Nama produk maksimal 255 karakter').optional(),
    description: z.string().optional().nullable(),
    unit: z.string().max(20).optional(),
    price: z.number().min(0, 'Harga jual tidak boleh negatif').optional(),
    cost: z.number().min(0, 'Harga beli tidak boleh negatif').optional(),
    stock: z.number().int('Stok harus bilangan bulat').min(0, 'Stok tidak boleh negatif').optional(),
    minStock: z.number().int('Minimum stok harus bilangan bulat').min(0, 'Minimum stok tidak boleh negatif').optional(),
    categoryId: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
});

export const createCategorySchema = z.object({
    name: z.string().min(1, 'Nama kategori wajib diisi').max(255, 'Nama kategori maksimal 255 karakter'),
    description: z.string().optional().nullable(),
});

export const createSupplierSchema = z.object({
    name: z.string().min(1, 'Nama supplier wajib diisi').max(255, 'Nama supplier maksimal 255 karakter'),
    contactPerson: z.string().max(255).optional().nullable(),
    email: z.string().email('Format email tidak valid').max(255).optional().nullable(),
    phone: z.string().max(50, 'Nomor telepon maksimal 50 karakter').optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    rating: z.number().min(0, 'Rating minimal 0').max(5, 'Rating maksimal 5').optional(),
    notes: z.string().optional().nullable(),
});

export const updateSupplierSchema = z.object({
    name: z.string().min(1, 'Nama supplier wajib diisi').max(255, 'Nama supplier maksimal 255 karakter').optional(),
    contactPerson: z.string().max(255).optional().nullable(),
    email: z.string().email('Format email tidak valid').max(255).optional().nullable(),
    phone: z.string().max(50, 'Nomor telepon maksimal 50 karakter').optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    rating: z.number().min(0, 'Rating minimal 0').max(5, 'Rating maksimal 5').optional(),
    notes: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
});

// ============================================
// CoA (Chart of Accounts) Schemas
// ============================================

const coaAccountTypeEnum = z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']);

export const createCoAAccountSchema = z.object({
    code: z.string().min(1, 'Kode akun wajib diisi').max(20, 'Kode akun maksimal 20 karakter'),
    name: z.string().min(1, 'Nama akun wajib diisi').max(255, 'Nama akun maksimal 255 karakter'),
    type: coaAccountTypeEnum,
    description: z.string().max(500, 'Deskripsi maksimal 500 karakter').optional(),
    parentId: z.string().optional().nullable(),
    balance: z.number().optional(),
});

export const updateCoAAccountSchema = z.object({
    code: z.string().min(1, 'Kode akun wajib diisi').max(20, 'Kode akun maksimal 20 karakter').optional(),
    name: z.string().min(1, 'Nama akun wajib diisi').max(255, 'Nama akun maksimal 255 karakter').optional(),
    type: coaAccountTypeEnum.optional(),
    description: z.string().max(500, 'Deskripsi maksimal 500 karakter').optional(),
    parentId: z.string().optional().nullable(),
    balance: z.number().optional(),
    isActive: z.boolean().optional(),
});

// ============================================
// Reconciliation Schemas
// ============================================

export const reconcileTransactionSchema = z.object({
    bankTransactionId: z.string().min(1, 'ID transaksi bank wajib diisi'),
    bookTransactionId: z.string().optional(),
});

export const unreconcileTransactionSchema = z.object({
    bankTransactionId: z.string().min(1, 'ID transaksi bank wajib diisi'),
});

// ============================================
// Helper Function: Format Zod errors
// ============================================

export function formatZodError(error: z.ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) {
            fieldErrors[path] = [];
        }
        fieldErrors[path].push(issue.message);
    }
    return {
        message: 'Validasi gagal',
        details: fieldErrors,
    };
}
