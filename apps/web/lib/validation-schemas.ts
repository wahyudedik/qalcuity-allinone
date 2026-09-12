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
    company: z.string().max(255).optional().nullable(),
    position: z.string().max(255).optional().nullable(),
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

// Department Schemas
export const createDepartmentSchema = z.object({
    name: z.string().min(1, 'Nama departemen wajib diisi').max(255, 'Nama departemen maksimal 255 karakter'),
    description: z.string().max(1000, 'Deskripsi maksimal 1000 karakter').optional().nullable(),
    isActive: z.boolean().optional(),
});

export const updateDepartmentSchema = z.object({
    name: z.string().min(1, 'Nama departemen wajib diisi').max(255, 'Nama departemen maksimal 255 karakter').optional(),
    description: z.string().max(1000, 'Deskripsi maksimal 1000 karakter').optional().nullable(),
    isActive: z.boolean().optional(),
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
    avatar: z.string().max(2048, 'URL avatar maksimal 2048 karakter').optional(),
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
    amount: z.coerce.number().min(1, 'Jumlah pembayaran harus lebih dari 0'),
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

export const applyIndustryPackSchema = z.object({
    packId: z.string().min(1, 'Pack ID wajib diisi').max(100, 'Pack ID maksimal 100 karakter'),
    customConfig: z.record(z.string(), z.unknown()).optional(),
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
// HR Attendance Schemas
// ============================================

export const createAttendanceSchema = z.object({
    employeeId: z.string().min(1, 'ID karyawan wajib diisi'),
    date: z.string().min(1, 'Tanggal wajib diisi'),
    clockIn: z.string().max(10, 'Format jam masuk tidak valid').optional().nullable(),
    clockOut: z.string().max(10, 'Format jam keluar tidak valid').optional().nullable(),
    workHours: z.number().min(0, 'Jam kerja tidak boleh negatif').optional(),
    status: z.enum(['PRESENT', 'LATE', 'ABSENT', 'LEAVE', 'WFH'], {
        message: 'Status harus salah satu dari: PRESENT, LATE, ABSENT, LEAVE, WFH',
    }).optional().default('PRESENT'),
    notes: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional().nullable(),
});

export const updateAttendanceSchema = z.object({
    date: z.string().optional(),
    clockIn: z.string().max(10, 'Format jam masuk tidak valid').optional().nullable(),
    clockOut: z.string().max(10, 'Format jam keluar tidak valid').optional().nullable(),
    workHours: z.number().min(0, 'Jam kerja tidak boleh negatif').optional(),
    status: z.enum(['PRESENT', 'LATE', 'ABSENT', 'LEAVE', 'WFH'], {
        message: 'Status harus salah satu dari: PRESENT, LATE, ABSENT, LEAVE, WFH',
    }).optional(),
    notes: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional().nullable(),
});

export const clockOutAttendanceSchema = z.object({
    id: z.string().min(1, 'ID wajib diisi'),
    clockOut: z.string().min(1, 'Jam keluar wajib diisi').max(10, 'Format jam keluar tidak valid'),
    status: z.enum(['PRESENT', 'LATE', 'ABSENT', 'LEAVE', 'WFH'], {
        message: 'Status harus salah satu dari: PRESENT, LATE, ABSENT, LEAVE, WFH',
    }).optional(),
});

// ============================================
// POS (Point of Sale) Schemas
// ============================================

export const createPosTerminalSchema = z.object({
    name: z.string().min(1, 'Nama terminal wajib diisi').max(255, 'Nama terminal maksimal 255 karakter'),
    code: z.string().min(1, 'Kode terminal wajib diisi').max(50, 'Kode terminal maksimal 50 karakter'),
    location: z.string().max(255, 'Lokasi maksimal 255 karakter').optional().nullable(),
});

export const updatePosTerminalSchema = z.object({
    name: z.string().min(1, 'Nama terminal wajib diisi').max(255, 'Nama terminal maksimal 255 karakter').optional(),
    location: z.string().max(255, 'Lokasi maksimal 255 karakter').optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE'], { message: 'Status terminal tidak valid' }).optional(),
});

export const openPosSessionSchema = z.object({
    terminalId: z.string().min(1, 'ID terminal wajib diisi'),
    openingCash: z.number().min(0, 'Uang awal tidak boleh negatif'),
});

export const closePosSessionSchema = z.object({
    closingCash: z.number().min(0, 'Uang tutup tidak boleh negatif'),
});

export const posTransactionItemSchema = z.object({
    productId: z.string().min(1, 'ID produk wajib diisi'),
    productName: z.string().min(1, 'Nama produk wajib diisi'),
    productSku: z.string().optional().nullable(),
    quantity: z.number().min(0.01, 'Jumlah harus lebih dari 0'),
    unitPrice: z.number().min(0, 'Harga satuan tidak boleh negatif'),
    discountAmount: z.number().min(0, 'Diskon tidak boleh negatif').optional(),
    discountPercent: z.number().min(0, 'Persentase diskon tidak boleh negatif').max(100, 'Persentase diskon maksimal 100').optional().nullable(),
    taxRate: z.number().min(0, 'Tarif pajak tidak boleh negatif').optional(),
});

export const createPosTransactionSchema = z.object({
    sessionId: z.string().min(1, 'ID sesi wajib diisi'),
    customerName: z.string().max(255, 'Nama pelanggan maksimal 255 karakter').optional().nullable(),
    customerPhone: z.string().max(50, 'Nomor telepon maksimal 50 karakter').optional().nullable(),
    items: z.array(posTransactionItemSchema).min(1, 'Minimal 1 item dalam transaksi'),
    paymentMethod: z.enum(['CASH', 'CARD', 'QRIS', 'E_WALLET', 'BANK_TRANSFER'], { message: 'Metode pembayaran tidak valid' }).optional(),
    discountAmount: z.number().min(0, 'Diskon tidak boleh negatif').optional(),
    discountPercent: z.number().min(0, 'Persentase diskon tidak boleh negatif').max(100, 'Persentase diskon maksimal 100').optional().nullable(),
    paidAmount: z.number().min(0, 'Jumlah bayar tidak boleh negatif'),
    notes: z.string().optional().nullable(),
});

export const createPosRefundSchema = z.object({
    transactionId: z.string().min(1, 'ID transaksi wajib diisi'),
    amount: z.number().min(0.01, 'Jumlah refund harus lebih dari 0'),
    reason: z.string().min(1, 'Alasan refund wajib diisi').max(500, 'Alasan refund maksimal 500 karakter'),
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

// ============================================
// POS Loyalty Schemas
// ============================================

export const createLoyaltyMemberSchema = z.object({
    name: z.string().min(1, 'Nama wajib diisi').max(255, 'Nama maksimal 255 karakter'),
    email: z.string().email('Format email tidak valid').max(255).optional().nullable(),
    phone: z.string().max(50, 'Nomor telepon maksimal 50 karakter').optional().nullable(),
    contactId: z.string().optional().nullable(),
});

export const updateLoyaltyMemberSchema = z.object({
    name: z.string().min(1, 'Nama wajib diisi').max(255, 'Nama maksimal 255 karakter').optional(),
    email: z.string().email('Format email tidak valid').max(255).optional().nullable(),
    phone: z.string().max(50, 'Nomor telepon maksimal 50 karakter').optional().nullable(),
    tier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).optional(),
});

export const createLoyaltyRewardSchema = z.object({
    name: z.string().min(1, 'Nama reward wajib diisi').max(255, 'Nama maksimal 255 karakter'),
    description: z.string().optional().nullable(),
    pointsCost: z.number().int().min(1, 'Minimal 1 point'),
    rewardType: z.enum(['DISCOUNT_PERCENT', 'DISCOUNT_FIXED', 'FREE_ITEM', 'VOUCHER']),
    rewardValue: z.number().min(0, 'Nilai reward tidak boleh negatif'),
    stock: z.number().int().optional().default(-1),
});

export const updateLoyaltyRewardSchema = z.object({
    name: z.string().min(1, 'Nama reward wajib diisi').max(255, 'Nama maksimal 255 karakter').optional(),
    description: z.string().optional().nullable(),
    pointsCost: z.number().int().min(1, 'Minimal 1 point').optional(),
    rewardType: z.enum(['DISCOUNT_PERCENT', 'DISCOUNT_FIXED', 'FREE_ITEM', 'VOUCHER']).optional(),
    rewardValue: z.number().min(0, 'Nilai reward tidak boleh negatif').optional(),
    isActive: z.boolean().optional(),
    stock: z.number().int().optional(),
}).refine((data) => Object.keys(data).length > 0, {
    message: 'Minimal satu field harus di-update',
});

export const redeemLoyaltyPointsSchema = z.object({
    memberId: z.string().min(1, 'Member wajib dipilih'),
    rewardId: z.string().min(1, 'Reward wajib dipilih'),
    points: z.number().int().min(1, 'Minimal 1 point').optional(),
});

// ============================================
// POS Kitchen Display Schemas
// ============================================

export const createKitchenStationSchema = z.object({
    name: z.string().min(1, 'Nama stasiun wajib diisi').max(100, 'Nama stasiun maksimal 100 karakter'),
    description: z.string().max(500, 'Deskripsi maksimal 500 karakter').optional().nullable(),
    sortOrder: z.number().int().min(0).optional().default(0),
});

export const updateKitchenStationSchema = z.object({
    name: z.string().min(1, 'Nama stasiun wajib diisi').max(100, 'Nama stasiun maksimal 100 karakter').optional(),
    description: z.string().max(500, 'Deskripsi maksimal 500 karakter').optional().nullable(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
    message: 'Minimal satu field harus di-update',
});

const kitchenOrderItemSchema = z.object({
    productName: z.string().min(1, 'Nama produk wajib diisi').max(255, 'Nama produk maksimal 255 karakter'),
    quantity: z.number().int('Jumlah harus bilangan bulat').min(1, 'Jumlah minimal 1'),
    notes: z.string().max(500, 'Catatan maksimal 500 karakter').optional().nullable(),
    transactionItemId: z.string().optional().nullable(),
});

export const createKitchenOrderSchema = z.object({
    transactionId: z.string().optional().nullable(),
    stationId: z.string().optional().nullable(),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'], { message: 'Priority tidak valid' }).optional(),
    notes: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional().nullable(),
    estimatedMinutes: z.number().int().min(1, 'Estimasi waktu minimal 1 menit').max(480, 'Estimasi waktu maksimal 480 menit').optional().nullable(),
    items: z.array(kitchenOrderItemSchema).min(1, 'Minimal 1 item pesanan'),
});

export const updateKitchenOrderStatusSchema = z.object({
    status: z.enum(['PREPARING', 'READY', 'SERVED', 'CANCELLED'], {
        message: 'Status harus PREPARING, READY, SERVED, atau CANCELLED',
    }),
    stationId: z.string().optional().nullable(),
    notes: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional().nullable(),
});

// ============================================
// POS Table Management Schemas
// ============================================

export const createTableSchema = z.object({
    number: z.number().int('Nomor meja harus bilangan bulat').min(1, 'Nomor meja minimal 1'),
    name: z.string().max(100, 'Nama meja maksimal 100 karakter').optional().nullable(),
    capacity: z.number().int('Kapasitas harus bilangan bulat').min(1, 'Kapasitas minimal 1').max(100, 'Kapasitas maksimal 100').optional().default(4),
    zone: z.string().max(50, 'Zone maksimal 50 karakter').optional().nullable(),
    floor: z.string().max(50, 'Lantai maksimal 50 karakter').optional().nullable(),
    posX: z.number().optional().nullable(),
    posY: z.number().optional().nullable(),
    width: z.number().min(0.5, 'Lebar minimal 0.5').max(10, 'Lebar maksimal 10').optional().default(1),
    height: z.number().min(0.5, 'Tinggi minimal 0.5').max(10, 'Tinggi maksimal 10').optional().default(1),
    notes: z.string().max(500, 'Catatan maksimal 500 karakter').optional().nullable(),
});

export const updateTableSchema = z.object({
    number: z.number().int('Nomor meja harus bilangan bulat').min(1, 'Nomor meja minimal 1').optional(),
    name: z.string().max(100, 'Nama meja maksimal 100 karakter').optional().nullable(),
    capacity: z.number().int('Kapasitas harus bilangan bulat').min(1, 'Kapasitas minimal 1').max(100, 'Kapasitas maksimal 100').optional(),
    status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'DISABLED'], {
        message: 'Status harus AVAILABLE, OCCUPIED, RESERVED, CLEANING, atau DISABLED',
    }).optional(),
    zone: z.string().max(50, 'Zone maksimal 50 karakter').optional().nullable(),
    floor: z.string().max(50, 'Lantai maksimal 50 karakter').optional().nullable(),
    posX: z.number().optional().nullable(),
    posY: z.number().optional().nullable(),
    width: z.number().min(0.5, 'Lebar minimal 0.5').max(10, 'Lebar maksimal 10').optional(),
    height: z.number().min(0.5, 'Tinggi minimal 0.5').max(10, 'Tinggi maksimal 10').optional(),
    isActive: z.boolean().optional(),
    notes: z.string().max(500, 'Catatan maksimal 500 karakter').optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
    message: 'Minimal satu field harus di-update',
});

export const updateTableStatusSchema = z.object({
    status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'DISABLED'], {
        message: 'Status harus AVAILABLE, OCCUPIED, RESERVED, CLEANING, atau DISABLED',
    }),
});

export const createReservationSchema = z.object({
    tableId: z.string().optional().nullable(),
    customerName: z.string().min(1, 'Nama pelanggan wajib diisi').max(255, 'Nama pelanggan maksimal 255 karakter'),
    customerPhone: z.string().max(50, 'Nomor telepon maksimal 50 karakter').optional().nullable(),
    partySize: z.number().int('Jumlah tamu harus bilangan bulat').min(1, 'Jumlah tamu minimal 1').max(100, 'Jumlah tamu maksimal 100'),
    reservationTime: z.string().min(1, 'Waktu reservasi wajib diisi'),
    duration: z.number().int('Durasi harus bilangan bulat').min(15, 'Durasi minimal 15 menit').max(480, 'Durasi maksimal 480 menit').optional().default(60),
    notes: z.string().max(500, 'Catatan maksimal 500 karakter').optional().nullable(),
});

export const updateReservationSchema = z.object({
    tableId: z.string().optional().nullable(),
    status: z.enum(['CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW'], {
        message: 'Status harus CONFIRMED, SEATED, CANCELLED, atau NO_SHOW',
    }).optional(),
    customerName: z.string().min(1, 'Nama pelanggan wajib diisi').max(255, 'Nama pelanggan maksimal 255 karakter').optional(),
    customerPhone: z.string().max(50, 'Nomor telepon maksimal 50 karakter').optional().nullable(),
    partySize: z.number().int('Jumlah tamu harus bilangan bulat').min(1, 'Jumlah tamu minimal 1').max(100, 'Jumlah tamu maksimal 100').optional(),
    reservationTime: z.string().optional(),
    duration: z.number().int('Durasi harus bilangan bulat').min(15, 'Durasi minimal 15 menit').max(480, 'Durasi maksimal 480 menit').optional(),
    notes: z.string().max(500, 'Catatan maksimal 500 karakter').optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
    message: 'Minimal satu field harus di-update',
});

// ============================================
// Operations Module Schemas
// ============================================

export const createProjectSchema = z.object({
    name: z.string().min(1, 'Nama proyek wajib diisi').max(255, 'Nama proyek maksimal 255 karakter'),
    description: z.string().max(2000, 'Deskripsi maksimal 2000 karakter').optional().nullable(),
    status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'], {
        message: 'Status harus PLANNING, ACTIVE, ON_HOLD, COMPLETED, atau CANCELLED',
    }).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], {
        message: 'Prioritas harus LOW, MEDIUM, HIGH, atau URGENT',
    }).optional(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    budget: z.number().min(0, 'Budget tidak boleh negatif').optional().nullable(),
    managerId: z.string().max(50).optional().nullable(),
});

export const updateProjectSchema = z.object({
    name: z.string().min(1, 'Nama proyek wajib diisi').max(255, 'Nama proyek maksimal 255 karakter').optional(),
    description: z.string().max(2000, 'Deskripsi maksimal 2000 karakter').optional().nullable(),
    status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'], {
        message: 'Status harus PLANNING, ACTIVE, ON_HOLD, COMPLETED, atau CANCELLED',
    }).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], {
        message: 'Prioritas harus LOW, MEDIUM, HIGH, atau URGENT',
    }).optional(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    budget: z.number().min(0, 'Budget tidak boleh negatif').optional().nullable(),
    progress: z.number().int('Progress harus bilangan bulat').min(0, 'Progress minimal 0').max(100, 'Progress maksimal 100').optional(),
    managerId: z.string().max(50).optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
    message: 'Minimal satu field harus di-update',
});

export const createTaskSchema = z.object({
    projectId: z.string().min(1, 'ID proyek wajib diisi'),
    title: z.string().min(1, 'Judul task wajib diisi').max(255, 'Judul task maksimal 255 karakter'),
    description: z.string().max(5000, 'Deskripsi maksimal 5000 karakter').optional().nullable(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'], {
        message: 'Status harus TODO, IN_PROGRESS, IN_REVIEW, DONE, atau CANCELLED',
    }).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], {
        message: 'Prioritas harus LOW, MEDIUM, HIGH, atau URGENT',
    }).optional(),
    assigneeId: z.string().max(50).optional().nullable(),
    dueDate: z.string().optional().nullable(),
    estimatedHours: z.number().min(0, 'Estimasi jam tidak boleh negatif').optional().nullable(),
    tags: z.string().max(500, 'Tags maksimal 500 karakter').optional().nullable(),
});

export const updateTaskSchema = z.object({
    title: z.string().min(1, 'Judul task wajib diisi').max(255, 'Judul task maksimal 255 karakter').optional(),
    description: z.string().max(5000, 'Deskripsi maksimal 5000 karakter').optional().nullable(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'], {
        message: 'Status harus TODO, IN_PROGRESS, IN_REVIEW, DONE, atau CANCELLED',
    }).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], {
        message: 'Prioritas harus LOW, MEDIUM, HIGH, atau URGENT',
    }).optional(),
    assigneeId: z.string().max(50).optional().nullable(),
    dueDate: z.string().optional().nullable(),
    estimatedHours: z.number().min(0, 'Estimasi jam tidak boleh negatif').optional().nullable(),
    actualHours: z.number().min(0, 'Jam aktual tidak boleh negatif').optional().nullable(),
    tags: z.string().max(500, 'Tags maksimal 500 karakter').optional().nullable(),
    sortOrder: z.number().int('Sort order harus bilangan bulat').min(0).optional(),
}).refine((data) => Object.keys(data).length > 0, {
    message: 'Minimal satu field harus di-update',
});

export const createTimeLogSchema = z.object({
    taskId: z.string().min(1, 'ID task wajib diisi'),
    date: z.string().min(1, 'Tanggal wajib diisi'),
    hours: z.number().min(0.25, 'Jam minimal 0.25 (15 menit)').max(24, 'Jam maksimal 24'),
    description: z.string().max(1000, 'Deskripsi maksimal 1000 karakter').optional().nullable(),
});

export const createTaskCommentSchema = z.object({
    content: z.string().min(1, 'Komentar wajib diisi').max(5000, 'Komentar maksimal 5000 karakter'),
});

export const addProjectMemberSchema = z.object({
    employeeId: z.string().min(1, 'ID karyawan wajib diisi').max(50, 'ID karyawan maksimal 50 karakter'),
    role: z.enum(['MANAGER', 'MEMBER', 'VIEWER'], {
        message: 'Role harus MANAGER, MEMBER, atau VIEWER',
    }).optional(),
});

export const updateProjectMemberSchema = z.object({
    role: z.enum(['MANAGER', 'MEMBER', 'VIEWER'], {
        message: 'Role harus MANAGER, MEMBER, atau VIEWER',
    }),
});

// ============================================
// OPERATIONS MODULE — PHASE B Schemas
// ============================================

export const createProjectBudgetSchema = z.object({
    category: z.enum(['LABOR', 'MATERIAL', 'EQUIPMENT', 'TRAVEL', 'SOFTWARE', 'OTHER'], {
        message: 'Kategori harus LABOR, MATERIAL, EQUIPMENT, TRAVEL, SOFTWARE, atau OTHER',
    }),
    name: z.string().min(1, 'Nama item wajib diisi').max(255, 'Nama item maksimal 255 karakter'),
    description: z.string().max(2000, 'Deskripsi maksimal 2000 karakter').optional().nullable(),
    planned: z.number().min(0, 'Anggaran tidak boleh negatif'),
    actual: z.number().min(0, 'Actual tidak boleh negatif').optional(),
    notes: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional().nullable(),
});

export const updateProjectBudgetSchema = z.object({
    category: z.enum(['LABOR', 'MATERIAL', 'EQUIPMENT', 'TRAVEL', 'SOFTWARE', 'OTHER'], {
        message: 'Kategori harus LABOR, MATERIAL, EQUIPMENT, TRAVEL, SOFTWARE, atau OTHER',
    }).optional(),
    name: z.string().min(1, 'Nama item wajib diisi').max(255, 'Nama item maksimal 255 karakter').optional(),
    description: z.string().max(2000, 'Deskripsi maksimal 2000 karakter').optional().nullable(),
    planned: z.number().min(0, 'Anggaran tidak boleh negatif').optional(),
    actual: z.number().min(0, 'Actual tidak boleh negatif').optional(),
    notes: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
    message: 'Minimal satu field harus di-update',
});

export const createResourceAllocationSchema = z.object({
    employeeId: z.string().min(1, 'ID karyawan wajib diisi').max(50, 'ID karyawan maksimal 50 karakter'),
    role: z.enum(['MANAGER', 'MEMBER', 'CONSULTANT'], {
        message: 'Role harus MANAGER, MEMBER, atau CONSULTANT',
    }).optional(),
    allocationPct: z.number().int('Persentase harus bilangan bulat').min(1, 'Minimal 1%').max(100, 'Maksimal 100%'),
    startDate: z.string().min(1, 'Tanggal mulai wajib diisi'),
    endDate: z.string().min(1, 'Tanggal selesai wajib diisi'),
    hourlyRate: z.number().min(0, 'Rate per jam tidak boleh negatif').optional().nullable(),
    notes: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional().nullable(),
});

export const updateResourceAllocationSchema = z.object({
    role: z.enum(['MANAGER', 'MEMBER', 'CONSULTANT'], {
        message: 'Role harus MANAGER, MEMBER, atau CONSULTANT',
    }).optional(),
    allocationPct: z.number().int('Persentase harus bilangan bulat').min(1, 'Minimal 1%').max(100, 'Maksimal 100%').optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    hourlyRate: z.number().min(0, 'Rate per jam tidak boleh negatif').optional().nullable(),
    notes: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
    message: 'Minimal satu field harus di-update',
});

export const updateTaskScheduleSchema = z.object({
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    progress: z.number().int('Progress harus bilangan bulat').min(0, 'Progress minimal 0').max(100, 'Progress maksimal 100').optional(),
    dependsOnId: z.string().optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
    message: 'Minimal satu field harus di-update',
});

// ============================================
// OPERATIONS MODULE — PHASE C: FIELD SERVICE Schemas
// ============================================

export const createFieldJobSchema = z.object({
    projectId: z.string().optional().nullable(),
    title: z.string().min(1, 'Judul pekerjaan wajib diisi').max(255, 'Judul maksimal 255 karakter'),
    description: z.string().max(5000, 'Deskripsi maksimal 5000 karakter').optional().nullable(),
    location: z.string().max(255, 'Lokasi maksimal 255 karakter').optional().nullable(),
    address: z.string().max(500, 'Alamat maksimal 500 karakter').optional().nullable(),
    latitude: z.number().min(-90, 'Latitude minimal -90').max(90, 'Latitude maksimal 90').optional().nullable(),
    longitude: z.number().min(-180, 'Longitude minimal -180').max(180, 'Longitude maksimal 180').optional().nullable(),
    scheduledDate: z.string().optional().nullable(),
    scheduledTime: z.string().max(5, 'Format waktu tidak valid').optional().nullable(),
    estimatedDuration: z.number().int('Durasi harus bilangan bulat').min(0, 'Durasi tidak boleh negatif').optional().nullable(),
    status: z.enum(['SCHEDULED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], {
        message: 'Status harus SCHEDULED, EN_ROUTE, IN_PROGRESS, COMPLETED, atau CANCELLED',
    }).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], {
        message: 'Prioritas harus LOW, MEDIUM, HIGH, atau URGENT',
    }).optional(),
    customerName: z.string().max(255, 'Nama customer maksimal 255 karakter').optional().nullable(),
    customerPhone: z.string().max(50, 'Telepon customer maksimal 50 karakter').optional().nullable(),
    customerEmail: z.string().email('Format email tidak valid').max(255).optional().nullable(),
    notes: z.string().max(5000, 'Catatan maksimal 5000 karakter').optional().nullable(),
});

export const updateFieldJobSchema = z.object({
    projectId: z.string().optional().nullable(),
    title: z.string().min(1, 'Judul pekerjaan wajib diisi').max(255, 'Judul maksimal 255 karakter').optional(),
    description: z.string().max(5000, 'Deskripsi maksimal 5000 karakter').optional().nullable(),
    location: z.string().max(255, 'Lokasi maksimal 255 karakter').optional().nullable(),
    address: z.string().max(500, 'Alamat maksimal 500 karakter').optional().nullable(),
    latitude: z.number().min(-90, 'Latitude minimal -90').max(90, 'Latitude maksimal 90').optional().nullable(),
    longitude: z.number().min(-180, 'Longitude minimal -180').max(180, 'Longitude maksimal 180').optional().nullable(),
    scheduledDate: z.string().optional().nullable(),
    scheduledTime: z.string().max(5, 'Format waktu tidak valid').optional().nullable(),
    estimatedDuration: z.number().int('Durasi harus bilangan bulat').min(0, 'Durasi tidak boleh negatif').optional().nullable(),
    status: z.enum(['SCHEDULED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], {
        message: 'Status harus SCHEDULED, EN_ROUTE, IN_PROGRESS, COMPLETED, atau CANCELLED',
    }).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], {
        message: 'Prioritas harus LOW, MEDIUM, HIGH, atau URGENT',
    }).optional(),
    customerName: z.string().max(255, 'Nama customer maksimal 255 karakter').optional().nullable(),
    customerPhone: z.string().max(50, 'Telepon customer maksimal 50 karakter').optional().nullable(),
    customerEmail: z.string().email('Format email tidak valid').max(255).optional().nullable(),
    notes: z.string().max(5000, 'Catatan maksimal 5000 karakter').optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
    message: 'Minimal satu field harus di-update',
});

export const createFieldJobAssignmentSchema = z.object({
    employeeId: z.string().min(1, 'ID karyawan wajib diisi').max(50, 'ID karyawan maksimal 50 karakter'),
    role: z.enum(['LEAD', 'TECHNICIAN', 'HELPER'], {
        message: 'Role harus LEAD, TECHNICIAN, atau HELPER',
    }).optional(),
    notes: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional().nullable(),
});

export const createFieldChecklistSchema = z.object({
    name: z.string().min(1, 'Nama checklist wajib diisi').max(255, 'Nama checklist maksimal 255 karakter'),
    description: z.string().max(2000, 'Deskripsi maksimal 2000 karakter').optional().nullable(),
    category: z.enum(['GENERAL', 'SAFETY', 'INSTALLATION', 'MAINTENANCE', 'INSPECTION'], {
        message: 'Kategori harus GENERAL, SAFETY, INSTALLATION, MAINTENANCE, atau INSPECTION',
    }).optional(),
    items: z.array(z.object({
        id: z.string(),
        label: z.string().min(1, 'Label item wajib diisi'),
        type: z.enum(['CHECKBOX', 'TEXT', 'NUMBER', 'PHOTO', 'SIGNATURE']),
        required: z.boolean().optional(),
    })).min(1, 'Minimal satu item checklist').max(50, 'Maksimal 50 item'),
});

export const updateFieldChecklistSchema = z.object({
    name: z.string().min(1, 'Nama checklist wajib diisi').max(255, 'Nama checklist maksimal 255 karakter').optional(),
    description: z.string().max(2000, 'Deskripsi maksimal 2000 karakter').optional().nullable(),
    category: z.enum(['GENERAL', 'SAFETY', 'INSTALLATION', 'MAINTENANCE', 'INSPECTION'], {
        message: 'Kategori harus GENERAL, SAFETY, INSTALLATION, MAINTENANCE, atau INSPECTION',
    }).optional(),
    items: z.array(z.object({
        id: z.string(),
        label: z.string().min(1, 'Label item wajib diisi'),
        type: z.enum(['CHECKBOX', 'TEXT', 'NUMBER', 'PHOTO', 'SIGNATURE']),
        required: z.boolean().optional(),
    })).min(1, 'Minimal satu item checklist').max(50, 'Maksimal 50 item').optional(),
    isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
    message: 'Minimal satu field harus di-update',
});

export const submitFieldChecklistResultSchema = z.object({
    checklistId: z.string().min(1, 'ID checklist wajib diisi'),
    employeeId: z.string().min(1, 'ID karyawan wajib diisi'),
    answers: z.array(z.object({
        itemId: z.string(),
        value: z.union([z.string(), z.boolean(), z.number()]),
        notes: z.string().optional(),
    })),
    photos: z.string().optional().nullable(),
    notes: z.string().max(5000, 'Catatan maksimal 5000 karakter').optional().nullable(),
});

// ============================================
// AI Schemas
// ============================================

export const aiChatSchema = z.object({
    messages: z
        .array(
            z.object({
                role: z.enum(['user', 'assistant', 'system']),
                content: z.string().min(1, 'Pesan tidak boleh kosong').max(10000, 'Pesan maksimal 10000 karakter'),
            })
        )
        .min(1, 'Minimal 1 pesan')
        .max(50, 'Maksimal 50 pesan'),
});

export const aiQuerySchema = z.object({
    query: z.string().min(1, 'Query tidak boleh kosong').max(500, 'Query maksimal 500 karakter'),
    module: z.string().max(50, 'Module maksimal 50 karakter').optional(),
});

// ============================================
// AI Document Extraction Schemas
// ============================================

export const aiExtractDocumentSchema = z.object({
    fileBase64: z.string().min(1, 'File tidak boleh kosong'),
    fileName: z.string().min(1, 'Nama file wajib diisi').max(255, 'Nama file maksimal 255 karakter'),
    documentType: z.enum(['INVOICE', 'PURCHASE_ORDER', 'RECEIPT', 'KTP', 'NPWP'], {
        message: 'Tipe dokumen tidak valid',
    }),
    mimeType: z.enum(['image/png', 'image/jpeg', 'application/pdf'], {
        message: 'Tipe file tidak didukung',
    }),
});

// ============================================
// AI Anomaly Detection Schemas
// ============================================

export const aiAnomalyScanSchema = z.object({
    force: z.boolean().optional(),
});

export const aiAnomalyQuerySchema = z.object({
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
    status: z.enum(['OPEN', 'DISMISSED', 'INVESTIGATING', 'BLOCKED']).optional(),
    entityType: z.enum(['INVOICE', 'PAYMENT', 'PURCHASE_ORDER', 'QUOTATION', 'JOURNAL_ENTRY']).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
});

// ============================================
// Notification Schemas
// ============================================

export const updateNotificationSchema = z.object({
    ids: z.array(z.string().uuid('ID notifikasi tidak valid')).optional(),
    markAll: z.boolean().optional(),
}).refine((data) => data.ids || data.markAll, {
    message: 'Harus menyediakan array ids atau markAll=true',
});

// ============================================
// Platform Tenant Schemas
// ============================================

export const createTenantSchema = z.object({
    name: z.string().min(1, 'Nama tenant wajib diisi').max(255, 'Nama tenant maksimal 255 karakter'),
    email: z.string().email('Format email tidak valid').max(255, 'Email maksimal 255 karakter'),
    slug: z.string().min(1, 'Slug wajib diisi').max(100, 'Slug maksimal 100 karakter').regex(
        /^[a-z0-9-]+$/,
        'Slug hanya boleh berisi huruf kecil, angka, dan hyphen'
    ),
    domain: z.string().max(255, 'Domain maksimal 255 karakter').optional().nullable(),
    industryType: z.string().max(100, 'Tipe industri maksimal 100 karakter').optional().nullable(),
    plan: z.string().max(50, 'Plan maksimal 50 karakter').optional().nullable(),
});

// ============================================
// Analytics KPI Schemas
// ============================================

export const createKPISchema = z.object({
    name: z.string().min(1, 'Nama KPI wajib diisi').max(255, 'Nama KPI maksimal 255 karakter'),
    description: z.string().max(1000, 'Deskripsi maksimal 1000 karakter').optional().nullable(),
    category: z.enum(['finance', 'sales', 'inventory', 'hr', 'crm', 'cross_module'], {
        message: 'Kategori tidak valid',
    }),
    metricId: z.string().min(1, 'Metric ID wajib diisi').max(255, 'Metric ID maksimal 255 karakter'),
    formula: z.string().max(500, 'Formula maksimal 500 karakter').optional().nullable(),
    target: z.number({ message: 'Target harus berupa angka' }),
    targetType: z.enum(['gte', 'lte', 'eq', 'range'], {
        message: 'Target type tidak valid',
    }).optional(),
    warningThreshold: z.number().min(0).max(100, 'Warning threshold maksimal 100').optional(),
    criticalThreshold: z.number().min(0).max(100, 'Critical threshold maksimal 100').optional(),
    period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], {
        message: 'Periode tidak valid',
    }).optional(),
    ownerId: z.string().optional().nullable(),
    departmentId: z.string().optional().nullable(),
});

// ============================================
// Analytics Report Schemas
// ============================================

export const createReportSchema = z.object({
    name: z.string().min(1, 'Nama laporan wajib diisi').max(255, 'Nama laporan maksimal 255 karakter'),
    description: z.string().max(1000, 'Deskripsi maksimal 1000 karakter').optional().nullable(),
    type: z.enum(['report', 'chart', 'pivot', 'query', 'dashboard'], {
        message: 'Tipe laporan tidak valid',
    }).optional(),
    config: z.record(z.string(), z.unknown()).refine((val) => Object.keys(val).length > 0, {
        message: 'Konfigurasi laporan wajib diisi',
    }),
    tags: z.array(z.string().max(50)).max(20, 'Maksimal 20 tags').optional(),
    folder: z.string().max(255).optional().nullable(),
});

// ============================================
// Analytics Dashboard Schemas
// ============================================

export const createDashboardSchema = z.object({
    name: z.string().min(1, 'Nama dashboard wajib diisi').max(255, 'Nama dashboard maksimal 255 karakter'),
    description: z.string().max(1000, 'Deskripsi maksimal 1000 karakter').optional().nullable(),
    slug: z.string().min(1, 'Slug wajib diisi').max(255, 'Slug maksimal 255 karakter').regex(
        /^[a-z0-9-]+$/,
        'Slug hanya boleh berisi huruf kecil, angka, dan strip'
    ),
    layout: z.string().max(10000).optional(),
    theme: z.enum(['LIGHT', 'DARK', 'AUTO'], {
        message: 'Theme tidak valid',
    }).optional(),
    visibility: z.enum(['PRIVATE', 'TEAM', 'DEPARTMENT', 'ORGANIZATION'], {
        message: 'Visibilitas tidak valid',
    }).optional(),
    department: z.string().max(255).optional().nullable(),
    allowedRoles: z.string().max(500).optional().nullable(),
    allowedUsers: z.string().max(500).optional().nullable(),
    isDefault: z.boolean().optional(),
    isTemplate: z.boolean().optional(),
    tags: z.string().max(500).optional().nullable(),
    refreshAll: z.number().int().min(0).max(3600).optional(),
});

// ============================================
// Analytics Alert Schemas
// ============================================

export const createAlertSchema = z.object({
    name: z.string().min(1, 'Nama alert wajib diisi').max(255, 'Nama alert maksimal 255 karakter'),
    description: z.string().max(1000, 'Deskripsi maksimal 1000 karakter').optional().nullable(),
    metricId: z.string().min(1, 'Metric ID wajib diisi').max(255),
    condition: z.enum(['below', 'above', 'equals', 'not_equals', 'changes_by'], {
        message: 'Kondisi alert tidak valid',
    }),
    threshold: z.number({ message: 'Threshold harus berupa angka' }),
    severity: z.enum(['low', 'medium', 'high', 'critical'], {
        message: 'Severity tidak valid',
    }).optional(),
    notificationChannels: z.array(z.string().max(50)).max(10, 'Maksimal 10 channel').optional(),
    recipients: z.array(z.string().max(255)).max(50, 'Maksimal 50 penerima').optional(),
    cooldownMinutes: z.number().int().min(0).max(1440, 'Cooldown maksimal 1440 menit').optional(),
});

// ============================================
// Workflow Transition Schemas
// ============================================

export const workflowTransitionSchema = z.object({
    entityType: z.enum(['INVOICE', 'QUOTATION', 'PURCHASE_ORDER', 'LEAVE_REQUEST', 'PAYROLL', 'DEAL'], {
        message: 'Tipe entitas tidak valid',
    }),
    entityId: z.string().min(1, 'Entity ID wajib diisi').max(255, 'Entity ID maksimal 255 karakter'),
    action: z.string().min(1, 'Aksi wajib diisi').max(100, 'Aksi maksimal 100 karakter'),
    notes: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional().nullable(),
});

// ============================================
// Recurring Invoice Schemas
// ============================================

export const createRecurringInvoiceSchema = z.object({
    contactId: z.string().min(1, 'Contact wajib dipilih'),
    invoiceNumber: z.string().max(100, 'Invoice number maksimal 100 karakter').optional().nullable(),
    notes: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional().nullable(),
    taxRate: z.number().min(0, 'Tax rate tidak boleh negatif').max(100, 'Tax rate maksimal 100%').optional().nullable(),
    frequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'], {
        message: 'Frequency tidak valid',
    }),
    dayOfMonth: z.number().int().min(1, 'Day of month minimal 1').max(28, 'Day of month maksimal 28').optional().nullable(),
    dayOfWeek: z.number().int().min(0, 'Day of week minimal 0 (Minggu)').max(6, 'Day of week maksimal 6 (Sabtu)').optional().nullable(),
    startDate: z.string().min(1, 'Tanggal mulai wajib diisi'),
    endDate: z.string().optional().nullable(),
    items: z.array(z.object({
        description: z.string().min(1, 'Deskripsi item wajib diisi').max(500, 'Deskripsi maksimal 500 karakter'),
        quantity: z.number().positive('Quantity harus lebih dari 0'),
        unitPrice: z.number().min(0, 'Harga satuan tidak boleh negatif'),
        productId: z.string().optional().nullable(),
    })).min(1, 'Minimal 1 item harus ditambahkan'),
});

// ============================================
// Recurring Invoice Update Schema
// ============================================

export const updateRecurringInvoiceSchema = z.object({
    status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'], {
        message: 'Status harus ACTIVE, PAUSED, COMPLETED, atau CANCELLED',
    }).optional(),
    frequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'], {
        message: 'Frekuensi tidak valid',
    }).optional(),
    dayOfMonth: z.number().int().min(1, 'Tanggal minimal 1').max(31, 'Tanggal maksimal 31').optional().nullable(),
    dayOfWeek: z.number().int().min(0, 'Hari minimal 0 (Minggu)').max(6, 'Hari maksimal 6 (Sabtu)').optional().nullable(),
    nextRunDate: z.string().optional().nullable(),
    startDate: z.string().optional(),
    endDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    invoiceNumber: z.string().max(50).optional().nullable(),
    taxRate: z.number().min(0).max(100, 'Pajak maksimal 100%').optional(),
});

// ============================================
// Accounting Period Schemas
// ============================================

export const createPeriodSchema = z.object({
    name: z.string().min(1, 'Period name is required').max(100),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
});

export const generatePeriodsSchema = z.object({
    year: z.number().int().min(2020).max(2099),
});

// ============================================
// Analytics Chart Schemas
// ============================================

export const createAnalyticsChartSchema = z.object({
    name: z.string().min(1, 'Nama chart wajib diisi').max(255, 'Nama chart maksimal 255 karakter'),
    description: z.string().max(1000, 'Deskripsi maksimal 1000 karakter').optional().nullable(),
    slug: z.string().min(1, 'Slug wajib diisi').max(255, 'Slug maksimal 255 karakter'),
    chartType: z.enum(['bar', 'line', 'pie', 'donut', 'area', 'scatter', 'heatmap', 'kpi_card', 'table'], {
        message: 'Tipe chart tidak valid',
    }),
    config: z.string().optional().nullable(),
    dataSource: z.enum(['DATASET', 'QUERY', 'METRIC'], {
        message: 'Data source tidak valid',
    }).optional(),
    datasetId: z.string().optional().nullable(),
    queryId: z.string().optional().nullable(),
    metricId: z.string().optional().nullable(),
    queryConfig: z.string().optional().nullable(),
    visibility: z.enum(['PRIVATE', 'TEAM', 'DEPARTMENT', 'ORGANIZATION'], {
        message: 'Visibility tidak valid',
    }).optional(),
    isTemplate: z.boolean().optional(),
    tags: z.string().optional().nullable(),
});

export const updateAnalyticsChartSchema = z.object({
    name: z.string().min(1, 'Nama chart wajib diisi').max(255, 'Nama chart maksimal 255 karakter').optional(),
    description: z.string().max(1000, 'Deskripsi maksimal 1000 karakter').optional().nullable(),
    slug: z.string().min(1, 'Slug wajib diisi').max(255, 'Slug maksimal 255 karakter').optional(),
    chartType: z.enum(['bar', 'line', 'pie', 'donut', 'area', 'scatter', 'heatmap', 'kpi_card', 'table'], {
        message: 'Tipe chart tidak valid',
    }).optional(),
    config: z.string().optional().nullable(),
    dataSource: z.enum(['DATASET', 'QUERY', 'METRIC'], {
        message: 'Data source tidak valid',
    }).optional(),
    datasetId: z.string().optional().nullable(),
    queryId: z.string().optional().nullable(),
    metricId: z.string().optional().nullable(),
    queryConfig: z.string().optional().nullable(),
    visibility: z.enum(['PRIVATE', 'TEAM', 'DEPARTMENT', 'ORGANIZATION'], {
        message: 'Visibility tidak valid',
    }).optional(),
    isTemplate: z.boolean().optional(),
    tags: z.string().optional().nullable(),
});

// ============================================
// Scheduled Query Schema
// ============================================

export const createScheduledQuerySchema = z.object({
    name: z.string().min(1, 'Nama scheduled query wajib diisi').max(255, 'Nama maksimal 255 karakter'),
    description: z.string().max(1000, 'Deskripsi maksimal 1000 karakter').optional().nullable(),
    queryHistoryId: z.string().min(1, 'Query History ID wajib diisi'),
    datasetId: z.string().optional().nullable(),
    cronExpression: z.string().min(1, 'Cron expression wajib diisi').max(100, 'Cron expression maksimal 100 karakter'),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'], {
        message: 'Frekuensi tidak valid',
    }),
    timeOfDay: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format timeOfDay harus HH:MM (24 jam)').optional(),
    outputFormat: z.enum(['EMAIL', 'PDF', 'EXCEL', 'CSV', 'SLACK'], {
        message: 'Output format tidak valid',
    }).optional(),
    recipients: z.array(z.string().max(255)).max(50, 'Maksimal 50 penerima').optional(),
    alertOnFailure: z.boolean().optional(),
    alertOnAnomaly: z.boolean().optional(),
});

// ============================================
// Alert Update Schema
// ============================================

export const updateAlertSchema = z.object({
    name: z.string().min(1, 'Nama alert wajib diisi').max(255, 'Nama alert maksimal 255 karakter').optional(),
    description: z.string().max(1000, 'Deskripsi maksimal 1000 karakter').optional().nullable(),
    metricId: z.string().min(1, 'Metric ID wajib diisi').max(255).optional(),
    condition: z.enum(['below', 'above', 'equals', 'not_equals', 'changes_by'], {
        message: 'Kondisi alert tidak valid',
    }).optional(),
    threshold: z.number({ message: 'Threshold harus berupa angka' }).optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical'], {
        message: 'Severity tidak valid',
    }).optional(),
    notificationChannels: z.array(z.string().max(50)).max(10, 'Maksimal 10 channel').optional(),
    recipients: z.array(z.string().max(255)).max(50, 'Maksimal 50 penerima').optional(),
    cooldownMinutes: z.number().int().min(0).max(1440, 'Cooldown maksimal 1440 menit').optional(),
    isActive: z.boolean().optional(),
});

// ============================================
// Analytics Explorer Schema
// ============================================

export const analyticsExplorerRequestSchema = z.object({
    dataset: z.string().min(1, 'Dataset wajib diisi'),
    dimensions: z.array(z.string()).default([]),
    measures: z.array(z.string()).default([]),
    filters: z.array(z.object({
        field: z.string(),
        operator: z.string(),
        value: z.unknown(),
    })).default([]),
    dateRange: z.object({
        from: z.string().min(1, 'Tanggal from wajib diisi'),
        to: z.string().min(1, 'Tanggal to wajib diisi'),
        granularity: z.string().optional(),
    }).optional(),
    orderBy: z.array(z.object({
        field: z.string(),
        direction: z.enum(['asc', 'desc']),
    })).optional(),
    limit: z.number().int().min(1, 'Limit minimal 1').max(10000, 'Limit maksimal 10000').optional(),
    offset: z.number().int().min(0, 'Offset tidak boleh negatif').optional(),
});

// ============================================
// Data Dictionary Entry Schema
// ============================================

export const createDictionaryEntrySchema = z.object({
    name: z.string().min(1, 'Nama entry wajib diisi').max(255, 'Nama maksimal 255 karakter'),
    type: z.enum(['metric', 'dimension', 'measure', 'dataset', 'field'], {
        message: 'Tipe entry tidak valid',
    }),
    category: z.enum(['finance', 'sales', 'inventory', 'hr', 'crm'], {
        message: 'Kategori tidak valid',
    }),
    businessDef: z.string().min(1, 'Definisi bisnis wajib diisi').max(2000, 'Definisi bisnis maksimal 2000 karakter'),
    technicalDef: z.string().max(2000, 'Definisi teknis maksimal 2000 karakter').optional().nullable(),
    example: z.string().max(1000, 'Contoh maksimal 1000 karakter').optional().nullable(),
    sourceModule: z.string().min(1, 'Source module wajib diisi').max(100, 'Source module maksimal 100 karakter'),
    sourceModel: z.string().min(1, 'Source model wajib diisi').max(100, 'Source model maksimal 100 karakter'),
    sourceField: z.string().max(100, 'Source field maksimal 100 karakter').optional().nullable(),
    formula: z.string().max(1000, 'Formula maksimal 1000 karakter').optional().nullable(),
    dependencies: z.string().max(1000, 'Dependencies maksimal 1000 karakter').optional().nullable(),
    upstreamDeps: z.string().max(1000, 'Upstream deps maksimal 1000 karakter').optional().nullable(),
    downstreamDeps: z.string().max(1000, 'Downstream deps maksimal 1000 karakter').optional().nullable(),
    freshness: z.enum(['REALTIME', 'HOURLY', 'DAILY', 'WEEKLY'], {
        message: 'Freshness tidak valid',
    }).optional().nullable(),
    reliability: z.enum(['HIGH', 'MEDIUM', 'LOW'], {
        message: 'Reliability tidak valid',
    }).optional().nullable(),
    owner: z.string().max(255, 'Owner maksimal 255 karakter').optional().nullable(),
    department: z.string().max(255, 'Department maksimal 255 karakter').optional().nullable(),
});

// ============================================
// Query History Schema
// ============================================

export const createQueryHistorySchema = z.object({
    queryType: z.enum(['SQL', 'VISUAL', 'AI', 'DASHBOARD', 'KPI'], {
        message: 'Tipe query tidak valid',
    }),
    sql: z.string().min(1, 'SQL query wajib diisi').max(50000, 'SQL query maksimal 50000 karakter'),
    visualConfig: z.string().optional().nullable(),
    datasetId: z.string().optional().nullable(),
    datasetName: z.string().max(255, 'Dataset name maksimal 255 karakter').optional().nullable(),
    executionMs: z.number().int().min(0, 'Execution time tidak boleh negatif'),
    rowsReturned: z.number().int().min(0, 'Rows returned tidak boleh negatif'),
    rowsScanned: z.number().int().min(0).optional().nullable(),
    status: z.enum(['SUCCESS', 'FAILED', 'TIMEOUT', 'BLOCKED'], {
        message: 'Status tidak valid',
    }),
    errorMessage: z.string().max(5000, 'Error message maksimal 5000 karakter').optional().nullable(),
    fromCache: z.boolean().optional(),
    ipAddress: z.string().max(45, 'IP address maksimal 45 karakter').optional().nullable(),
    userAgent: z.string().max(500, 'User agent maksimal 500 karakter').optional().nullable(),
});

// ============================================
// SMTP Configuration Schema
// ============================================

export const updateSmtpConfigSchema = z.object({
    smtpHost: z.string().min(1, 'SMTP host wajib diisi').max(255, 'SMTP host maksimal 255 karakter'),
    smtpPort: z.string().regex(/^\d{1,5}$/, 'Port harus berupa angka 1-5 digit')
        .refine((val) => {
            const port = parseInt(val, 10);
            return port >= 1 && port <= 65535;
        }, 'Port harus antara 1-65535'),
    smtpEmail: z.string().email('Format email tidak valid').max(255, 'Email maksimal 255 karakter'),
    smtpPassword: z.string().max(255, 'Password maksimal 255 karakter').optional().nullable(),
    useTLS: z.boolean().optional().default(true),
});

// ============================================
// Workflow Definition Schema
// ============================================

const workflowConfigSchema = z.object({
    states: z.array(z.string().min(1, 'State name tidak boleh kosong'))
        .min(1, 'Minimal harus ada 1 state'),
    transitions: z.array(z.object({
        from: z.string().min(1, 'From state wajib diisi'),
        to: z.string().min(1, 'To state wajib diisi'),
        action: z.string().min(1, 'Action wajib diisi'),
        requiredRole: z.string().optional(),
    })),
    initialState: z.string().min(1, 'Initial state wajib diisi'),
    finalStates: z.array(z.string().min(1, 'Final state name tidak boleh kosong')),
});

export const createWorkflowDefinitionSchema = z.object({
    entityType: z.string().min(1, 'Entity type wajib diisi').max(100, 'Entity type maksimal 100 karakter'),
    name: z.string().min(1, 'Nama workflow wajib diisi').max(255, 'Nama workflow maksimal 255 karakter'),
    description: z.string().max(1000, 'Deskripsi maksimal 1000 karakter').optional().nullable(),
    config: workflowConfigSchema,
});

export const updateWorkflowDefinitionSchema = z.object({
    entityType: z.string().min(1, 'Entity type wajib diisi').max(100, 'Entity type maksimal 100 karakter').optional(),
    name: z.string().min(1, 'Nama workflow wajib diisi').max(255, 'Nama workflow maksimal 255 karakter').optional(),
    description: z.string().max(1000, 'Deskripsi maksimal 1000 karakter').optional().nullable(),
    config: workflowConfigSchema.optional(),
});

// ============================================
// Auth Schemas
// ============================================

export const registerSchema = z.object({
    companyName: z.string().min(1, 'Nama perusahaan wajib diisi').max(255, 'Nama perusahaan maksimal 255 karakter'),
    fullName: z.string().min(1, 'Nama lengkap wajib diisi').max(255, 'Nama lengkap maksimal 255 karakter'),
    email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid').max(255, 'Email maksimal 255 karakter'),
    password: z.string().min(8, 'Password minimal 8 karakter').max(128, 'Password maksimal 128 karakter'),
});

export const mobileRegisterSchema = z.object({
    companyName: z.string().min(1, 'Nama perusahaan wajib diisi').max(255, 'Nama perusahaan maksimal 255 karakter'),
    name: z.string().min(1, 'Nama wajib diisi').max(255, 'Nama maksimal 255 karakter'),
    email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid').max(255, 'Email maksimal 255 karakter'),
    password: z.string().min(8, 'Password minimal 8 karakter').max(128, 'Password maksimal 128 karakter'),
});
