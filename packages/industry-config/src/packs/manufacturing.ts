/**
 * @qalcuity/industry-config — Manufacturing Industry Pack
 *
 * Industry pack untuk pabrik, produksi, assembly line,
 * dan bisnis manufaktur lainnya. Menyediakan konfigurasi lengkap untuk
 * Production Planning, Bill of Materials (BOM), Quality Control,
 * dan Maintenance Management.
 */

import type { IndustryPack } from '../types';

/**
 * Manufacturing Industry Pack.
 *
 * @example
 * ```typescript
 * import { manufacturingIndustryPack } from '@qalcuity/industry-config';
 *
 * // Get pack info
 * console.log(manufacturingIndustryPack.name); // "Manufacturing"
 *
 * // Check module
 * const productionModule = manufacturingIndustryPack.modules.production;
 * // { enabled: true, label: "Perencanaan Produksi" }
 *
 * // Get custom fields for product
 * const productFields = manufacturingIndustryPack.customFields.product;
 * // [{ name: 'partNumber', ... }, { name: 'materialType', ... }, ...]
 * ```
 */
export const manufacturingIndustryPack: IndustryPack = {
    id: 'manufacturing',
    name: 'Manufacturing',
    description: 'Industry pack untuk pabrik, produksi, assembly line, dan bisnis manufaktur lainnya',

    // Base industry type
    baseIndustry: 'manufacturing',

    // Module toggles
    modules: {
        production: { enabled: true, label: 'Perencanaan Produksi' },
        bom: { enabled: true, label: 'Bill of Materials (BOM)' },
        qualityControl: { enabled: true, label: 'Kontrol Kualitas' },
        maintenance: { enabled: true, label: 'Manajemen Pemeliharaan' },
        inventory: { enabled: true, label: 'Manajemen Persediaan' },
        hr: { enabled: true, label: 'Manajemen Karyawan' },
        finance: { enabled: true, label: 'Keuangan' },
        pos: { enabled: false, label: 'Point of Sale' },
        crm: { enabled: false, label: 'CRM' },
        projects: { enabled: false, label: 'Manajemen Proyek' },
    },

    // Custom fields
    customFields: {
        product: [
            { name: 'partNumber', type: 'text', label: 'Nomor Part', required: true },
            { name: 'materialType', type: 'select', label: 'Jenis Material', options: ['Metal', 'Plastic', 'Wood', 'Glass', 'Composite', 'Other'], required: false },
            { name: 'leadTime', type: 'number', label: 'Lead Time (hari)', required: false },
            { name: 'minimumOrderQty', type: 'number', label: 'Jumlah Pesanan Minimum', required: false },
        ],
        inventory: [
            { name: 'lotNumber', type: 'text', label: 'Nomor Lot', required: false },
            { name: 'expiryDate', type: 'date', label: 'Tanggal Kedaluwarsa', required: false },
            { name: 'serialNumber', type: 'text', label: 'Nomor Seri', required: false },
            { name: 'qcStatus', type: 'select', label: 'Status QC', options: ['Pending', 'Passed', 'Failed', 'On Hold'], required: false },
        ],
        task: [
            { name: 'machineId', type: 'text', label: 'ID Mesin', required: false },
            { name: 'productionLine', type: 'text', label: 'Lini Produksi', required: false },
            { name: 'shift', type: 'select', label: 'Shift', options: ['Morning', 'Afternoon', 'Night'], required: false },
            { name: 'qualityScore', type: 'number', label: 'Skor Kualitas', required: false },
        ],
    },

    // Dashboard widgets
    dashboardWidgets: [
        { id: 'production-output', title: 'Output Produksi', module: 'production', size: 'large' },
        { id: 'defect-rate', title: 'Tingkat Defect', module: 'qualityControl', size: 'medium' },
        { id: 'machine-utilization', title: 'Utilisasi Mesin', module: 'maintenance', size: 'medium' },
        { id: 'oee', title: 'OEE (Overall Equipment Effectiveness)', module: 'production', size: 'large' },
        { id: 'low-stock', title: 'Stok Bahan Baku Menipis', module: 'inventory', size: 'medium' },
    ],

    // Workflow definitions
    workflows: {
        productionOrder: {
            states: ['PLANNED', 'IN_PROGRESS', 'QC', 'COMPLETED', 'CANCELLED'],
            initialState: 'PLANNED',
            transitions: [
                { from: 'PLANNED', to: 'IN_PROGRESS', roles: ['ADMIN', 'MEMBER'] },
                { from: 'IN_PROGRESS', to: 'QC', roles: ['MEMBER', 'ADMIN'] },
                { from: 'QC', to: 'COMPLETED', roles: ['ADMIN'] },
                { from: 'PLANNED', to: 'CANCELLED', roles: ['ADMIN'] },
                { from: 'IN_PROGRESS', to: 'CANCELLED', roles: ['ADMIN'] },
            ],
        },
        bomApproval: {
            states: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
            initialState: 'DRAFT',
            transitions: [
                { from: 'DRAFT', to: 'PENDING_APPROVAL', roles: ['MEMBER'] },
                { from: 'PENDING_APPROVAL', to: 'APPROVED', roles: ['ADMIN'] },
                { from: 'PENDING_APPROVAL', to: 'REJECTED', roles: ['ADMIN'] },
            ],
        },
        maintenanceRequest: {
            states: ['SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'DEFERRED'],
            initialState: 'SUBMITTED',
            transitions: [
                { from: 'SUBMITTED', to: 'IN_PROGRESS', roles: ['ADMIN', 'MEMBER'] },
                { from: 'IN_PROGRESS', to: 'COMPLETED', roles: ['MEMBER', 'ADMIN'] },
                { from: 'SUBMITTED', to: 'DEFERRED', roles: ['ADMIN'] },
                { from: 'IN_PROGRESS', to: 'DEFERRED', roles: ['ADMIN'] },
            ],
        },
    },
};
