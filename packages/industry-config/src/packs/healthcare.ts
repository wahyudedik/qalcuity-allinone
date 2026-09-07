/**
 * @qalcuity/industry-config — Healthcare Industry Pack
 *
 * Industry pack untuk klinik, rumah sakit, praktik dokter,
 * dan bisnis kesehatan lainnya. Menyediakan konfigurasi lengkap untuk
 * Patient Management, Appointment Scheduling, Medical Records,
 * BPJS Integration, dan Pharmaceutical Inventory.
 */

import type { IndustryPack } from '../types';

/**
 * Healthcare Industry Pack.
 *
 * @example
 * ```typescript
 * import { healthcareIndustryPack } from '@qalcuity/industry-config';
 *
 * // Get pack info
 * console.log(healthcareIndustryPack.name); // "Healthcare"
 *
 * // Check module
 * const patientModule = healthcareIndustryPack.modules.patientManagement;
 * // { enabled: true, label: "Manajemen Pasien" }
 *
 * // Get custom fields for contact (patient)
 * const patientFields = healthcareIndustryPack.customFields.contact;
 * // [{ name: 'medicalRecordNumber', ... }, ...]
 * ```
 */
export const healthcareIndustryPack: IndustryPack = {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Industry pack untuk klinik, rumah sakit, praktik dokter, dan bisnis kesehatan lainnya',

    // Base industry type
    baseIndustry: 'healthcare',

    // Module toggles
    modules: {
        patientManagement: { enabled: true, label: 'Manajemen Pasien' },
        appointmentScheduling: { enabled: true, label: 'Penjadwalan Janji Temu' },
        medicalRecords: { enabled: true, label: 'Rekam Medis' },
        pharmacy: { enabled: true, label: 'Farmasi' },
        billing: { enabled: true, label: 'Penagihan & Klaim BPJS' },
        hr: { enabled: true, label: 'Manajemen Karyawan' },
        finance: { enabled: true, label: 'Keuangan' },
        inventory: { enabled: true, label: 'Persediaan Obat & Alat Kesehatan' },
        crm: { enabled: false, label: 'CRM' },
        projects: { enabled: false, label: 'Manajemen Proyek' },
    },

    // Custom fields
    customFields: {
        contact: [
            { name: 'medicalRecordNumber', type: 'text', label: 'Nomor Rekam Medis', required: true },
            { name: 'bloodType', type: 'select', label: 'Golongan Darah', options: ['A', 'B', 'AB', 'O', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: false },
            { name: 'allergies', type: 'text', label: 'Alergi', required: false },
            { name: 'emergencyContact', type: 'text', label: 'Kontak Darurat', required: false },
            { name: 'insuranceType', type: 'select', label: 'Jenis Asuransi', options: ['BPJS', 'Swasta', 'Umum', 'Tidak Ada'], required: false },
            { name: 'insuranceNumber', type: 'text', label: 'Nomor Asuransi', required: false },
        ],
        invoice: [
            { name: 'bpjsClaimNumber', type: 'text', label: 'Nomor Klaim BPJS', required: false },
            { name: 'diagnosisCode', type: 'text', label: 'Kode Diagnosis (ICD-10)', required: false },
            { name: 'treatmentType', type: 'select', label: 'Jenis Perawatan', options: ['Rawat Jalan', 'Rawat Inap', 'IGD', 'Laboratorium', 'Radiologi', 'Rehabilitasi'], required: false },
            { name: 'doctorName', type: 'text', label: 'Nama Dokter', required: false },
        ],
        product: [
            { name: 'drugType', type: 'select', label: 'Jenis Obat', options: ['Obat Keras', 'Obat Bebas', 'Obat Herbal', 'Alat Kesehatan', 'Suplemen'], required: false },
            { name: 'dosageForm', type: 'select', label: 'Bentuk Sediaan', options: ['Tablet', 'Kapsul', 'Sirup', 'Injeksi', 'Salep', 'Tetes', 'Inhaler'], required: false },
            { name: 'batchNumber', type: 'text', label: 'Nomor Batch', required: false },
            { name: 'bpomNumber', type: 'text', label: 'Nomor BPOM', required: false },
        ],
        inventory: [
            { name: 'storageCondition', type: 'select', label: 'Kondisi Penyimpanan', options: ['Suhu Ruang', 'Dingin (2-8°C)', 'Beku (-20°C)', 'Kering', 'Gelap'], required: false },
            { name: 'expiryDate', type: 'date', label: 'Tanggal Kedaluwarsa', required: false },
            { name: 'batchNumber', type: 'text', label: 'Nomor Batch', required: false },
        ],
    },

    // Dashboard widgets
    dashboardWidgets: [
        { id: 'today-patients', title: 'Pasien Hari Ini', module: 'patientManagement', size: 'large' },
        { id: 'appointment-status', title: 'Status Janji Temu', module: 'appointmentScheduling', size: 'medium' },
        { id: 'revenue-patient', title: 'Pendapatan per Pasien', module: 'finance', size: 'medium' },
        { id: 'low-stock-medicine', title: 'Stok Obat Menipis', module: 'pharmacy', size: 'medium' },
        { id: 'bpjs-claims', title: 'Klaim BPJS Pending', module: 'billing', size: 'medium' },
    ],

    // Workflow definitions
    workflows: {
        patientVisit: {
            states: ['REGISTERED', 'IN_TREATMENT', 'COMPLETED', 'DISCHARGED', 'CANCELLED'],
            initialState: 'REGISTERED',
            transitions: [
                { from: 'REGISTERED', to: 'IN_TREATMENT', roles: ['ADMIN', 'MEMBER'] },
                { from: 'IN_TREATMENT', to: 'COMPLETED', roles: ['ADMIN', 'MEMBER'] },
                { from: 'COMPLETED', to: 'DISCHARGED', roles: ['ADMIN'] },
                { from: 'REGISTERED', to: 'CANCELLED', roles: ['ADMIN'] },
            ],
        },
        bpjsClaim: {
            states: ['DRAFT', 'SUBMITTED', 'PROCESSING', 'APPROVED', 'REJECTED', 'PAID'],
            initialState: 'DRAFT',
            transitions: [
                { from: 'DRAFT', to: 'SUBMITTED', roles: ['MEMBER'] },
                { from: 'SUBMITTED', to: 'PROCESSING', roles: ['ADMIN'] },
                { from: 'PROCESSING', to: 'APPROVED', roles: ['ADMIN'] },
                { from: 'PROCESSING', to: 'REJECTED', roles: ['ADMIN'] },
                { from: 'APPROVED', to: 'PAID', roles: ['ADMIN'] },
            ],
        },
        prescription: {
            states: ['DRAFT', 'VERIFIED', 'DISPENSED', 'CANCELLED'],
            initialState: 'DRAFT',
            transitions: [
                { from: 'DRAFT', to: 'VERIFIED', roles: ['ADMIN'] },
                { from: 'VERIFIED', to: 'DISPENSED', roles: ['MEMBER', 'ADMIN'] },
                { from: 'DRAFT', to: 'CANCELLED', roles: ['ADMIN'] },
            ],
        },
    },
};
