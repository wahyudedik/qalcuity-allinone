/**
 * Session 44: Add i18n keys for Settings (control-engine, audit, profile) + Inventory minor fixes
 * Run: node apps/web/scripts/add-session44-i18n.js
 */
const fs = require('fs');
const path = require('path');

const idPath = path.resolve(__dirname, '../../../packages/i18n/messages/id.json');
const enPath = path.resolve(__dirname, '../../../packages/i18n/messages/en.json');

const id = JSON.parse(fs.readFileSync(idPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Helper: deep merge
function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key]) target[key] = {};
            deepMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

// ========================================
// 1. CONTROL ENGINE keys (NEW section)
// ========================================
const controlEngineId = {
    tabs: {
        modules: 'Modul',
        workflow: 'Alur Kerja',
        approvals: 'Persetujuan',
        fields: 'Bidang',
        widgets: 'Widget',
        permissions: 'Izin',
        history: 'Riwayat'
    },
    loading: 'Memuat konfigurasi...',
    loadError: 'Gagal memuat konfigurasi',
    loadHistoryError: 'Gagal memuat riwayat',
    saveSuccess: 'Konfigurasi berhasil diupdate',
    saveError: 'Gagal update konfigurasi',
    saveErrorReason: 'Gagal update konfigurasi',
    resetSuccess: 'Berhasil direset ke defaults',
    resetError: 'Gagal reset',
    resetErrorCategory: 'Gagal reset konfigurasi',
    exportSuccess: 'Konfigurasi berhasil di-export',
    exportError: 'Gagal export konfigurasi',
    importInvalidFile: 'File tidak valid',
    exportButton: 'Export',
    importButton: 'Import',
    resetButton: 'Reset',
    saveButton: 'Simpan',
    saving: 'Menyimpan...',
    undoButton: 'Urungkan',
    exportTitle: 'Export Konfigurasi',
    importTitle: 'Import Konfigurasi',
    modules: {
        title: 'Aktivasi Modul',
        subtitle: 'Aktifkan atau nonaktifkan modul yang tersedia di platform',
        coreDisabled: 'Core module tidak bisa dinonaktifkan',
        featuresInModule: 'Fitur dalam modul ini:',
        finance: 'Finance',
        financeDesc: 'Manajemen keuangan, faktur, dan pembukuan',
        crm: 'CRM',
        crmDesc: 'Manajemen pelanggan, leads, dan deals',
        hr: 'HR',
        hrDesc: 'Manajemen karyawan, cuti, dan absensi',
        inventory: 'Persediaan',
        inventoryDesc: 'Manajemen produk, stok, dan gudang',
        billing: 'Tagihan',
        billingDesc: 'Manajemen langganan dan pembayaran',
        pos: 'Point of Sale',
        posDesc: 'Sistem kasir dan transaksi retail',
        operations: 'Operasional',
        operationsDesc: 'Manajemen operasional bisnis sehari-hari',
        analytics: 'Analitik',
        analyticsDesc: 'Dashboard analitik dan laporan',
        aiFeatures: 'Fitur AI',
        aiFeaturesDesc: 'Asisten AI untuk otomasi bisnis',
        enabled: 'Aktif',
        disabled: 'Nonaktif'
    },
    workflow: {
        title: 'Konfigurasi Alur Kerja',
        subtitle: 'Konfigurasi alur kerja per entitas bisnis',
        enabledLabel: 'Aktif',
        statesLabel: 'Status',
        transitionsLabel: 'Transisi',
        entityInvoice: 'Invoice',
        entityPurchaseOrder: 'Purchase Order',
        entityLeaveRequest: 'Pengajuan Cuti',
        entityExpenseClaim: 'Klaim Pengeluaran',
        entityDeal: 'Deal',
        entityLead: 'Lead',
        entityProduct: 'Produk',
        entityEmployee: 'Karyawan',
        entityContact: 'Kontak',
        entityTicket: 'Tiket',
        entityAsset: 'Aset',
        entityProject: 'Proyek'
    },
    approvals: {
        title: 'Aturan Persetujuan',
        subtitle: 'Konfigurasi aturan approval transaksi',
        approvalSystem: 'Sistem Persetujuan',
        approvalSystemDesc: 'Aktifkan atau nonaktifkan sistem approval',
        maxLevels: 'Maksimal Level',
        maxLevelsDesc: 'Jumlah maksimal level approval',
        requireComments: 'Wajibkan Komentar',
        requireCommentsDesc: 'Wajibkan komentar saat approve/reject',
        autoApproveBelow: 'Otomatis Approve Di Bawah',
        autoApproveBelowDesc: 'Nominal yang otomatis disetujui',
        escalationDays: 'Escalation (Hari)',
        escalationDaysDesc: 'Hari sebelum eskalasi otomatis',
        notificationOnApprove: 'Notifikasi saat Approve',
        notificationOnReject: 'Notifikasi saat Reject'
    },
    fields: {
        title: 'Konfigurasi Bidang Kustom',
        subtitle: 'Aktifkan atau nonaktifkan custom fields per entitas',
        enabled: 'Aktif',
        disabled: 'Nonaktif',
        fieldsCount: 'bidang'
    },
    dashboard: {
        title: 'Widget Dashboard',
        subtitle: 'Kelola visibilitas widget dashboard',
        defaultLayout: 'Tata Letak Default',
        positionLabel: 'Posisi',
        sizeLabel: 'Ukuran',
        visibleLabel: 'Terlihat'
    },
    permissions: {
        title: 'Override Izin',
        subtitle: 'Override permission default untuk role tertentu',
        roleLabel: 'Role',
        permissionLabel: 'Izin',
        overrideLabel: 'Override'
    },
    history: {
        title: 'Riwayat Perubahan',
        subtitle: 'Riwayat perubahan konfigurasi',
        empty: 'Belum ada riwayat perubahan',
        time: 'Waktu',
        category: 'Kategori',
        key: 'Kunci',
        oldValue: 'Nilai Lama',
        newValue: 'Nilai Baru',
        changedBy: 'Diubah Oleh',
        reason: 'Alasan'
    }
};

const controlEngineEn = {
    tabs: {
        modules: 'Modules',
        workflow: 'Workflow',
        approvals: 'Approvals',
        fields: 'Fields',
        widgets: 'Widgets',
        permissions: 'Permissions',
        history: 'History'
    },
    loading: 'Loading configuration...',
    loadError: 'Failed to load configuration',
    loadHistoryError: 'Failed to load history',
    saveSuccess: 'Configuration updated successfully',
    saveError: 'Failed to update configuration',
    saveErrorReason: 'Failed to update configuration',
    resetSuccess: 'Successfully reset to defaults',
    resetError: 'Failed to reset',
    resetErrorCategory: 'Failed to reset configuration',
    exportSuccess: 'Configuration exported successfully',
    exportError: 'Failed to export configuration',
    importInvalidFile: 'Invalid file',
    exportButton: 'Export',
    importButton: 'Import',
    resetButton: 'Reset',
    saveButton: 'Save',
    saving: 'Saving...',
    undoButton: 'Undo',
    exportTitle: 'Export Configuration',
    importTitle: 'Import Configuration',
    modules: {
        title: 'Module Activation',
        subtitle: 'Enable or disable modules available on the platform',
        coreDisabled: 'Core module cannot be disabled',
        featuresInModule: 'Features in this module:',
        finance: 'Finance',
        financeDesc: 'Financial management, invoicing, and accounting',
        crm: 'CRM',
        crmDesc: 'Customer, lead, and deal management',
        hr: 'HR',
        hrDesc: 'Employee, leave, and attendance management',
        inventory: 'Inventory',
        inventoryDesc: 'Product, stock, and warehouse management',
        billing: 'Billing',
        billingDesc: 'Subscription and payment management',
        pos: 'Point of Sale',
        posDesc: 'Cashier system and retail transactions',
        operations: 'Operations',
        operationsDesc: 'Daily business operations management',
        analytics: 'Analytics',
        analyticsDesc: 'Analytics dashboards and reports',
        aiFeatures: 'AI Features',
        aiFeaturesDesc: 'AI assistant for business automation',
        enabled: 'Enabled',
        disabled: 'Disabled'
    },
    workflow: {
        title: 'Workflow Configuration',
        subtitle: 'Configure workflow per business entity',
        enabledLabel: 'Enabled',
        statesLabel: 'States',
        transitionsLabel: 'Transitions',
        entityInvoice: 'Invoice',
        entityPurchaseOrder: 'Purchase Order',
        entityLeaveRequest: 'Leave Request',
        entityExpenseClaim: 'Expense Claim',
        entityDeal: 'Deal',
        entityLead: 'Lead',
        entityProduct: 'Product',
        entityEmployee: 'Employee',
        entityContact: 'Contact',
        entityTicket: 'Ticket',
        entityAsset: 'Asset',
        entityProject: 'Project'
    },
    approvals: {
        title: 'Approval Rules',
        subtitle: 'Configure transaction approval rules',
        approvalSystem: 'Approval System',
        approvalSystemDesc: 'Enable or disable the approval system',
        maxLevels: 'Max Approval Levels',
        maxLevelsDesc: 'Maximum number of approval levels',
        requireComments: 'Require Comments',
        requireCommentsDesc: 'Require comments when approving/rejecting',
        autoApproveBelow: 'Auto-Approve Below',
        autoApproveBelowDesc: 'Amount that is automatically approved',
        escalationDays: 'Escalation (Days)',
        escalationDaysDesc: 'Days before automatic escalation',
        notificationOnApprove: 'Notification on Approve',
        notificationOnReject: 'Notification on Reject'
    },
    fields: {
        title: 'Custom Fields Configuration',
        subtitle: 'Enable or disable custom fields per entity',
        enabled: 'Enabled',
        disabled: 'Disabled',
        fieldsCount: 'fields'
    },
    dashboard: {
        title: 'Dashboard Widgets',
        subtitle: 'Manage dashboard widget visibility',
        defaultLayout: 'Default Layout',
        positionLabel: 'Position',
        sizeLabel: 'Size',
        visibleLabel: 'Visible'
    },
    permissions: {
        title: 'Permission Overrides',
        subtitle: 'Override default permissions for specific roles',
        roleLabel: 'Role',
        permissionLabel: 'Permission',
        overrideLabel: 'Override'
    },
    history: {
        title: 'Change History',
        subtitle: 'Configuration change history',
        empty: 'No change history yet',
        time: 'Time',
        category: 'Category',
        key: 'Key',
        oldValue: 'Old Value',
        newValue: 'New Value',
        changedBy: 'Changed By',
        reason: 'Reason'
    }
};

// ========================================
// 2. AUDIT LOG additional keys
// ========================================
const auditIdAdditional = {
    title: 'Jejak Audit',
    subtitle: 'Riwayat aktivitas dan perubahan sistem',
    filter: 'Filter',
    searchPlaceholder: 'Cari...',
    allEntities: 'Semua Entitas',
    allActions: 'Semua Aksi',
    startDate: 'Tanggal Mulai',
    endDate: 'Tanggal Akhir',
    applyFilter: 'Terapkan Filter',
    resetFilter: 'Reset',
    reload: 'Muat Ulang',
    totalEntries: 'total entri',
    retry: 'Coba Lagi',
    loadingLog: 'Memuat audit log...',
    empty: 'Belum Ada Audit Log',
    emptyDescription: 'Aktivitas perubahan data akan tercatat di sini.',
    table: {
        timestamp: 'Waktu',
        user: 'User',
        action: 'Aksi',
        entity: 'Entitas',
        detail: 'Detail',
        ipAddress: 'IP Address',
        actions: 'Aksi'
    },
    detail: {
        title: 'Detail Audit Log',
        timestamp: 'Waktu',
        user: 'User',
        action: 'Aksi',
        entity: 'Entitas',
        ipAddress: 'IP Address',
        newValue: 'Nilai Baru (JSON)',
        oldValue: 'Nilai Lama (JSON)',
        close: 'Tutup',
        details: 'Detail'
    },
    pagination: 'Halaman {page} dari {totalPages}',
    actionCreate: 'CREATE',
    actionUpdate: 'UPDATE',
    actionDelete: 'DELETE',
    actionLogin: 'LOGIN',
    actionExport: 'EXPORT',
    actionImport: 'IMPORT',
    entityInvoice: 'Invoice',
    entityProduct: 'Product',
    entityContact: 'Contact',
    entityLead: 'Lead',
    entityDeal: 'Deal',
    entityEmployee: 'Employee',
    entityUser: 'User',
    entityTenant: 'Tenant',
    entityCategory: 'Category',
    entitySupplier: 'Supplier',
    entityTicket: 'Ticket',
    entityProject: 'Project'
};

const auditEnAdditional = {
    title: 'Audit Trail',
    subtitle: 'Activity history and system changes',
    filter: 'Filter',
    searchPlaceholder: 'Search...',
    allEntities: 'All Entities',
    allActions: 'All Actions',
    startDate: 'Start Date',
    endDate: 'End Date',
    applyFilter: 'Apply Filter',
    resetFilter: 'Reset',
    reload: 'Reload',
    totalEntries: 'total entries',
    retry: 'Try Again',
    loadingLog: 'Loading audit log...',
    empty: 'No Audit Log Yet',
    emptyDescription: 'Data change activities will be recorded here.',
    table: {
        timestamp: 'Time',
        user: 'User',
        action: 'Action',
        entity: 'Entity',
        detail: 'Detail',
        ipAddress: 'IP Address',
        actions: 'Actions'
    },
    detail: {
        title: 'Audit Log Detail',
        timestamp: 'Time',
        user: 'User',
        action: 'Action',
        entity: 'Entity',
        ipAddress: 'IP Address',
        newValue: 'New Value (JSON)',
        oldValue: 'Old Value (JSON)',
        close: 'Close',
        details: 'Details'
    },
    pagination: 'Page {page} of {totalPages}',
    actionCreate: 'CREATE',
    actionUpdate: 'UPDATE',
    actionDelete: 'DELETE',
    actionLogin: 'LOGIN',
    actionExport: 'EXPORT',
    actionImport: 'IMPORT',
    entityInvoice: 'Invoice',
    entityProduct: 'Product',
    entityContact: 'Contact',
    entityLead: 'Lead',
    entityDeal: 'Deal',
    entityEmployee: 'Employee',
    entityUser: 'User',
    entityTenant: 'Tenant',
    entityCategory: 'Category',
    entitySupplier: 'Supplier',
    entityTicket: 'Ticket',
    entityProject: 'Project'
};

// ========================================
// 3. SETTINGS profile additional keys
// ========================================
const settingsIdAdditional = {
    profileSubtitle: 'Kelola informasi profil dan preferensi akun Anda',
    uploadPhoto: 'Upload Foto',
    removePhoto: 'Hapus Foto',
    uploading: 'Mengunggah...',
    invalidFileFormat: 'Format file tidak didukung. Gunakan JPG, PNG, atau GIF.',
    fileTooLarge: 'Ukuran file terlalu besar. Maksimal 2MB.',
    photoUploadError: 'Gagal mengunggah foto',
    photoUpdateSuccess: 'Foto profil berhasil diubah!',
    photoSaveError: 'Gagal menyimpan foto profil',
    downloadDataSuccess: 'Data berhasil diunduh!',
    downloadDataError: 'Gagal mengunduh data',
    deleteConfirmInstruction: "Ketik 'HAPUS' untuk mengkonfirmasi",
    deleteAccountError: 'Gagal menghapus akun',
    deleteAccountErrorGeneric: 'Gagal menghapus akun',
    demoDataTitle: 'Data Demo',
    demoDataDescription: 'Muat data contoh untuk menjelajahi fitur-fitur Qalcuity. Data ini akan ditambahkan ke data Anda yang sudah ada.',
    loadDemoData: 'Muat Data Demo',
    attention: 'Perhatian:',
    attentionWarning: 'Ini akan menambahkan data demo ke akun Anda. Anda dapat menghapusnya kapan saja.',
    loadingDemo: 'Memuat...',
    confirmLoadDemo: 'Ya, Muat Data Demo',
    cancel: 'Batal',
    downloading: 'Mengunduh...',
    downloadMyData: 'Unduh Data Saya',
    deleteAccountTitle: 'Hapus Akun Secara Permanen',
    deleteAccountDesc: 'Tindakan ini tidak dapat dibatalkan. Semua data Anda akan dihapus secara permanen.',
    deleteAccountWarning: 'Semua data, termasuk transaksi, pelanggan, dan laporan akan dihapus permanen.',
    deleteAccountTypeConfirm: "Ketik 'HAPUS' untuk mengkonfirmasi penghapusan akun",
    selectCurrency: 'Pilih mata uang',
    selectTimezone: 'Pilih zona waktu',
    selectLanguage: 'Pilih bahasa',
    phoneFromCompany: 'Telepon diatur di pengaturan perusahaan',
    demoStatusSuccess: 'Berhasil!',
    demoStatusLoading: 'Memuat data demo...',
    demoStatusError: 'Gagal memuat data demo',
    demoDataLoaded: 'Data demo berhasil dimuat!',
    demoDataLoadError: 'Gagal memuat data demo',
    demoDataCompanies: 'Perusahaan',
    demoDataContacts: 'Kontak',
    demoDataProducts: 'Produk',
    demoDataInvoices: 'Faktur',
    demoDataDeals: 'Deals',
    demoDataLeads: 'Leads',
    photoFormatHint: 'JPG, PNG atau GIF. Maksimal 2MB.',
    dangerZoneTitle: 'Zona Bahaya',
    dangerZoneDesc: 'Area ini berisi tindakan yang berisiko tinggi. Harap hati-hati.',
    deleteAccountButton: 'Hapus Akun',
    deleteAccountModalTitle: 'Hapus Akun',
    deleteAccountModalDesc: 'Semua data Anda akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.',
    typeDeleteToConfirm: "Ketik HAPUS untuk mengkonfirmasi:",
    cannotBeUndone: 'Tindakan ini tidak dapat dibatalkan.',
    allDataDeleted: 'Semua data akan dihapus permanen',
    downloadDataFirst: 'Unduh data Anda terlebih dahulu'
};

const settingsEnAdditional = {
    profileSubtitle: 'Manage your profile information and account preferences',
    uploadPhoto: 'Upload Photo',
    removePhoto: 'Remove Photo',
    uploading: 'Uploading...',
    invalidFileFormat: 'File format not supported. Use JPG, PNG, or GIF.',
    fileTooLarge: 'File size too large. Maximum 2MB.',
    photoUploadError: 'Failed to upload photo',
    photoUpdateSuccess: 'Profile photo updated successfully!',
    photoSaveError: 'Failed to save profile photo',
    downloadDataSuccess: 'Data downloaded successfully!',
    downloadDataError: 'Failed to download data',
    deleteConfirmInstruction: "Type 'DELETE' to confirm",
    deleteAccountError: 'Failed to delete account',
    deleteAccountErrorGeneric: 'Failed to delete account',
    demoDataTitle: 'Demo Data',
    demoDataDescription: 'Load sample data to explore Qalcuity features. This data will be added to your existing data.',
    loadDemoData: 'Load Demo Data',
    attention: 'Attention:',
    attentionWarning: 'This will add demo data to your account. You can delete it anytime.',
    loadingDemo: 'Loading...',
    confirmLoadDemo: 'Yes, Load Demo Data',
    cancel: 'Cancel',
    downloading: 'Downloading...',
    downloadMyData: 'Download My Data',
    deleteAccountTitle: 'Delete Account Permanently',
    deleteAccountDesc: 'This action cannot be undone. All your data will be permanently deleted.',
    deleteAccountWarning: 'All data, including transactions, customers, and reports will be permanently deleted.',
    deleteAccountTypeConfirm: "Type 'DELETE' to confirm account deletion",
    selectCurrency: 'Select currency',
    selectTimezone: 'Select timezone',
    selectLanguage: 'Select language',
    phoneFromCompany: 'Phone is set in company settings',
    demoStatusSuccess: 'Success!',
    demoStatusLoading: 'Loading demo data...',
    demoStatusError: 'Failed to load demo data',
    demoDataLoaded: 'Demo data loaded successfully!',
    demoDataLoadError: 'Failed to load demo data',
    demoDataCompanies: 'Companies',
    demoDataContacts: 'Contacts',
    demoDataProducts: 'Products',
    demoDataInvoices: 'Invoices',
    demoDataDeals: 'Deals',
    demoDataLeads: 'Leads',
    photoFormatHint: 'JPG, PNG or GIF. Maximum 2MB.',
    dangerZoneTitle: 'Danger Zone',
    dangerZoneDesc: 'This area contains high-risk actions. Please be careful.',
    deleteAccountButton: 'Delete Account',
    deleteAccountModalTitle: 'Delete Account',
    deleteAccountModalDesc: 'All your data will be permanently deleted. This action cannot be undone.',
    typeDeleteToConfirm: 'Type DELETE to confirm:',
    cannotBeUndone: 'This action cannot be undone.',
    allDataDeleted: 'All data will be permanently deleted',
    downloadDataFirst: 'Download your data first'
};

// ========================================
// 4. INVENTORY minor additional keys
// ========================================
const inventoryIdAdditional = {
    stock: {
        allWarehouses: 'Semua Gudang'
    },
    products: {
        skuPlaceholder: 'Contoh: WDT-001',
        uncategorized: 'Tanpa Kategori',
        uploading: 'Mengunggah...'
    },
    suppliers: {
        emailLabel: 'Email:',
        phoneLabel: 'Telp:',
        cityPlaceholder: 'Kota'
    }
};

const inventoryEnAdditional = {
    stock: {
        allWarehouses: 'All Warehouses'
    },
    products: {
        skuPlaceholder: 'Example: WDT-001',
        uncategorized: 'Uncategorized',
        uploading: 'Uploading...'
    },
    suppliers: {
        emailLabel: 'Email:',
        phoneLabel: 'Phone:',
        cityPlaceholder: 'City'
    }
};

// ========================================
// MERGE ALL
// ========================================

// Control Engine (new section)
if (!id.controlEngine) id.controlEngine = {};
if (!en.controlEngine) en.controlEngine = {};
deepMerge(id.controlEngine, controlEngineId);
deepMerge(en.controlEngine, controlEngineEn);

// Audit (additional keys)
if (!id.audit) id.audit = {};
if (!en.audit) en.audit = {};
deepMerge(id.audit, auditIdAdditional);
deepMerge(en.audit, auditEnAdditional);

// Settings (additional keys)
if (!id.settings) id.settings = {};
if (!en.settings) en.settings = {};
deepMerge(id.settings, settingsIdAdditional);
deepMerge(en.settings, settingsEnAdditional);

// Inventory (additional keys)
if (!id.inventory) id.inventory = {};
if (!en.inventory) en.inventory = {};
deepMerge(id.inventory, inventoryIdAdditional);
deepMerge(en.inventory, inventoryEnAdditional);

// Write back with consistent formatting
fs.writeFileSync(idPath, JSON.stringify(id, null, 4) + '\n', 'utf8');
fs.writeFileSync(enPath, JSON.stringify(en, null, 4) + '\n', 'utf8');

console.log('✅ i18n keys added successfully!');
console.log('  - controlEngine section (new)');
console.log('  - audit additional keys');
console.log('  - settings additional keys');
console.log('  - inventory additional keys');
