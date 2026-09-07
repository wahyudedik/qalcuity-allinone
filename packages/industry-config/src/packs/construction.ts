/**
 * @qalcuity/industry-config — Construction Industry Pack
 *
 * Industry pack untuk kontraktor, perusahaan konstruksi,
 * developer properti, dan bisnis construction lainnya. Menyediakan konfigurasi
 * lengkap untuk Project Management, Material Tracking, Equipment Management,
 * Safety Compliance, dan Progress Reporting.
 */

import type { IndustryPack } from '../types';

/**
 * Construction Industry Pack.
 *
 * @example
 * ```typescript
 * import { constructionIndustryPack } from '@qalcuity/industry-config';
 *
 * // Get pack info
 * console.log(constructionIndustryPack.name); // "Construction"
 *
 * // Check module
 * const projectModule = constructionIndustryPack.modules.projects;
 * // { enabled: true, label: "Manajemen Proyek" }
 *
 * // Get custom fields for project
 * const projectFields = constructionIndustryPack.customFields.project;
 * // [{ name: 'siteLocation', ... }, ...]
 * ```
 */
export const constructionIndustryPack: IndustryPack = {
    id: 'construction',
    name: 'Construction',
    description: 'Industry pack untuk kontraktor, perusahaan konstruksi, developer properti, dan bisnis construction lainnya',

    // Base industry type
    baseIndustry: 'construction',

    // Module toggles
    modules: {
        projects: { enabled: true, label: 'Manajemen Proyek' },
        inventory: { enabled: true, label: 'Material & Persediaan' },
        equipment: { enabled: true, label: 'Manajemen Peralatan' },
        safety: { enabled: true, label: 'Keselamatan Kerja' },
        hr: { enabled: true, label: 'Manajemen Karyawan' },
        finance: { enabled: true, label: 'Keuangan' },
        crm: { enabled: true, label: 'CRM' },
        pos: { enabled: false, label: 'Point of Sale' },
        kitchen: { enabled: false, label: 'Kitchen Display System' },
    },

    // Custom fields
    customFields: {
        project: [
            { name: 'siteLocation', type: 'text', label: 'Lokasi Proyek', required: true },
            { name: 'projectType', type: 'select', label: 'Jenis Proyek', options: ['Residensial', 'Komersial', 'Industri', 'Infrastruktur', 'Renovasi', 'Interior'], required: true },
            { name: 'clientName', type: 'text', label: 'Nama Klien', required: true },
            { name: 'permitNumber', type: 'text', label: 'Nomor Izin Mendirikan Bangunan (IMB)', required: false },
            { name: 'estimatedDuration', type: 'number', label: 'Durasi Estimasi (hari)', required: false },
            { name: 'contractValue', type: 'number', label: 'Nilai Kontrak', required: false },
        ],
        task: [
            { name: 'phase', type: 'select', label: 'Fase Konstruksi', options: ['Persiapan', 'Struktur', 'Arsitektural', 'MEP', 'Finishing', 'Handover'], required: false },
            { name: 'workArea', type: 'text', label: 'Area Kerja', required: false },
            { name: 'safetyRequired', type: 'boolean', label: 'Memerlukan Safety Briefing', required: false },
            { name: 'weatherDependency', type: 'boolean', label: 'Terpengaruh Cuaca', required: false },
        ],
        product: [
            { name: 'materialType', type: 'select', label: 'Jenis Material', options: ['Semen', 'Besi', 'Beton', 'Kayu', 'Pasir', 'Kerikil', 'Bata', 'Pipa', 'Kabel', 'Lainnya'], required: true },
            { name: 'unitOfMeasure', type: 'select', label: 'Satuan', options: ['kg', 'ton', 'm³', 'm²', 'm', 'pcs', 'roll', 'sak', 'batang'], required: true },
            { name: 'grade', type: 'text', label: 'Grade / Mutu', required: false },
            { name: 'supplierName', type: 'text', label: 'Nama Supplier', required: false },
        ],
        inventory: [
            { name: 'siteLocation', type: 'text', label: 'Lokasi Gudang', required: false },
            { name: 'projectAllocation', type: 'text', label: 'Alokasi Proyek', required: false },
        ],
        contact: [
            { name: 'clientType', type: 'select', label: 'Jenis Klien', options: ['Pemilik Rumah', 'Developer', 'Pemerintah', 'BUMN', 'Swasta'], required: false },
            { name: 'contractorLicense', type: 'text', label: 'Nomor Izin Kontraktor', required: false },
        ],
    },

    // Dashboard widgets
    dashboardWidgets: [
        { id: 'active-projects', title: 'Proyek Aktif', module: 'projects', size: 'large' },
        { id: 'project-progress', title: 'Progres Proyek', module: 'projects', size: 'large' },
        { id: 'material-usage', title: 'Penggunaan Material', module: 'inventory', size: 'medium' },
        { id: 'equipment-utilization', title: 'Utilisasi Peralatan', module: 'equipment', size: 'medium' },
        { id: 'safety-incidents', title: 'Insiden Keselamatan', module: 'safety', size: 'medium' },
    ],

    // Workflow definitions
    workflows: {
        project: {
            states: ['PLANNING', 'TENDERING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'],
            initialState: 'PLANNING',
            transitions: [
                { from: 'PLANNING', to: 'TENDERING', roles: ['ADMIN'] },
                { from: 'TENDERING', to: 'IN_PROGRESS', roles: ['ADMIN'] },
                { from: 'IN_PROGRESS', to: 'ON_HOLD', roles: ['ADMIN'] },
                { from: 'ON_HOLD', to: 'IN_PROGRESS', roles: ['ADMIN'] },
                { from: 'IN_PROGRESS', to: 'COMPLETED', roles: ['ADMIN'] },
                { from: 'PLANNING', to: 'CANCELLED', roles: ['ADMIN'] },
                { from: 'TENDERING', to: 'CANCELLED', roles: ['ADMIN'] },
            ],
        },
        purchaseOrder: {
            states: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ORDERED', 'DELIVERED', 'CANCELLED'],
            initialState: 'DRAFT',
            transitions: [
                { from: 'DRAFT', to: 'PENDING_APPROVAL', roles: ['MEMBER'] },
                { from: 'PENDING_APPROVAL', to: 'APPROVED', roles: ['ADMIN'] },
                { from: 'APPROVED', to: 'ORDERED', roles: ['ADMIN'] },
                { from: 'ORDERED', to: 'DELIVERED', roles: ['MEMBER', 'ADMIN'] },
                { from: 'DRAFT', to: 'CANCELLED', roles: ['ADMIN'] },
            ],
        },
        safetyIncident: {
            states: ['REPORTED', 'INVESTIGATING', 'RESOLVED', 'CLOSED'],
            initialState: 'REPORTED',
            transitions: [
                { from: 'REPORTED', to: 'INVESTIGATING', roles: ['ADMIN', 'MEMBER'] },
                { from: 'INVESTIGATING', to: 'RESOLVED', roles: ['ADMIN'] },
                { from: 'RESOLVED', to: 'CLOSED', roles: ['ADMIN'] },
            ],
        },
    },
};
