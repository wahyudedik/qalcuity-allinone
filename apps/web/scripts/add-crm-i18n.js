const fs = require('fs');
const path = require('path');

const idPath = path.join(__dirname, '../messages/id.json');
const enPath = path.join(__dirname, '../messages/en.json');

// ===== ID.JSON =====
const id = JSON.parse(fs.readFileSync(idPath, 'utf8'));

// === CRM OVERVIEW ===
Object.assign(id.crm.overview, {
    minutesAgo: 'menit lalu',
    hoursAgo: 'jam lalu',
    yesterday: 'Kemarin',
    daysAgo: 'hari lalu',
    totalLabel: 'Total',
    noActiveDeals: 'Belum ada deal aktif',
    noActivitiesYet: 'Belum ada aktivitas',
    won: 'won'
});

// === CRM CONTACTS ===
Object.assign(id.crm.contacts, {
    confirmTitle: 'Konfirmasi Hapus',
    confirmMessage: 'Apakah Anda yakin ingin menghapus kontak ini?',
    validationNameRequired: 'Nama wajib diisi',
    validationEmailInvalid: 'Format email tidak valid',
    retry: 'Coba Lagi',
    totalLabel: 'Total',
    filterAll: 'Semua'
});
id.crm.contacts.form = {
    title: 'Tambah Kontak Baru',
    nameLabel: 'Nama',
    namePlaceholder: 'Nama kontak',
    emailLabel: 'Email',
    emailPlaceholder: 'email@contoh.com',
    phoneLabel: 'Telepon',
    phonePlaceholder: '08123456789',
    companyLabel: 'Perusahaan',
    companyPlaceholder: 'PT Nama Perusahaan',
    typeLabel: 'Tipe Kontak',
    typeCustomer: 'Pelanggan',
    typeSupplier: 'Pemasok',
    typePartner: 'Mitra',
    typeLead: 'Prospek',
    addressLabel: 'Alamat',
    addressPlaceholder: 'Alamat lengkap',
    cityLabel: 'Kota',
    cityPlaceholder: 'Jakarta',
    provinceLabel: 'Provinsi',
    provincePlaceholder: 'DKI Jakarta',
    postalCodeLabel: 'Kode Pos',
    postalCodePlaceholder: '12345',
    taxIdLabel: 'NPWP',
    taxIdPlaceholder: '00.000.000.0-000.000',
    notesLabel: 'Catatan',
    notesPlaceholder: 'Catatan tentang kontak ini...',
    cancel: 'Batal',
    saving: 'Menyimpan...',
    save: 'Simpan Kontak'
};
id.crm.contacts.confirmText = 'Hapus';
id.crm.contacts.cancelText = 'Batal';

// === CRM LEADS ===
Object.assign(id.crm.leads, {
    emptyDescription: 'Tambah lead pertama Anda untuk mulai melacak prospek penjualan',
    confirmTitle: 'Konfirmasi Hapus',
    confirmMessage: 'Apakah Anda yakin ingin menghapus lead ini?',
    deleteSuccess: 'Lead berhasil dihapus',
    deleteFailed: 'Gagal menghapus lead',
    deleteFailedGeneric: 'Gagal menghapus: {error}',
    createSuccess: 'Lead berhasil dibuat',
    createFailed: 'Gagal membuat lead: {error}',
    createFailedGeneric: 'Gagal membuat lead',
    fetchError: 'Gagal memuat data leads',
    fetchErrorLoad: 'Terjadi kesalahan saat memuat data',
    validationNameRequired: 'Nama wajib diisi',
    validationEmailInvalid: 'Format email tidak valid',
    validationValueNumber: 'Nilai harus berupa angka',
    retry: 'Coba Lagi',
    totalLeads: 'Total Leads',
    totalValue: 'Total Nilai',
    filterAll: 'Semua'
});
id.crm.leads.form = {
    title: 'Tambah Lead Baru',
    nameLabel: 'Nama',
    namePlaceholder: 'Nama lead',
    emailLabel: 'Email',
    emailPlaceholder: 'email@contoh.com',
    phoneLabel: 'Telepon',
    phonePlaceholder: '08123456789',
    companyLabel: 'Perusahaan',
    companyPlaceholder: 'PT Maju Bersama',
    sourceLabel: 'Sumber',
    sourcePlaceholder: 'Pilih sumber',
    statusLabel: 'Status',
    valueLabel: 'Nilai (Rp)',
    notesLabel: 'Catatan',
    notesPlaceholder: 'Catatan tentang lead ini...',
    cancel: 'Batal',
    saving: 'Menyimpan...',
    save: 'Simpan Lead'
};
id.crm.leads.confirmText = 'Hapus';
id.crm.leads.cancelText = 'Batal';

// === CRM DEALS ===
Object.assign(id.crm.deals, {
    emptyDescription: 'Buat deal pertama Anda untuk mulai melacak penjualan',
    confirmTitle: 'Konfirmasi Hapus',
    confirmMessage: 'Apakah Anda yakin ingin menghapus deal ini?',
    deleteSuccess: 'Deal berhasil dihapus',
    deleteFailed: 'Gagal menghapus deal',
    deleteFailedGeneric: 'Gagal menghapus: {error}',
    createSuccess: 'Deal berhasil dibuat',
    createFailed: 'Gagal membuat deal: {error}',
    createFailedGeneric: 'Gagal membuat deal',
    validationTitleRequired: 'Judul deal wajib diisi',
    validationValueNumber: 'Nilai harus berupa angka',
    retry: 'Coba Lagi'
});
id.crm.deals.form = {
    title: 'Tambah Deal Baru',
    titleLabel: 'Judul Deal',
    titlePlaceholder: 'Judul deal',
    valueLabel: 'Nilai Deal (Rp)',
    stageLabel: 'Stage',
    closeDateLabel: 'Tanggal Target Closing',
    contactIdLabel: 'Contact ID (opsional)',
    contactIdPlaceholder: 'ID kontak terkait',
    notesLabel: 'Catatan',
    notesPlaceholder: 'Catatan tentang deal ini...',
    cancel: 'Batal',
    saving: 'Menyimpan...',
    save: 'Simpan Deal'
};
id.crm.deals.confirmText = 'Hapus';
id.crm.deals.cancelText = 'Batal';

// === CRM PIPELINE ===
id.crm.pipeline.tableOwner = 'Owner:';

// === CRM CONTACT DETAIL ===
Object.assign(id.crm.contactDetail, {
    tabDetails: 'Detail',
    tabActivities: 'Aktivitas',
    sendEmail: 'Kirim Email',
    confirmTitle: 'Konfirmasi Hapus',
    confirmText: 'Hapus',
    cancelText: 'Batal'
});

// === CRM LEAD DETAIL ===
Object.assign(id.crm.leadDetail, {
    toastConverted: 'Lead berhasil dikonversi ke deal',
    toastConvertFailed: 'Gagal mengkonversi lead ke deal',
    statusNew: 'Baru',
    statusContacted: 'Dihubungi',
    statusQualified: 'Kualifikasi',
    statusUnqualified: 'Tidak Kualifikasi',
    tabDetails: 'Detail',
    tabActivities: 'Aktivitas',
    sendEmail: 'Kirim Email',
    confirmTitle: 'Konfirmasi Hapus',
    confirmText: 'Hapus',
    cancelText: 'Batal',
    convertConfirmTitle: 'Konversi ke Deal',
    convertConfirmMessage: 'Apakah Anda yakin ingin mengkonversi lead ini menjadi deal?'
});

// === CRM DEAL DETAIL ===
Object.assign(id.crm.dealDetail, {
    toastStageChanged: 'Stage berhasil diubah',
    toastStageFailed: 'Gagal mengubah stage',
    toastWon: 'Deal berhasil dimenangkan',
    toastWinFailed: 'Gagal menandai deal sebagai menang',
    toastLost: 'Deal ditandai sebagai kalah',
    toastLoseFailed: 'Gagal menandai deal sebagai kalah',
    changeStageTitle: 'Ubah Stage',
    loseConfirmTitle: 'Kalah Deal',
    loseConfirmMessage: 'Apakah Anda yakin ingin menandai deal ini sebagai kalah?',
    confirmLose: 'Ya, Kalah Deal',
    dealWon: 'Deal ini sudah dimenangkan',
    dealLost: 'Deal ini sudah kalah',
    tabDetails: 'Detail',
    tabActivities: 'Aktivitas',
    sendEmail: 'Kirim Email',
    confirmTitle: 'Konfirmasi Hapus',
    confirmText: 'Hapus',
    cancelText: 'Batal'
});

// === CRM DEALS EDIT (new section) ===
id.crm.dealsEdit = {
    backToDetail: 'Kembali ke Detail Deal',
    title: 'Edit Deal',
    subtitle: 'Perbarui informasi deal',
    formTitleLabel: 'Judul Deal',
    formTitlePlaceholder: 'Contoh: Penjualan Software ke PT ABC',
    formValueLabel: 'Nilai Deal (Rp)',
    formStageLabel: 'Stage',
    formProbabilityLabel: 'Probabilitas (%)',
    formCloseDateLabel: 'Tanggal Close Estimasi',
    formNotesLabel: 'Catatan',
    formNotesPlaceholder: 'Catatan tambahan tentang deal ini...',
    saving: 'Menyimpan...',
    save: 'Simpan Perubahan',
    cancel: 'Batal',
    errorNotFound: 'Deal tidak ditemukan',
    errorLoad: 'Gagal memuat data deal',
    errorUpdate: 'Gagal memperbarui deal',
    toastUpdateSuccess: 'Deal berhasil diperbarui',
    toastUpdateFailed: 'Gagal memperbarui deal',
    validationTitleRequired: 'Judul deal wajib diisi'
};

fs.writeFileSync(idPath, JSON.stringify(id, null, 4) + '\n', 'utf8');
console.log('id.json updated');

// ===== EN.JSON =====
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// === CRM OVERVIEW ===
Object.assign(en.crm.overview, {
    minutesAgo: 'minutes ago',
    hoursAgo: 'hours ago',
    yesterday: 'Yesterday',
    daysAgo: 'days ago',
    totalLabel: 'Total',
    noActiveDeals: 'No active deals yet',
    noActivitiesYet: 'No activities yet',
    won: 'won'
});

// === CRM CONTACTS ===
Object.assign(en.crm.contacts, {
    confirmTitle: 'Confirm Delete',
    confirmMessage: 'Are you sure you want to delete this contact?',
    validationNameRequired: 'Name is required',
    validationEmailInvalid: 'Invalid email format',
    retry: 'Try Again',
    totalLabel: 'Total',
    filterAll: 'All'
});
en.crm.contacts.form = {
    title: 'Add New Contact',
    nameLabel: 'Name',
    namePlaceholder: 'Contact name',
    emailLabel: 'Email',
    emailPlaceholder: 'email@example.com',
    phoneLabel: 'Phone',
    phonePlaceholder: '08123456789',
    companyLabel: 'Company',
    companyPlaceholder: 'Company Name',
    typeLabel: 'Contact Type',
    typeCustomer: 'Customer',
    typeSupplier: 'Supplier',
    typePartner: 'Partner',
    typeLead: 'Lead',
    addressLabel: 'Address',
    addressPlaceholder: 'Full address',
    cityLabel: 'City',
    cityPlaceholder: 'Jakarta',
    provinceLabel: 'Province',
    provincePlaceholder: 'DKI Jakarta',
    postalCodeLabel: 'Postal Code',
    postalCodePlaceholder: '12345',
    taxIdLabel: 'Tax ID',
    taxIdPlaceholder: '00.000.000.0-000.000',
    notesLabel: 'Notes',
    notesPlaceholder: 'Notes about this contact...',
    cancel: 'Cancel',
    saving: 'Saving...',
    save: 'Save Contact'
};
en.crm.contacts.confirmText = 'Delete';
en.crm.contacts.cancelText = 'Cancel';

// === CRM LEADS ===
Object.assign(en.crm.leads, {
    emptyDescription: 'Add your first lead to start tracking sales prospects',
    confirmTitle: 'Confirm Delete',
    confirmMessage: 'Are you sure you want to delete this lead?',
    deleteSuccess: 'Lead deleted successfully',
    deleteFailed: 'Failed to delete lead',
    deleteFailedGeneric: 'Failed to delete: {error}',
    createSuccess: 'Lead created successfully',
    createFailed: 'Failed to create lead: {error}',
    createFailedGeneric: 'Failed to create lead',
    fetchError: 'Failed to load leads',
    fetchErrorLoad: 'An error occurred while loading data',
    validationNameRequired: 'Name is required',
    validationEmailInvalid: 'Invalid email format',
    validationValueNumber: 'Value must be a number',
    retry: 'Try Again',
    totalLeads: 'Total Leads',
    totalValue: 'Total Value',
    filterAll: 'All'
});
en.crm.leads.form = {
    title: 'Add New Lead',
    nameLabel: 'Name',
    namePlaceholder: 'Lead name',
    emailLabel: 'Email',
    emailPlaceholder: 'email@example.com',
    phoneLabel: 'Phone',
    phonePlaceholder: '08123456789',
    companyLabel: 'Company',
    companyPlaceholder: 'Company Name',
    sourceLabel: 'Source',
    sourcePlaceholder: 'Select source',
    statusLabel: 'Status',
    valueLabel: 'Value (Rp)',
    notesLabel: 'Notes',
    notesPlaceholder: 'Notes about this lead...',
    cancel: 'Cancel',
    saving: 'Saving...',
    save: 'Save Lead'
};
en.crm.leads.confirmText = 'Delete';
en.crm.leads.cancelText = 'Cancel';

// === CRM DEALS ===
Object.assign(en.crm.deals, {
    emptyDescription: 'Create your first deal to start tracking sales',
    confirmTitle: 'Confirm Delete',
    confirmMessage: 'Are you sure you want to delete this deal?',
    deleteSuccess: 'Deal deleted successfully',
    deleteFailed: 'Failed to delete deal',
    deleteFailedGeneric: 'Failed to delete: {error}',
    createSuccess: 'Deal created successfully',
    createFailed: 'Failed to create deal: {error}',
    createFailedGeneric: 'Failed to create deal',
    validationTitleRequired: 'Deal title is required',
    validationValueNumber: 'Value must be a number',
    retry: 'Try Again'
});
en.crm.deals.form = {
    title: 'Add New Deal',
    titleLabel: 'Deal Title',
    titlePlaceholder: 'Deal title',
    valueLabel: 'Deal Value (Rp)',
    stageLabel: 'Stage',
    closeDateLabel: 'Target Close Date',
    contactIdLabel: 'Contact ID (optional)',
    contactIdPlaceholder: 'Related contact ID',
    notesLabel: 'Notes',
    notesPlaceholder: 'Notes about this deal...',
    cancel: 'Cancel',
    saving: 'Saving...',
    save: 'Save Deal'
};
en.crm.deals.confirmText = 'Delete';
en.crm.deals.cancelText = 'Cancel';

// === CRM PIPELINE ===
en.crm.pipeline.tableOwner = 'Owner:';

// === CRM CONTACT DETAIL ===
Object.assign(en.crm.contactDetail, {
    tabDetails: 'Details',
    tabActivities: 'Activities',
    sendEmail: 'Send Email',
    confirmTitle: 'Confirm Delete',
    confirmText: 'Delete',
    cancelText: 'Cancel'
});

// === CRM LEAD DETAIL ===
Object.assign(en.crm.leadDetail, {
    toastConverted: 'Lead successfully converted to deal',
    toastConvertFailed: 'Failed to convert lead to deal',
    statusNew: 'New',
    statusContacted: 'Contacted',
    statusQualified: 'Qualified',
    statusUnqualified: 'Unqualified',
    tabDetails: 'Details',
    tabActivities: 'Activities',
    sendEmail: 'Send Email',
    confirmTitle: 'Confirm Delete',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    convertConfirmTitle: 'Convert to Deal',
    convertConfirmMessage: 'Are you sure you want to convert this lead to a deal?'
});

// === CRM DEAL DETAIL ===
Object.assign(en.crm.dealDetail, {
    toastStageChanged: 'Stage updated successfully',
    toastStageFailed: 'Failed to update stage',
    toastWon: 'Deal won successfully',
    toastWinFailed: 'Failed to mark deal as won',
    toastLost: 'Deal marked as lost',
    toastLoseFailed: 'Failed to mark deal as lost',
    changeStageTitle: 'Change Stage',
    loseConfirmTitle: 'Lose Deal',
    loseConfirmMessage: 'Are you sure you want to mark this deal as lost?',
    confirmLose: 'Yes, Lose Deal',
    dealWon: 'This deal has already been won',
    dealLost: 'This deal has already been lost',
    tabDetails: 'Details',
    tabActivities: 'Activities',
    sendEmail: 'Send Email',
    confirmTitle: 'Confirm Delete',
    confirmText: 'Delete',
    cancelText: 'Cancel'
});

// === CRM DEALS EDIT (new section) ===
en.crm.dealsEdit = {
    backToDetail: 'Back to Deal Details',
    title: 'Edit Deal',
    subtitle: 'Update deal information',
    formTitleLabel: 'Deal Title',
    formTitlePlaceholder: 'e.g. Software Sale to PT ABC',
    formValueLabel: 'Deal Value (Rp)',
    formStageLabel: 'Stage',
    formProbabilityLabel: 'Probability (%)',
    formCloseDateLabel: 'Estimated Close Date',
    formNotesLabel: 'Notes',
    formNotesPlaceholder: 'Additional notes about this deal...',
    saving: 'Saving...',
    save: 'Save Changes',
    cancel: 'Cancel',
    errorNotFound: 'Deal not found',
    errorLoad: 'Failed to load deal data',
    errorUpdate: 'Failed to update deal',
    toastUpdateSuccess: 'Deal updated successfully',
    toastUpdateFailed: 'Failed to update deal',
    validationTitleRequired: 'Deal title is required'
};

fs.writeFileSync(enPath, JSON.stringify(en, null, 4) + '\n', 'utf8');
console.log('en.json updated');

// Validate both
JSON.parse(fs.readFileSync(idPath, 'utf8'));
JSON.parse(fs.readFileSync(enPath, 'utf8'));
console.log('Both files validated successfully!');
console.log('id.json CRM keys:', Object.keys(id.crm));
console.log('en.json CRM keys:', Object.keys(en.crm));
console.log('id.json dealsEdit:', Object.keys(id.crm.dealsEdit));
console.log('en.json dealsEdit:', Object.keys(en.crm.dealsEdit));
