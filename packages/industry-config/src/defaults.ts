/**
 * @qalcuity/industry-config — Default Configurations
 *
 * Default industry configurations untuk 8 industri yang didukung.
 * Setiap industri memiliki module visibility, custom fields,
 * dashboard widgets, dan approval rules yang sesuai.
 */

import type { IndustryConfig, IndustryType } from './types';

// ─── Default Modules ─────────────────────────────────────────────────────────

const ALL_MODULES_ON = {
    finance: true,
    crm: true,
    hr: true,
    inventory: true,
    billing: true,
    analytics: true,
};

// ─── Retail ──────────────────────────────────────────────────────────────────

const retailConfig: IndustryConfig = {
    id: 'retail',
    industry: 'retail',
    name: 'Retail',
    description: 'Konfigurasi untuk bisnis retail, toko, dan perdagangan langsung.',
    modules: {
        finance: true,
        crm: true,
        hr: true,
        inventory: true,
        billing: true,
        analytics: true,
    },
    customFields: {
        product: [
            { name: 'sku', label: 'SKU', type: 'text', required: true },
            { name: 'barcode', label: 'Barcode', type: 'text', required: false },
            { name: 'shelf_location', label: 'Shelf Location', type: 'text', required: false },
            { name: 'min_stock', label: 'Minimum Stock', type: 'number', required: true, defaultValue: 0 },
            { name: 'max_stock', label: 'Maximum Stock', type: 'number', required: false, defaultValue: 0 },
            { name: 'discount_eligible', label: 'Discount Eligible', type: 'boolean', required: false, defaultValue: true },
        ],
        invoice: [
            { name: 'payment_method', label: 'Payment Method', type: 'select', required: true, options: ['Cash', 'Card', 'QRIS', 'Transfer', 'E-Wallet'] },
            { name: 'store_location', label: 'Store Location', type: 'text', required: false },
        ],
        contact: [
            { name: 'customer_type', label: 'Customer Type', type: 'select', required: false, options: ['Walk-in', 'Regular', 'VIP', 'Wholesale'] },
            { name: 'loyalty_points', label: 'Loyalty Points', type: 'number', required: false, defaultValue: 0 },
        ],
    },
    dashboardWidgets: [
        { id: 'retail_top_products', type: 'chart', title: 'Produk Terlaris', module: 'inventory', metric: 'sales_by_product', size: 'lg' },
        { id: 'retail_low_stock', type: 'list', title: 'Peringatan Stok Menipis', module: 'inventory', metric: 'low_stock_items', size: 'md' },
        { id: 'retail_daily_sales', type: 'stat', title: 'Penjualan Hari Ini', module: 'finance', metric: 'daily_revenue', size: 'sm' },
        { id: 'retail_inventory_value', type: 'stat', title: 'Nilai Inventaris', module: 'inventory', metric: 'total_inventory_value', size: 'sm' },
        { id: 'retail_transactions', type: 'table', title: 'Transaksi Terbaru', module: 'finance', metric: 'recent_transactions', size: 'md' },
    ],
    reports: [
        { id: 'retail_sales_report', name: 'Laporan Penjualan Harian', module: 'finance', metrics: ['daily_revenue', 'transaction_count', 'avg_transaction'], groupBy: 'date' },
        { id: 'retail_inventory_report', name: 'Laporan Stok Produk', module: 'inventory', metrics: ['stock_level', 'stock_value', 'turnover_rate'], groupBy: 'category' },
        { id: 'retail_top_products_report', name: 'Laporan Produk Terlaris', module: 'inventory', metrics: ['units_sold', 'revenue', 'profit_margin'], groupBy: 'product' },
    ],
    documentTemplates: {
        invoice: { name: 'Invoice Retail', fields: ['invoice_number', 'date', 'customer', 'items', 'subtotal', 'tax', 'total', 'payment_method'], layout: 'standard' },
        receipt: { name: 'Struk Belanja', fields: ['store_name', 'date', 'items', 'total', 'payment_method'], layout: 'compact' },
    },
    approvalRules: [
        {
            entity: 'purchase_order', action: 'create', levels: [
                { level: 1, role: 'MEMBER', required: true },
                { level: 2, role: 'ADMIN', required: false },
            ]
        },
        {
            entity: 'discount', action: 'approve', levels: [
                { level: 1, role: 'ADMIN', required: true },
            ]
        },
    ],
};

// ─── Manufacturing ───────────────────────────────────────────────────────────

const manufacturingConfig: IndustryConfig = {
    id: 'manufacturing',
    industry: 'manufacturing',
    name: 'Manufacturing',
    description: 'Konfigurasi untuk industri manufaktur, produksi, dan pabrikan.',
    modules: {
        finance: true,
        crm: true,
        hr: true,
        inventory: true,
        billing: true,
        analytics: true,
    },
    customFields: {
        product: [
            { name: 'sku', label: 'SKU', type: 'text', required: true },
            { name: 'unit_of_measure', label: 'Unit of Measure', type: 'select', required: true, options: ['PCS', 'KG', 'M', 'L', 'SET', 'BOX'] },
            { name: 'min_stock', label: 'Minimum Stock', type: 'number', required: true, defaultValue: 0 },
            { name: 'lead_time_days', label: 'Lead Time (Days)', type: 'number', required: false, defaultValue: 0 },
            { name: 'quality_grade', label: 'Quality Grade', type: 'select', required: false, options: ['A', 'B', 'C'] },
        ],
        purchase_order: [
            { name: 'production_order', label: 'Production Order', type: 'text', required: false },
            { name: 'quality_check', label: 'Quality Check Required', type: 'boolean', required: false, defaultValue: false },
        ],
        invoice: [
            { name: 'production_batch', label: 'Production Batch', type: 'text', required: false },
            { name: 'quality_cert', label: 'Quality Certificate', type: 'text', required: false },
        ],
    },
    dashboardWidgets: [
        { id: 'mfg_production_status', type: 'stat', title: 'Status Produksi', module: 'inventory', metric: 'production_status', size: 'sm' },
        { id: 'mfg_raw_materials', type: 'list', title: 'Bahan Baku', module: 'inventory', metric: 'raw_material_stock', size: 'md' },
        { id: 'mfg_defect_rate', type: 'chart', title: 'Tingkat Cacat', module: 'analytics', metric: 'defect_rate', size: 'md' },
        { id: 'mfg_order_status', type: 'table', title: 'Status Pesanan', module: 'crm', metric: 'order_status', size: 'lg' },
        { id: 'mfg_cost_analysis', type: 'chart', title: 'Analisis Biaya Produksi', module: 'finance', metric: 'production_cost', size: 'md' },
    ],
    reports: [
        { id: 'mfg_production_report', name: 'Laporan Produksi', module: 'inventory', metrics: ['output_qty', 'defect_qty', 'efficiency'], groupBy: 'date' },
        { id: 'mfg_material_report', name: 'Laporan Penggunaan Bahan', module: 'inventory', metrics: ['material_used', 'waste', 'cost'], groupBy: 'material' },
        { id: 'mfg_quality_report', name: 'Laporan Kualitas', module: 'analytics', metrics: ['defect_rate', 'rework_rate', 'pass_rate'], groupBy: 'product' },
    ],
    documentTemplates: {
        invoice: { name: 'Invoice Manufaktur', fields: ['invoice_number', 'date', 'customer', 'items', 'batch_number', 'subtotal', 'tax', 'total'], layout: 'detailed' },
        purchase_order: { name: 'Purchase Order', fields: ['po_number', 'date', 'supplier', 'items', 'delivery_date', 'total'], layout: 'standard' },
    },
    approvalRules: [
        {
            entity: 'purchase_order', action: 'create', levels: [
                { level: 1, role: 'MEMBER', required: true },
                { level: 2, role: 'ADMIN', required: true },
            ]
        },
        {
            entity: 'production_order', action: 'create', levels: [
                { level: 1, role: 'MEMBER', required: true },
                { level: 2, role: 'ADMIN', required: true },
            ]
        },
    ],
};

// ─── Services ────────────────────────────────────────────────────────────────

const servicesConfig: IndustryConfig = {
    id: 'services',
    industry: 'services',
    name: 'Services',
    description: 'Konfigurasi untuk bisnis jasa, konsultan, dan profesional.',
    modules: {
        finance: true,
        crm: true,
        hr: true,
        inventory: false,
        billing: true,
        analytics: true,
    },
    customFields: {
        contact: [
            { name: 'client_type', label: 'Client Type', type: 'select', required: false, options: ['Corporate', 'SME', 'Government', 'Individual'] },
            { name: 'contract_value', label: 'Contract Value', type: 'number', required: false, defaultValue: 0 },
            { name: 'industry_sector', label: 'Industry Sector', type: 'text', required: false },
        ],
        invoice: [
            { name: 'project_name', label: 'Project Name', type: 'text', required: true },
            { name: 'billing_period', label: 'Billing Period', type: 'text', required: false },
            { name: 'hours_worked', label: 'Hours Worked', type: 'number', required: false },
        ],
        employee: [
            { name: 'specialization', label: 'Specialization', type: 'text', required: false },
            { name: 'hourly_rate', label: 'Hourly Rate', type: 'number', required: false, defaultValue: 0 },
            { name: 'certification', label: 'Certification', type: 'text', required: false },
        ],
    },
    dashboardWidgets: [
        { id: 'svc_active_projects', type: 'stat', title: 'Proyek Aktif', module: 'crm', metric: 'active_projects', size: 'sm' },
        { id: 'svc_revenue_by_project', type: 'chart', title: 'Pendapatan per Proyek', module: 'finance', metric: 'revenue_by_project', size: 'lg' },
        { id: 'svc_utilization', type: 'chart', title: 'Utilization Rate', module: 'hr', metric: 'utilization_rate', size: 'md' },
        { id: 'svc_outstanding_invoices', type: 'list', title: 'Invoice Belum Dibayar', module: 'finance', metric: 'outstanding_invoices', size: 'md' },
    ],
    reports: [
        { id: 'svc_project_report', name: 'Laporan Proyek', module: 'crm', metrics: ['revenue', 'hours', 'profit_margin'], groupBy: 'project' },
        { id: 'svc_utilization_report', name: 'Laporan Utilisasi', module: 'hr', metrics: ['billable_hours', 'non_billable_hours', 'utilization'], groupBy: 'employee' },
        { id: 'svc_invoicing_report', name: 'Laporan Penagihan', module: 'finance', metrics: ['invoiced', 'collected', 'outstanding'], groupBy: 'month' },
    ],
    documentTemplates: {
        invoice: { name: 'Invoice Jasa', fields: ['invoice_number', 'date', 'client', 'project', 'items', 'hours', 'rate', 'subtotal', 'tax', 'total'], layout: 'standard' },
        proposal: { name: 'Proposal Proyek', fields: ['project_name', 'client', 'scope', 'timeline', 'budget', 'terms'], layout: 'detailed' },
    },
    approvalRules: [
        {
            entity: 'invoice', action: 'send', levels: [
                { level: 1, role: 'MEMBER', required: true },
                { level: 2, role: 'ADMIN', required: false },
            ]
        },
        {
            entity: 'quotation', action: 'send', levels: [
                { level: 1, role: 'MEMBER', required: true },
                { level: 2, role: 'ADMIN', required: false },
            ]
        },
    ],
};

// ─── Construction ────────────────────────────────────────────────────────────

const constructionConfig: IndustryConfig = {
    id: 'construction',
    industry: 'construction',
    name: 'Construction',
    description: 'Konfigurasi untuk industri konstruksi, bangunan, dan infrastruktur.',
    modules: {
        finance: true,
        crm: true,
        hr: true,
        inventory: true,
        billing: true,
        analytics: true,
    },
    customFields: {
        contact: [
            { name: 'client_type', label: 'Client Type', type: 'select', required: false, options: ['Developer', 'Government', 'Corporate', 'Individual'] },
            { name: 'project_site', label: 'Project Site', type: 'text', required: false },
        ],
        product: [
            { name: 'material_type', label: 'Material Type', type: 'select', required: true, options: ['Cement', 'Steel', 'Wood', 'Sand', 'Aggregate', 'Other'] },
            { name: 'supplier', label: 'Supplier', type: 'text', required: false },
            { name: 'min_stock', label: 'Minimum Stock', type: 'number', required: true, defaultValue: 0 },
            { name: 'unit_of_measure', label: 'Unit of Measure', type: 'select', required: true, options: ['PCS', 'KG', 'M', 'M2', 'M3', 'TON', 'BOX'] },
        ],
        invoice: [
            { name: 'project_name', label: 'Project Name', type: 'text', required: true },
            { name: 'milestone', label: 'Milestone', type: 'text', required: false },
            { name: 'progress_pct', label: 'Progress (%)', type: 'number', required: false },
        ],
    },
    dashboardWidgets: [
        { id: 'const_active_projects', type: 'stat', title: 'Proyek Aktif', module: 'crm', metric: 'active_projects', size: 'sm' },
        { id: 'const_project_progress', type: 'chart', title: 'Progres Proyek', module: 'crm', metric: 'project_progress', size: 'lg' },
        { id: 'const_material_stock', type: 'table', title: 'Stok Material', module: 'inventory', metric: 'material_stock', size: 'md' },
        { id: 'const_revenue', type: 'stat', title: 'Revenue Bulan Ini', module: 'finance', metric: 'monthly_revenue', size: 'sm' },
        { id: 'const_team_on_site', type: 'list', title: 'Tim di Lokasi', module: 'hr', metric: 'team_on_site', size: 'md' },
    ],
    reports: [
        { id: 'const_project_report', name: 'Laporan Proyek', module: 'crm', metrics: ['revenue', 'cost', 'profit', 'progress'], groupBy: 'project' },
        { id: 'const_material_report', name: 'Laporan Penggunaan Material', module: 'inventory', metrics: ['quantity_used', 'cost', 'waste'], groupBy: 'material' },
        { id: 'const_billing_report', name: 'Laporan Tagihan Milestone', module: 'finance', metrics: ['billed', 'collected', 'outstanding'], groupBy: 'project' },
    ],
    documentTemplates: {
        invoice: { name: 'Invoice Konstruksi', fields: ['invoice_number', 'date', 'client', 'project', 'milestone', 'progress', 'items', 'subtotal', 'tax', 'total'], layout: 'detailed' },
        purchase_order: { name: 'Purchase Order Material', fields: ['po_number', 'date', 'supplier', 'project', 'items', 'delivery_date', 'total'], layout: 'standard' },
    },
    approvalRules: [
        {
            entity: 'purchase_order', action: 'create', levels: [
                { level: 1, role: 'MEMBER', required: true },
                { level: 2, role: 'ADMIN', required: true },
            ]
        },
        {
            entity: 'invoice', action: 'send', levels: [
                { level: 1, role: 'MEMBER', required: true },
                { level: 2, role: 'ADMIN', required: true },
            ]
        },
    ],
};

// ─── Healthcare ──────────────────────────────────────────────────────────────

const healthcareConfig: IndustryConfig = {
    id: 'healthcare',
    industry: 'healthcare',
    name: 'Healthcare',
    description: 'Konfigurasi untuk industri kesehatan, klinik, dan rumah sakit.',
    modules: {
        finance: true,
        crm: true,
        hr: true,
        inventory: true,
        billing: true,
        analytics: true,
    },
    customFields: {
        contact: [
            { name: 'patient_id', label: 'Patient ID', type: 'text', required: true },
            { name: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
            { name: 'blood_type', label: 'Blood Type', type: 'select', required: false, options: ['A', 'B', 'AB', 'O', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
            { name: 'insurance_number', label: 'Insurance Number', type: 'text', required: false },
            { name: 'emergency_contact', label: 'Emergency Contact', type: 'text', required: false },
        ],
        product: [
            { name: 'batch_number', label: 'Batch Number', type: 'text', required: true },
            { name: 'expiry_date', label: 'Expiry Date', type: 'date', required: true },
            { name: 'storage_condition', label: 'Storage Condition', type: 'select', required: false, options: ['Room Temperature', 'Refrigerated', 'Frozen', 'Light Sensitive'] },
            { name: 'min_stock', label: 'Minimum Stock', type: 'number', required: true, defaultValue: 0 },
        ],
        invoice: [
            { name: 'patient_name', label: 'Patient Name', type: 'text', required: true },
            { name: 'insurance_claim', label: 'Insurance Claim', type: 'boolean', required: false, defaultValue: false },
            { name: 'service_date', label: 'Service Date', type: 'date', required: true },
        ],
        employee: [
            { name: 'license_number', label: 'License Number', type: 'text', required: true },
            { name: 'specialization', label: 'Specialization', type: 'text', required: false },
            { name: 'shift', label: 'Shift', type: 'select', required: false, options: ['Morning', 'Afternoon', 'Night', 'Rotating'] },
        ],
    },
    dashboardWidgets: [
        { id: 'hc_patients_today', type: 'stat', title: 'Pasien Hari Ini', module: 'crm', metric: 'patients_today', size: 'sm' },
        { id: 'hc_appointments', type: 'list', title: 'Jadwal Appointment', module: 'crm', metric: 'upcoming_appointments', size: 'md' },
        { id: 'hc_medical_stock', type: 'table', title: 'Stok Obat & Alat', module: 'inventory', metric: 'medical_stock', size: 'lg' },
        { id: 'hc_revenue', type: 'stat', title: 'Pendapatan', module: 'finance', metric: 'monthly_revenue', size: 'sm' },
        { id: 'hc_insurance_claims', type: 'chart', title: 'Klaim Asuransi', module: 'finance', metric: 'insurance_claims', size: 'md' },
    ],
    reports: [
        { id: 'hc_patient_report', name: 'Laporan Pasien', module: 'crm', metrics: ['total_patients', 'new_patients', 'visits'], groupBy: 'date' },
        { id: 'hc_medical_stock_report', name: 'Laporan Stok Medis', module: 'inventory', metrics: ['stock_level', 'expiring_items', 'consumption'], groupBy: 'category' },
        { id: 'hc_financial_report', name: 'Laporan Keuangan', module: 'finance', metrics: ['revenue', 'insurance_claims', 'outstanding'], groupBy: 'month' },
    ],
    documentTemplates: {
        invoice: { name: 'Invoice Klinik', fields: ['invoice_number', 'date', 'patient', 'services', 'items', 'subtotal', 'insurance', 'total'], layout: 'standard' },
        receipt: { name: 'Kwitansi Pembayaran', fields: ['receipt_number', 'date', 'patient', 'amount', 'payment_method'], layout: 'compact' },
    },
    approvalRules: [
        {
            entity: 'invoice', action: 'send', levels: [
                { level: 1, role: 'MEMBER', required: true },
                { level: 2, role: 'ADMIN', required: false },
            ]
        },
        {
            entity: 'purchase_order', action: 'create', levels: [
                { level: 1, role: 'MEMBER', required: true },
                { level: 2, role: 'ADMIN', required: true },
            ]
        },
    ],
};

// ─── Education ───────────────────────────────────────────────────────────────

const educationConfig: IndustryConfig = {
    id: 'education',
    industry: 'education',
    name: 'Education',
    description: 'Konfigurasi untuk industri pendidikan, sekolah, dan kursus.',
    modules: {
        finance: true,
        crm: true,
        hr: true,
        inventory: false,
        billing: true,
        analytics: true,
    },
    customFields: {
        contact: [
            { name: 'student_id', label: 'Student ID', type: 'text', required: true },
            { name: 'enrollment_date', label: 'Enrollment Date', type: 'date', required: true },
            { name: 'grade_level', label: 'Grade Level', type: 'select', required: false, options: ['TK', 'SD', 'SMP', 'SMA', 'Kuliah', 'Pasca-Sarjana'] },
            { name: 'parent_name', label: 'Parent/Guardian Name', type: 'text', required: false },
            { name: 'parent_phone', label: 'Parent Phone', type: 'text', required: false },
        ],
        invoice: [
            { name: 'student_name', label: 'Student Name', type: 'text', required: true },
            { name: 'academic_period', label: 'Academic Period', type: 'text', required: true },
            { name: 'fee_type', label: 'Fee Type', type: 'select', required: true, options: ['Tuition', 'Exam', 'Activity', 'Library', 'Lab', 'Other'] },
        ],
        employee: [
            { name: 'nuptk', label: 'NUPTK', type: 'text', required: false },
            { name: 'subject', label: 'Subject', type: 'text', required: false },
            { name: 'employment_type', label: 'Employment Type', type: 'select', required: false, options: ['Permanent', 'Contract', 'Part-time', 'Freelance'] },
        ],
    },
    dashboardWidgets: [
        { id: 'edu_total_students', type: 'stat', title: 'Total Siswa', module: 'crm', metric: 'total_students', size: 'sm' },
        { id: 'edu_enrollment_status', type: 'chart', title: 'Status Pendaftaran', module: 'crm', metric: 'enrollment_status', size: 'md' },
        { id: 'edu_fee_collection', type: 'chart', title: 'Penerimaan SPP', module: 'finance', metric: 'fee_collection', size: 'lg' },
        { id: 'edu_outstanding_fees', type: 'list', title: 'SPP Belum Dibayar', module: 'finance', metric: 'outstanding_fees', size: 'md' },
        { id: 'edu_staff_count', type: 'stat', title: 'Jumlah Staf', module: 'hr', metric: 'total_staff', size: 'sm' },
    ],
    reports: [
        { id: 'edu_student_report', name: 'Laporan Siswa', module: 'crm', metrics: ['enrollment', 'attendance', 'performance'], groupBy: 'grade' },
        { id: 'edu_fee_report', name: 'Laporan SPP', module: 'finance', metrics: ['collected', 'outstanding', 'discount'], groupBy: 'month' },
        { id: 'edu_staff_report', name: 'Laporan Staf', module: 'hr', metrics: ['headcount', 'attendance', 'performance'], groupBy: 'department' },
    ],
    documentTemplates: {
        invoice: { name: 'Tagihan SPP', fields: ['invoice_number', 'student_name', 'academic_period', 'fee_type', 'amount', 'due_date'], layout: 'standard' },
        receipt: { name: 'Kwitansi Pembayaran', fields: ['receipt_number', 'date', 'student_name', 'amount', 'payment_method'], layout: 'compact' },
    },
    approvalRules: [
        {
            entity: 'invoice', action: 'send', levels: [
                { level: 1, role: 'MEMBER', required: true },
                { level: 2, role: 'ADMIN', required: false },
            ]
        },
    ],
};

// ─── Food & Beverage ─────────────────────────────────────────────────────────

const foodBeverageConfig: IndustryConfig = {
    id: 'food_beverage',
    industry: 'food_beverage',
    name: 'Food & Beverage',
    description: 'Konfigurasi untuk industri makanan dan minuman, restoran, dan kafe.',
    modules: {
        finance: true,
        crm: true,
        hr: true,
        inventory: true,
        billing: true,
        analytics: true,
    },
    customFields: {
        product: [
            { name: 'recipe_code', label: 'Recipe Code', type: 'text', required: true },
            { name: 'category', label: 'Category', type: 'select', required: true, options: ['Main Course', 'Appetizer', 'Dessert', 'Beverage', 'Side Dish', 'Ingredient'] },
            { name: 'cost_per_serving', label: 'Cost per Serving', type: 'number', required: true, defaultValue: 0 },
            { name: 'selling_price', label: 'Selling Price', type: 'number', required: true, defaultValue: 0 },
            { name: 'expiry_date', label: 'Expiry Date', type: 'date', required: false },
            { name: 'storage_condition', label: 'Storage Condition', type: 'select', required: false, options: ['Room Temperature', 'Refrigerated', 'Frozen', 'Dry Storage'] },
            { name: 'min_stock', label: 'Minimum Stock', type: 'number', required: true, defaultValue: 0 },
        ],
        invoice: [
            { name: 'table_number', label: 'Table Number', type: 'text', required: false },
            { name: 'order_type', label: 'Order Type', type: 'select', required: true, options: ['Dine-in', 'Takeaway', 'Delivery', 'Catering'] },
            { name: 'payment_method', label: 'Payment Method', type: 'select', required: true, options: ['Cash', 'Card', 'QRIS', 'Transfer', 'E-Wallet'] },
        ],
        contact: [
            { name: 'customer_type', label: 'Customer Type', type: 'select', required: false, options: ['Walk-in', 'Regular', 'VIP', 'Corporate'] },
            { name: 'loyalty_points', label: 'Loyalty Points', type: 'number', required: false, defaultValue: 0 },
            { name: 'allergy_info', label: 'Allergy Info', type: 'text', required: false },
        ],
    },
    dashboardWidgets: [
        { id: 'fb_daily_revenue', type: 'stat', title: 'Pendapatan Hari Ini', module: 'finance', metric: 'daily_revenue', size: 'sm' },
        { id: 'fb_top_items', type: 'chart', title: 'Menu Terlaris', module: 'inventory', metric: 'top_selling_items', size: 'lg' },
        { id: 'fb_ingredient_stock', type: 'list', title: 'Stok Bahan', module: 'inventory', metric: 'ingredient_stock', size: 'md' },
        { id: 'fb_expiring_items', type: 'list', title: 'Bahan Akan Kadaluarsa', module: 'inventory', metric: 'expiring_items', size: 'md' },
        { id: 'fb_order_type', type: 'chart', title: 'Pesanan per Tipe', module: 'finance', metric: 'order_type_breakdown', size: 'md' },
    ],
    reports: [
        { id: 'fb_daily_sales_report', name: 'Laporan Penjualan Harian', module: 'finance', metrics: ['revenue', 'orders', 'avg_order_value'], groupBy: 'date' },
        { id: 'fb_menu_report', name: 'Laporan Menu', module: 'inventory', metrics: ['units_sold', 'revenue', 'cost', 'margin'], groupBy: 'category' },
        { id: 'fb_ingredient_report', name: 'Laporan Bahan Baku', module: 'inventory', metrics: ['usage', 'waste', 'cost'], groupBy: 'ingredient' },
    ],
    documentTemplates: {
        invoice: { name: 'Invoice F&B', fields: ['invoice_number', 'date', 'customer', 'items', 'table_number', 'order_type', 'subtotal', 'tax', 'total'], layout: 'standard' },
        receipt: { name: 'Struk Pesanan', fields: ['receipt_number', 'date', 'items', 'total', 'payment_method'], layout: 'compact' },
    },
    approvalRules: [
        {
            entity: 'purchase_order', action: 'create', levels: [
                { level: 1, role: 'MEMBER', required: true },
                { level: 2, role: 'ADMIN', required: false },
            ]
        },
    ],
};

// ─── General ─────────────────────────────────────────────────────────────────

const generalConfig: IndustryConfig = {
    id: 'general',
    industry: 'general',
    name: 'General',
    description: 'Konfigurasi umum untuk bisnis dengan kebutuhan standar.',
    modules: {
        finance: true,
        crm: true,
        hr: true,
        inventory: true,
        billing: true,
        analytics: true,
    },
    customFields: {
        product: [
            { name: 'sku', label: 'SKU', type: 'text', required: true },
            { name: 'min_stock', label: 'Minimum Stock', type: 'number', required: false, defaultValue: 0 },
        ],
        invoice: [
            { name: 'payment_method', label: 'Payment Method', type: 'select', required: true, options: ['Cash', 'Card', 'Transfer'] },
        ],
    },
    dashboardWidgets: [
        { id: 'gen_revenue', type: 'stat', title: 'Total Revenue', module: 'finance', metric: 'total_revenue', size: 'sm' },
        { id: 'gen_customers', type: 'stat', title: 'Total Pelanggan', module: 'crm', metric: 'total_customers', size: 'sm' },
        { id: 'gen_invoices', type: 'list', title: 'Invoice Terbaru', module: 'finance', metric: 'recent_invoices', size: 'md' },
        { id: 'gen_inventory', type: 'table', title: 'Ringkasan Inventaris', module: 'inventory', metric: 'inventory_summary', size: 'md' },
    ],
    reports: [
        { id: 'gen_financial_report', name: 'Laporan Keuangan', module: 'finance', metrics: ['revenue', 'expense', 'profit'], groupBy: 'month' },
        { id: 'gen_sales_report', name: 'Laporan Penjualan', module: 'finance', metrics: ['sales_count', 'revenue', 'avg_order'], groupBy: 'date' },
        { id: 'gen_inventory_report', name: 'Laporan Inventaris', module: 'inventory', metrics: ['stock_level', 'stock_value'], groupBy: 'category' },
    ],
    documentTemplates: {
        invoice: { name: 'Invoice Standar', fields: ['invoice_number', 'date', 'customer', 'items', 'subtotal', 'tax', 'total'], layout: 'standard' },
    },
    approvalRules: [
        {
            entity: 'purchase_order', action: 'create', levels: [
                { level: 1, role: 'MEMBER', required: true },
                { level: 2, role: 'ADMIN', required: false },
            ]
        },
    ],
};

// ─── Export All Defaults ─────────────────────────────────────────────────────

/**
 * Default configurations untuk semua industri.
 * Key adalah IndustryType.
 */
export const DEFAULT_INDUSTRY_CONFIGS: Record<IndustryType, IndustryConfig> = {
    retail: retailConfig,
    manufacturing: manufacturingConfig,
    services: servicesConfig,
    construction: constructionConfig,
    healthcare: healthcareConfig,
    education: educationConfig,
    food_beverage: foodBeverageConfig,
    general: generalConfig,
};

/**
 * Daftar semua industri yang didukung.
 */
export const SUPPORTED_INDUSTRIES: IndustryType[] = [
    'retail',
    'manufacturing',
    'services',
    'construction',
    'healthcare',
    'education',
    'food_beverage',
    'general',
];
