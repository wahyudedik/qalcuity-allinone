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
// CRM Activity Schemas
// ============================================

export const createActivitySchema = z.object({
    entityType: z.enum(['CONTACT', 'LEAD', 'DEAL'], { message: 'Jenis entitas tidak valid' }),
    entityId: z.string().min(1, 'ID entitas wajib diisi'),
    type: z.enum(['CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK'], { message: 'Jenis aktivitas tidak valid' }),
    subject: z.string().min(1, 'Subjek wajib diisi').max(255, 'Subjek maksimal 255 karakter'),
    description: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
});

export const updateActivitySchema = z.object({
    type: z.enum(['CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK']).optional(),
    subject: z.string().min(1, 'Subjek wajib diisi').max(255, 'Subjek maksimal 255 karakter').optional(),
    description: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
    completedAt: z.string().optional().nullable(),
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
    taxCode: z.string().max(50).optional().nullable(),
    taxAmount: z.number().min(0).optional(),
    notes: z.string().optional().nullable(),
}).refine((data) => data.contactId || data.customerName, {
    message: 'Customer wajib diisi (contactId atau customerName)',
});

export const updateInvoiceSchema = z.object({
    status: z.string().max(50).optional(),
    dueDate: z.string().optional().nullable(),
    taxRate: z.number().min(0).max(100, 'Pajak maksimal 100%').optional(),
    taxCode: z.string().max(50).optional().nullable(),
    taxAmount: z.number().min(0).optional(),
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

export const calculatePayrollSchema = z.object({
    employeeId: z.string().min(1, 'ID karyawan wajib diisi'),
    period: z.string().min(1, 'Periode wajib diisi').max(50),
    baseSalary: z.number().min(0, 'Gaji pokok tidak boleh negatif'),
    allowances: z.number().min(0, 'Tunjangan tidak boleh negatif').optional().default(0),
    transportAllowance: z.number().min(0).optional().default(0),
    mealAllowance: z.number().min(0).optional().default(0),
    otherAllowance: z.number().min(0).optional().default(0),
    deductions: z.number().min(0, 'Potongan tidak boleh negatif').optional().default(0),
    lateDeduction: z.number().min(0).optional().default(0),
    absentDeduction: z.number().min(0).optional().default(0),
    otherDeduction: z.number().min(0).optional().default(0),
    bonus: z.number().min(0, 'Bonus tidak boleh negatif').optional().default(0),
    statusKawin: z.enum(['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'], {
        message: 'Status kawin harus salah satu dari: TK/0, TK/1, TK/2, TK/3, K/0, K/1, K/2, K/3',
    }),
    jkkRiskLevel: z.enum(['low', 'medium', 'high']).optional().default('low'),
    notes: z.string().optional().nullable(),
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
// Warehouse & Stock Opname Schemas
// ============================================

export const createWarehouseSchema = z.object({
    name: z.string().min(1, 'Nama gudang wajib diisi').max(255, 'Nama gudang maksimal 255 karakter'),
    code: z.string().min(1, 'Kode gudang wajib diisi').max(50, 'Kode gudang maksimal 50 karakter').regex(/^[A-Z0-9-]+$/, 'Kode gudang hanya boleh huruf besar, angka, dan strip'),
    address: z.string().optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    phone: z.string().max(50, 'Nomor telepon maksimal 50 karakter').optional().nullable(),
    email: z.string().email('Format email tidak valid').max(255).optional().nullable(),
    manager: z.string().max(255).optional().nullable(),
    isDefault: z.boolean().optional(),
});

export const updateWarehouseSchema = z.object({
    name: z.string().min(1, 'Nama gudang wajib diisi').max(255, 'Nama gudang maksimal 255 karakter').optional(),
    code: z.string().min(1, 'Kode gudang wajib diisi').max(50, 'Kode gudang maksimal 50 karakter').regex(/^[A-Z0-9-]+$/, 'Kode gudang hanya boleh huruf besar, angka, dan strip').optional(),
    address: z.string().optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    phone: z.string().max(50, 'Nomor telepon maksimal 50 karakter').optional().nullable(),
    email: z.string().email('Format email tidak valid').max(255).optional().nullable(),
    manager: z.string().max(255).optional().nullable(),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
});

export const createStockOpnameSchema = z.object({
    warehouseId: z.string().optional().nullable(),
    opnameDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    items: z.array(z.object({
        productId: z.string().min(1, 'Produk wajib dipilih'),
        physicalQuantity: z.number().int('Jumlah fisik harus bilangan bulat').min(0, 'Jumlah fisik tidak boleh negatif'),
        notes: z.string().optional().nullable(),
    })).min(1, 'Minimal 1 item stock opname'),
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
// Billing / Payment Schemas
// ============================================

export const processPaymentSchema = z.object({
    invoiceId: z.string().min(1, 'Invoice ID wajib diisi'),
    amount: z.number().min(0.01, 'Jumlah pembayaran harus lebih dari 0'),
    method: z.string().min(1, 'Metode pembayaran wajib dipilih'),
    provider: z.enum(['midtrans', 'xendit']).optional(),
    customerName: z.string().max(255).optional(),
    customerEmail: z.string().email('Format email tidak valid').optional(),
    customerPhone: z.string().max(50).optional(),
});

export const updateCompanySettingsSchema = z.object({
    name: z.string().min(1, 'Nama perusahaan wajib diisi').max(255, 'Nama maksimal 255 karakter').optional(),
    email: z.string().email('Format email tidak valid').max(255).optional().nullable(),
    phone: z.string().max(50, 'Nomor telepon maksimal 50 karakter').optional().nullable(),
    address: z.string().optional().nullable(),
    website: z.string().url('Format URL tidak valid').max(255).optional().nullable(),
    logo: z.string().max(2000).optional().nullable(),
    npwp: z.string().max(50).optional(),
    city: z.string().max(100).optional(),
    province: z.string().max(100).optional(),
    postalCode: z.string().max(10).optional(),
    country: z.string().max(100).optional(),
    branding: z.record(z.string(), z.unknown()).optional(),
});

export const createMidtransPaymentSchema = z.object({
    subscriptionId: z.string().min(1, 'ID langganan wajib diisi'),
});

/**
 * Zod schema untuk validasi Midtrans webhook notification.
 * Hanya field-field yang diperlukan untuk memproses payment callback.
 * @see https://docs.midtrans.com/#blacklist-card
 */
export const midtransWebhookSchema = z.object({
    order_id: z.string().min(1, 'Order ID wajib diisi'),
    status_code: z.string(),
    transaction_status: z.string(),
    gross_amount: z.string(),
    payment_type: z.string().optional(),
    transaction_time: z.string().optional(),
    settlement_time: z.string().optional(),
    transaction_id: z.string().optional(),
    signature_key: z.string().optional(),
    status_message: z.string().optional(),
    merchant_id: z.string().optional(),
    fraud_status: z.string().optional(),
    bank: z.string().optional(),
    va_number: z.string().optional(),
    card_type: z.string().optional(),
    eci: z.string().optional(),
    challenge_rejection: z.string().optional(),
    channel_response_code: z.string().optional(),
    capture_status: z.string().optional(),
    currency: z.string().optional(),
    issuer: z.string().optional(),
    expiry_time: z.string().optional(),
});

// ============================================
// Settings Schemas
// ============================================

export const updateProfileSchema = z.object({
    name: z.string().min(1, 'Nama wajib diisi').max(255, 'Nama maksimal 255 karakter').optional(),
    email: z.string().email('Format email tidak valid').max(255).optional(),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
    newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
}).refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Password baru harus berbeda dari password saat ini',
    path: ['newPassword'],
});

export const updateNotificationPreferencesSchema = z.object({
    emailInvoice: z.boolean().optional(),
    emailPayment: z.boolean().optional(),
    emailOverdue: z.boolean().optional(),
    emailWeeklyReport: z.boolean().optional(),
    emailMarketing: z.boolean().optional(),
    pushInvoice: z.boolean().optional(),
    pushPayment: z.boolean().optional(),
    pushOverdue: z.boolean().optional(),
    pushMention: z.boolean().optional(),
    whatsappInvoice: z.boolean().optional(),
    whatsappPayment: z.boolean().optional(),
    whatsappOverdue: z.boolean().optional(),
    smsOverdue: z.boolean().optional(),
    smsPayment: z.boolean().optional(),
});

// ============================================
// Settings: Integration Schemas
// ============================================

export const createIntegrationSchema = z.object({
    type: z.string().min(1, 'Tipe integrasi wajib diisi').max(50),
    name: z.string().min(1, 'Nama integrasi wajib diisi').max(255),
    config: z.any().optional(),
    apiKey: z.string().max(2000).optional().nullable(),
    apiSecret: z.string().max(2000).optional().nullable(),
    webhookUrl: z.string().url('Format URL tidak valid').max(2000).optional().nullable(),
});

export const updateIntegrationSchema = z.object({
    id: z.string().min(1, 'ID integrasi wajib diisi'),
    status: z.enum(['active', 'inactive', 'error']).optional(),
    config: z.any().optional(),
    apiKey: z.string().max(2000).optional().nullable(),
    apiSecret: z.string().max(2000).optional().nullable(),
    webhookUrl: z.string().url('Format URL tidak valid').max(2000).optional().nullable(),
}).refine((data) => {
    // At least one field besides id must be provided
    const { id: _id, ...rest } = data;
    return Object.keys(rest).length > 0;
}, {
    message: 'Minimal satu field harus di-update',
});

export const inviteTeamMemberSchema = z.object({
    email: z.string().email('Format email tidak valid'),
    name: z.string().max(255).optional(),
    role: z.enum(['ADMIN', 'MEMBER', 'VIEWER', 'SUPERADMIN']).optional(),
});

export const updateTeamMemberSchema = z.object({
    memberId: z.string().min(1, 'Member ID wajib diisi'),
    role: z.enum(['ADMIN', 'MEMBER', 'VIEWER', 'SUPERADMIN']).optional(),
    isActive: z.boolean().optional(),
}).refine((data) => data.role !== undefined || data.isActive !== undefined, {
    message: 'Minimal satu field (role atau isActive) harus diisi',
});

export const createBillingPaymentSchema = z.object({
    subscriptionId: z.string().min(1, 'ID langganan wajib diisi'),
    amount: z.number().min(1, 'Jumlah pembayaran harus lebih dari 0'),
    bankName: z.string().min(1, 'Nama bank wajib diisi').max(100),
    accountNumber: z.string().min(1, 'Nomor rekening wajib diisi').max(50),
    accountName: z.string().min(1, 'Nama pemilik rekening wajib diisi').max(255),
    reference: z.string().max(255).optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
    proofFileUrl: z.string().max(2000).optional().nullable(),
    proofFileName: z.string().max(255).optional().nullable(),
});

export const verifyBillingPaymentSchema = z.object({
    action: z.enum(['approve', 'reject'], {
        message: 'Action harus approve atau reject',
    }),
    rejectReason: z.string().max(500).optional().nullable(),
}).refine((data) => data.action === 'reject' ? !!data.rejectReason : true, {
    message: 'Alasan penolakan wajib diisi untuk action reject',
    path: ['rejectReason'],
});

// ============================================
// CRM Import Schemas
// ============================================

/** Validasi satu baris contact saat import — field name wajib, lainnya opsional */
export const importContactRowSchema = z.object({
    name: z.string().min(1, 'Nama wajib diisi').max(255, 'Nama maksimal 255 karakter'),
    email: z.string().max(255).optional().nullable(),
    phone: z.string().max(50).optional().nullable(),
    company: z.string().max(255).optional().nullable(),
    address: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    type: z.string().max(50).optional(),
});

/** Validasi satu baris lead saat import — field name wajib, lainnya opsional */
export const importLeadRowSchema = z.object({
    name: z.string().min(1, 'Nama wajib diisi').max(255, 'Nama maksimal 255 karakter'),
    email: z.string().max(255).optional().nullable(),
    phone: z.string().max(50).optional().nullable(),
    company: z.string().max(255).optional().nullable(),
    source: z.string().max(100).optional().nullable(),
    value: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    status: z.string().max(50).optional(),
});

// ============================================
// ROLE & PERMISSION MANAGEMENT
// ============================================

export const createRoleSchema = z.object({
    name: z.string().min(1, 'Nama role wajib diisi').max(100, 'Nama role maksimal 100 karakter'),
    description: z.string().max(500, 'Deskripsi maksimal 500 karakter').optional().nullable(),
    permissions: z.array(z.string()).min(1, 'Minimal satu permission harus dipilih'),
});

export const updateRoleSchema = z.object({
    name: z.string().min(1, 'Nama role wajib diisi').max(100, 'Nama role maksimal 100 karakter').optional(),
    description: z.string().max(500, 'Deskripsi maksimal 500 karakter').optional().nullable(),
    permissions: z.array(z.string()).min(1, 'Minimal satu permission harus dipilih').optional(),
});

// ============================================
// Industry Configuration Schemas
// ============================================

const industryTypeEnum = z.enum([
    'retail',
    'manufacturing',
    'services',
    'construction',
    'healthcare',
    'education',
    'food_beverage',
    'general',
]);

export const updateIndustryConfigSchema = z.object({
    industry: industryTypeEnum.optional(),
    modules: z.object({
        finance: z.boolean().optional(),
        crm: z.boolean().optional(),
        hr: z.boolean().optional(),
        inventory: z.boolean().optional(),
        billing: z.boolean().optional(),
        analytics: z.boolean().optional(),
    }).optional(),
});

export const createCustomFieldSchema = z.object({
    entity: z.string().min(1, 'Entity wajib diisi').max(100, 'Entity maksimal 100 karakter'),
    fieldName: z.string().min(1, 'Field name wajib diisi').max(100, 'Field name maksimal 100 karakter').regex(/^[a-z_]+$/, 'Field name hanya boleh huruf kecil dan underscore'),
    fieldLabel: z.string().min(1, 'Field label wajib diisi').max(255, 'Field label maksimal 255 karakter'),
    fieldType: z.enum(['text', 'number', 'date', 'select', 'boolean'], { message: 'Tipe field tidak valid' }),
    required: z.boolean().optional().default(false),
    options: z.array(z.string()).optional().nullable(),
    defaultValue: z.unknown().optional().nullable(),
    sortOrder: z.number().int().min(0).optional().default(0),
});

export const updateCustomFieldSchema = z.object({
    fieldLabel: z.string().min(1, 'Field label wajib diisi').max(255, 'Field label maksimal 255 karakter').optional(),
    fieldType: z.enum(['text', 'number', 'date', 'select', 'boolean'], { message: 'Tipe field tidak valid' }).optional(),
    required: z.boolean().optional(),
    options: z.array(z.string()).optional().nullable(),
    defaultValue: z.unknown().optional().nullable(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
});

// ============================================
// General Ledger & Journal Entry Schemas
// ============================================

export const createJournalEntrySchema = z.object({
    description: z.string().min(1, 'Deskripsi wajib diisi'),
    reference: z.string().optional().nullable(),
    sourceType: z.enum(['manual', 'invoice', 'payment', 'purchase_order', 'payroll'], {
        message: 'Tipe sumber tidak valid',
    }),
    sourceId: z.string().optional().nullable(),
    date: z.string().optional(),
    items: z.array(z.object({
        accountId: z.string().min(1, 'Akun wajib dipilih'),
        debit: z.number().min(0, 'Debit tidak boleh negatif').optional(),
        credit: z.number().min(0, 'Kredit tidak boleh negatif').optional(),
        description: z.string().optional().nullable(),
    })).min(2, 'Minimal 2 item jurnal diperlukan (debit dan kredit)'),
}).refine(
    (data) => {
        // Validate double-entry: total debit must equal total credit
        const totalDebit = data.items.reduce((sum, item) => sum + (item.debit || 0), 0);
        const totalCredit = data.items.reduce((sum, item) => sum + (item.credit || 0), 0);
        return totalDebit > 0 && totalCredit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;
    },
    { message: 'Total debit dan total credit harus sama dan lebih dari 0' }
).refine(
    (data) => {
        // Validate: each item must have either debit OR credit, not both
        return data.items.every(
            (item) => !((item.debit || 0) > 0 && (item.credit || 0) > 0)
        );
    },
    { message: 'Setiap item hanya boleh memiliki debit ATAU credit, bukan keduanya' }
);

export const updateJournalEntrySchema = z.object({
    description: z.string().min(1, 'Deskripsi wajib diisi').optional(),
    reference: z.string().optional().nullable(),
    sourceType: z.enum(['manual', 'invoice', 'payment', 'purchase_order', 'payroll']).optional(),
    sourceId: z.string().optional().nullable(),
    date: z.string().optional(),
    status: z.enum(['DRAFT', 'POSTED', 'VOID']).optional(),
    items: z.array(z.object({
        accountId: z.string().min(1, 'Akun wajib dipilih'),
        debit: z.number().min(0, 'Debit tidak boleh negatif').optional(),
        credit: z.number().min(0, 'Kredit tidak boleh negatif').optional(),
        description: z.string().optional().nullable(),
    })).min(2, 'Minimal 2 item jurnal diperlukan').optional(),
}).refine(
    (data) => {
        if (!data.items) return true;
        const totalDebit = data.items.reduce((sum, item) => sum + (item.debit || 0), 0);
        const totalCredit = data.items.reduce((sum, item) => sum + (item.credit || 0), 0);
        return totalDebit > 0 && totalCredit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;
    },
    { message: 'Total debit dan total credit harus sama dan lebih dari 0' }
).refine(
    (data) => {
        if (!data.items) return true;
        return data.items.every(
            (item) => !((item.debit || 0) > 0 && (item.credit || 0) > 0)
        );
    },
    { message: 'Setiap item hanya boleh memiliki debit ATAU credit, bukan keduanya' }
);

// ============================================
// Tax Rate Schemas
// ============================================

const taxTypeEnum = z.enum(['VAT', 'INCOME_TAX', 'OTHER']);

export const createTaxRateSchema = z.object({
    name: z.string().min(1, 'Nama pajak wajib diisi').max(100, 'Nama pajak maksimal 100 karakter'),
    code: z.string().min(1, 'Kode pajak wajib diisi').max(20, 'Kode pajak maksimal 20 karakter').regex(/^[A-Z0-9_]+$/, 'Kode pajak hanya boleh huruf besar, angka, dan underscore'),
    rate: z.number().min(0, 'Tarif pajak tidak boleh negatif').max(100, 'Tarif pajak maksimal 100%'),
    type: taxTypeEnum.optional(),
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional(),
});

export const updateTaxRateSchema = z.object({
    name: z.string().min(1, 'Nama pajak wajib diisi').max(100, 'Nama pajak maksimal 100 karakter').optional(),
    code: z.string().min(1, 'Kode pajak wajib diisi').max(20, 'Kode pajak maksimal 20 karakter').regex(/^[A-Z0-9_]+$/, 'Kode pajak hanya boleh huruf besar, angka, dan underscore').optional(),
    rate: z.number().min(0, 'Tarif pajak tidak boleh negatif').max(100, 'Tarif pajak maksimal 100%').optional(),
    type: taxTypeEnum.optional(),
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
    message: 'Minimal satu field harus di-update',
});

// ============================================
// Approval Engine Schemas
// ============================================

const approvalEntityTypeEnum = z.enum(['INVOICE', 'PURCHASE_ORDER', 'QUOTATION']);
const approvalRoleEnum = z.enum(['ADMIN', 'MEMBER', 'SUPERADMIN']);

export const createApprovalLevelSchema = z.object({
    entityType: approvalEntityTypeEnum,
    level: z.number().int().min(1, 'Level minimal 1').max(10, 'Level maksimal 10'),
    name: z.string().min(1, 'Nama level wajib diisi').max(100, 'Nama level maksimal 100 karakter'),
    requiredRole: approvalRoleEnum,
    isActive: z.boolean().optional(),
});

export const updateApprovalLevelSchema = z.object({
    level: z.number().int().min(1).max(10).optional(),
    name: z.string().min(1).max(100).optional(),
    requiredRole: approvalRoleEnum.optional(),
    isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
    message: 'Minimal satu field harus di-update',
});

export const createApprovalRequestSchema = z.object({
    entityType: approvalEntityTypeEnum,
    entityId: z.string().min(1, 'Entity ID wajib diisi'),
});

export const approveRequestSchema = z.object({
    comments: z.string().max(500, 'Komentar maksimal 500 karakter').optional(),
});

export const rejectRequestSchema = z.object({
    comments: z.string().max(500, 'Komentar maksimal 500 karakter').optional().refine(
        (val) => val !== undefined && val.trim().length > 0,
        'Komentar wajib diisi saat menolak'
    ),
});

// ============================================
// Security Schemas
// ============================================

export const enable2faSchema = z.object({
    code: z.string().length(6, 'Kode verifikasi harus 6 digit').regex(/^\d+$/, 'Kode verifikasi hanya boleh berisi angka'),
});

export const disable2faSchema = z.object({
    password: z.string().min(1, 'Password wajib diisi untuk menonaktifkan 2FA'),
});

export const verify2faSchema = z.object({
    code: z.string().length(6, 'Kode verifikasi harus 6 digit').regex(/^\d+$/, 'Kode verifikasi hanya boleh berisi angka'),
});

export const revokeSessionSchema = z.object({
    sessionId: z.string().min(1, 'Session ID wajib diisi'),
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
