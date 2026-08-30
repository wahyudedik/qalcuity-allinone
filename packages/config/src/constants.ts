// ============================================
// @qalcuity/config — App Constants
// ============================================

// --------------------------------------------
// Roles & Permissions
// --------------------------------------------

export const ROLES = {
    SUPERADMIN: 'SUPERADMIN',
    ADMIN: 'ADMIN',
    MEMBER: 'MEMBER',
    VIEWER: 'VIEWER',
} as const;

export type RoleKey = keyof typeof ROLES;

export const ROLE_LABELS: Record<string, string> = {
    SUPERADMIN: 'Super Admin',
    ADMIN: 'Admin',
    MEMBER: 'Anggota',
    VIEWER: 'Pengamat',
    OWNER: 'Pemilik',
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
    SUPERADMIN: 'Akses penuh ke semua fitur dan pengaturan sistem',
    ADMIN: 'Akses ke semua fitur kecuali pengaturan sistem',
    MEMBER: 'Akses terbatas sesuai modul yang ditugaskan',
    VIEWER: 'Hanya dapat melihat data tanpa bisa mengubah',
    OWNER: 'Akses penuh ke semua fitur dan pengaturan',
};

// --------------------------------------------
// Invoice Status
// --------------------------------------------

export const INVOICE_STATUSES = {
    DRAFT: 'DRAFT',
    SENT: 'SENT',
    PAID: 'PAID',
    OVERDUE: 'OVERDUE',
    CANCELLED: 'CANCELLED',
} as const;

export const INVOICE_STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Draft',
    SENT: 'Terkirim',
    PAID: 'Lunas',
    OVERDUE: 'Jatuh Tempo',
    CANCELLED: 'Dibatalkan',
};

// --------------------------------------------
// Quotation Status
// --------------------------------------------

export const QUOTATION_STATUSES = {
    DRAFT: 'DRAFT',
    SENT: 'SENT',
    ACCEPTED: 'ACCEPTED',
    REJECTED: 'REJECTED',
    EXPIRED: 'EXPIRED',
} as const;

export const QUOTATION_STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Draft',
    SENT: 'Terkirim',
    ACCEPTED: 'Diterima',
    REJECTED: 'Ditolak',
    EXPIRED: 'Kedaluwarsa',
};

// --------------------------------------------
// Purchase Order Status
// --------------------------------------------

export const PURCHASE_ORDER_STATUSES = {
    DRAFT: 'DRAFT',
    SENT: 'SENT',
    CONFIRMED: 'CONFIRMED',
    RECEIVED: 'RECEIVED',
    CANCELLED: 'CANCELLED',
} as const;

export const PURCHASE_ORDER_STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Draft',
    SENT: 'Terkirim',
    CONFIRMED: 'Dikonfirmasi',
    RECEIVED: 'Diterima',
    CANCELLED: 'Dibatalkan',
};

// --------------------------------------------
// Payment Status
// --------------------------------------------

export const PAYMENT_STATUSES = {
    COMPLETED: 'COMPLETED',
    PENDING: 'PENDING',
    FAILED: 'FAILED',
} as const;

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
    COMPLETED: 'Selesai',
    PENDING: 'Menunggu',
    FAILED: 'Gagal',
};

// --------------------------------------------
// Payment Methods
// --------------------------------------------

export const PAYMENT_METHODS = {
    BANK_TRANSFER: 'BANK_TRANSFER',
    CASH: 'CASH',
    CREDIT_CARD: 'CREDIT_CARD',
    E_WALLET: 'E_WALLET',
} as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
    BANK_TRANSFER: 'Transfer Bank',
    CASH: 'Tunai',
    CREDIT_CARD: 'Kartu Kredit',
    E_WALLET: 'E-Wallet',
};

// --------------------------------------------
// Lead Status
// --------------------------------------------

export const LEAD_STATUSES = {
    NEW: 'NEW',
    CONTACTED: 'CONTACTED',
    QUALIFIED: 'QUALIFIED',
    PROPOSAL: 'PROPOSAL',
    NEGOTIATION: 'NEGOTIATION',
    WON: 'WON',
    LOST: 'LOST',
} as const;

export const LEAD_STATUS_LABELS: Record<string, string> = {
    NEW: 'Baru',
    CONTACTED: 'Dihubungi',
    QUALIFIED: 'Kualifikasi',
    PROPOSAL: 'Proposal',
    NEGOTIATION: 'Negosiasi',
    WON: 'Menang',
    LOST: 'Kalah',
};

// --------------------------------------------
// Deal Stage
// --------------------------------------------

export const DEAL_STAGES = {
    DISCOVERY: 'DISCOVERY',
    PROPOSAL: 'PROPOSAL',
    NEGOTIATION: 'NEGOTIATION',
    CLOSING: 'CLOSING',
    CLOSED_WON: 'CLOSED_WON',
    CLOSED_LOST: 'CLOSED_LOST',
} as const;

export const DEAL_STAGE_LABELS: Record<string, string> = {
    DISCOVERY: 'Discovery',
    PROPOSAL: 'Proposal',
    NEGOTIATION: 'Negosiasi',
    CLOSING: 'Closing',
    CLOSED_WON: 'Won',
    CLOSED_LOST: 'Lost',
};

// --------------------------------------------
// Employee Status
// --------------------------------------------

export const EMPLOYEE_STATUSES = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    TERMINATED: 'TERMINATED',
} as const;

export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'Aktif',
    INACTIVE: 'Tidak Aktif',
    TERMINATED: 'Dipecat',
};

// --------------------------------------------
// Leave Types
// --------------------------------------------

export const LEAVE_TYPES = {
    ANNUAL: 'ANNUAL',
    SICK: 'SICK',
    PERSONAL: 'PERSONAL',
    MATERNITY: 'MATERNITY',
    UNPAID: 'UNPAID',
} as const;

export const LEAVE_TYPE_LABELS: Record<string, string> = {
    ANNUAL: 'Cuti Tahunan',
    SICK: 'Sakit',
    PERSONAL: 'Cuti Pribadi',
    MATERNITY: 'Cuti Melahirkan',
    UNPAID: 'Cuti Tanpa Gaji',
};

// --------------------------------------------
// Leave Request Status
// --------------------------------------------

export const LEAVE_REQUEST_STATUSES = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
} as const;

export const LEAVE_REQUEST_STATUS_LABELS: Record<string, string> = {
    PENDING: 'Menunggu',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
};

// --------------------------------------------
// Payroll Status
// --------------------------------------------

export const PAYROLL_STATUSES = {
    PENDING: 'PENDING',
    PROCESSED: 'PROCESSED',
    PAID: 'PAID',
} as const;

export const PAYROLL_STATUS_LABELS: Record<string, string> = {
    PENDING: 'Belum Diproses',
    PROCESSED: 'Sudah Diproses',
    PAID: 'Sudah Dibayar',
};

// --------------------------------------------
// Attendance Status
// --------------------------------------------

export const ATTENDANCE_STATUSES = {
    PRESENT: 'PRESENT',
    LATE: 'LATE',
    ABSENT: 'ABSENT',
    LEAVE: 'LEAVE',
    WFH: 'WFH',
} as const;

export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
    PRESENT: 'Hadir',
    LATE: 'Terlambat',
    ABSENT: 'Tidak Hadir',
    LEAVE: 'Cuti',
    WFH: 'WFH',
};

// --------------------------------------------
// Contact Types
// --------------------------------------------

export const CONTACT_TYPES = {
    CUSTOMER: 'CUSTOMER',
    SUPPLIER: 'SUPPLIER',
    BOTH: 'BOTH',
} as const;

export const CONTACT_TYPE_LABELS: Record<string, string> = {
    CUSTOMER: 'Customer',
    SUPPLIER: 'Supplier',
    BOTH: 'Keduanya',
};

// --------------------------------------------
// Subscription Status
// --------------------------------------------

export const SUBSCRIPTION_STATUSES = {
    TRIAL: 'TRIAL',
    ACTIVE: 'ACTIVE',
    PENDING_PAYMENT: 'PENDING_PAYMENT',
    SUSPENDED: 'SUSPENDED',
    CANCELLED: 'CANCELLED',
} as const;

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
    TRIAL: 'Trial',
    ACTIVE: 'Aktif',
    PENDING_PAYMENT: 'Menunggu Pembayaran',
    SUSPENDED: 'Ditangguhkan',
    CANCELLED: 'Dibatalkan',
};

// --------------------------------------------
// Billing Payment Status
// --------------------------------------------

export const BILLING_PAYMENT_STATUSES = {
    PENDING: 'PENDING',
    VERIFIED: 'VERIFIED',
    REJECTED: 'REJECTED',
} as const;

export const BILLING_PAYMENT_STATUS_LABELS: Record<string, string> = {
    PENDING: 'Menunggu Verifikasi',
    VERIFIED: 'Terverifikasi',
    REJECTED: 'Ditolak',
};

// --------------------------------------------
// App Limits
// --------------------------------------------

export const LIMITS = {
    MAX_PAGE_SIZE: 100,
    DEFAULT_PAGE_SIZE: 10,
    MAX_SEARCH_LENGTH: 255,
    MAX_FILE_SIZE_MB: 10,
    MAX_INVOICE_ITEMS: 50,
    MAX_QUOTATION_ITEMS: 50,
    MAX_NOTES_LENGTH: 2000,
    MAX_DESCRIPTION_LENGTH: 1000,
    SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 128,
} as const;

// --------------------------------------------
// Currencies
// --------------------------------------------

export const CURRENCIES = {
    IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
    USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
    EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
} as const;

// --------------------------------------------
// Tax Rates
// --------------------------------------------

export const TAX_RATES = {
    PPN: 11, // Pajak Pertambahan Nilai (Indonesia)
    PPH_23: 2, // Pajak Penghasilan Pasal 23
    PPH_21: 0, // Calculated based on bracket
    NONE: 0,
} as const;

// --------------------------------------------
// Date Formats
// --------------------------------------------

export const DATE_FORMATS = {
    ISO: 'yyyy-MM-dd',
    DISPLAY: 'dd MMMM yyyy',
    DISPLAY_SHORT: 'dd MMM yyyy',
    DISPLAY_FULL: 'EEEE, dd MMMM yyyy',
    MONTH_YEAR: 'MMMM yyyy',
    TIME: 'HH:mm',
    DATETIME: 'dd MMMM yyyy HH:mm',
} as const;

// --------------------------------------------
// Timezones
// --------------------------------------------

export const TIMEZONES = {
    WIB: 'Asia/Jakarta',
    WITA: 'Asia/Makassar',
    WIT: 'Asia/Jayapura',
} as const;

export const TIMEZONE_LABELS: Record<string, string> = {
    'Asia/Jakarta': 'Asia/Jakarta (WIB)',
    'Asia/Makassar': 'Asia/Makassar (WITA)',
    'Asia/Jayapura': 'Asia/Jayapura (WIT)',
};

// --------------------------------------------
// Supported Languages
// --------------------------------------------

export const LANGUAGES = {
    ID: 'id',
    EN: 'en',
} as const;

export const LANGUAGE_LABELS: Record<string, string> = {
    id: 'Bahasa Indonesia',
    en: 'English',
};

// --------------------------------------------
// Account Types (Chart of Accounts)
// --------------------------------------------

export const ACCOUNT_TYPES = {
    ASSET: 'asset',
    LIABILITY: 'liability',
    EQUITY: 'equity',
    REVENUE: 'revenue',
    EXPENSE: 'expense',
} as const;

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
    asset: 'Aset',
    liability: 'Kewajiban',
    equity: 'Ekuitas',
    revenue: 'Pendapatan',
    expense: 'Beban',
};

// --------------------------------------------
// Stock Movement Types
// --------------------------------------------

export const STOCK_MOVEMENT_TYPES = {
    IN: 'IN',
    OUT: 'OUT',
    ADJUSTMENT: 'ADJUSTMENT',
} as const;

export const STOCK_MOVEMENT_TYPE_LABELS: Record<string, string> = {
    IN: 'Masuk',
    OUT: 'Keluar',
    ADJUSTMENT: 'Penyesuaian',
};
