/**
 * @qalcuity/industry-config — Agriculture Industry Pack
 *
 * Industry pack untuk pertanian, perkebunan, peternakan,
 * perikanan, dan bisnis agrikultur lainnya. Menyediakan konfigurasi
 * lengkap untuk Crop Management, Land Tracking, Harvest Planning,
 * Supply Chain, dan Environmental Monitoring.
 */

import type { IndustryPack } from '../types';

/**
 * Agriculture Industry Pack.
 *
 * @example
 * ```typescript
 * import { agricultureIndustryPack } from '@qalcuity/industry-config';
 *
 * // Get pack info
 * console.log(agricultureIndustryPack.name); // "Agriculture"
 *
 * // Check module
 * const cropModule = agricultureIndustryPack.modules.cropManagement;
 * // { enabled: true, label: "Manajemen Tanaman" }
 *
 * // Get custom fields for product
 * const productFields = agricultureIndustryPack.customFields.product;
 * // [{ name: 'cropType', ... }, ...]
 * ```
 */
export const agricultureIndustryPack: IndustryPack = {
    id: 'agriculture',
    name: 'Agriculture',
    description: 'Industry pack untuk pertanian, perkebunan, peternakan, perikanan, dan bisnis agrikultur lainnya',

    // Base industry type
    baseIndustry: 'agriculture',

    // Module toggles
    modules: {
        cropManagement: { enabled: true, label: 'Manajemen Tanaman' },
        landTracking: { enabled: true, label: 'Pelacakan Lahan' },
        harvestPlanning: { enabled: true, label: 'Perencanaan Panen' },
        supplyChain: { enabled: true, label: 'Rantai Pasok' },
        equipment: { enabled: true, label: 'Manajemen Alat & Mesin' },
        hr: { enabled: true, label: 'Manajemen Pekerja' },
        finance: { enabled: true, label: 'Keuangan' },
        inventory: { enabled: true, label: 'Persediaan' },
        crm: { enabled: false, label: 'CRM' },
        pos: { enabled: false, label: 'Point of Sale' },
    },

    // Custom fields
    customFields: {
        product: [
            { name: 'cropType', type: 'select', label: 'Jenis Tanaman', options: ['Padi', 'Jagung', 'Kedelai', 'Karet', 'Kelapa Sawit', 'Tebu', 'Kopi', 'Teh', 'Kakao', 'Sayuran', 'Buah-buahan', 'Lainnya'], required: true },
            { name: 'harvestSeason', type: 'select', label: 'Musim Panen', options: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'], required: false },
            { name: 'organicCertified', type: 'boolean', label: 'Sertifikasi Organik', required: false },
            { name: 'grade', type: 'select', label: 'Grade', options: ['Premium', 'Grade A', 'Grade B', 'Grade C', 'Reject'], required: false },
        ],
        project: [
            { name: 'landArea', type: 'number', label: 'Luas Lahan (hektar)', required: true },
            { name: 'landType', type: 'select', label: 'Jenis Lahan', options: ['Sawah', 'Kebun', 'Padang Rumput', 'Hutan Tanaman', 'Tambak', 'Kolam'], required: true },
            { name: 'irrigationType', type: 'select', label: 'Jenis Irigasi', options: ['Alami', 'Terasering', 'Sprinkler', 'Drip', 'Pompa'], required: false },
            { name: 'soilType', type: 'text', label: 'Jenis Tanah', required: false },
            { name: 'plantingDate', type: 'date', label: 'Tanggal Tanam', required: false },
            { name: 'expectedHarvestDate', type: 'date', label: 'Estimasi Tanggal Panen', required: false },
        ],
        inventory: [
            { name: 'storageType', type: 'select', label: 'Jenis Penyimpanan', options: ['Gudang Terbuka', 'Cold Storage', 'Siloo', 'Warehouse', 'Outdoor'], required: false },
            { name: 'quantityUnit', type: 'select', label: 'Satuan', options: ['kg', 'ton', 'kwintal', 'liter', 'pcs', 'ikat', 'karung'], required: false },
        ],
        contact: [
            { name: 'supplierType', type: 'select', label: 'Jenis Supplier', options: ['Petani', 'Distributor', 'Pengumpul', 'Eksportir', 'Industri Pengolahan'], required: false },
            { name: 'region', type: 'text', label: 'Wilayah', required: false },
        ],
    },

    // Dashboard widgets
    dashboardWidgets: [
        { id: 'active-crops', title: 'Tanaman Aktif', module: 'cropManagement', size: 'large' },
        { id: 'harvest-forecast', title: 'Proyeksi Panen', module: 'harvestPlanning', size: 'medium' },
        { id: 'land-utilization', title: 'Utilisasi Lahan', module: 'landTracking', size: 'medium' },
        { id: 'weather-alert', title: 'Peringatan Cuaca', module: 'cropManagement', size: 'medium' },
        { id: 'supply-demand', title: 'Pasokan vs Permintaan', module: 'supplyChain', size: 'medium' },
    ],

    // Workflow definitions
    workflows: {
        cropCycle: {
            states: ['LAND_PREPARATION', 'PLANTING', 'GROWING', 'HARVESTING', 'COMPLETED', 'FAILED'],
            initialState: 'LAND_PREPARATION',
            transitions: [
                { from: 'LAND_PREPARATION', to: 'PLANTING', roles: ['ADMIN', 'MEMBER'] },
                { from: 'PLANTING', to: 'GROWING', roles: ['ADMIN', 'MEMBER'] },
                { from: 'GROWING', to: 'HARVESTING', roles: ['ADMIN', 'MEMBER'] },
                { from: 'HARVESTING', to: 'COMPLETED', roles: ['ADMIN', 'MEMBER'] },
                { from: 'GROWING', to: 'FAILED', roles: ['ADMIN'] },
                { from: 'HARVESTING', to: 'FAILED', roles: ['ADMIN'] },
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
        qualityInspection: {
            states: ['PENDING', 'INSPECTING', 'PASSED', 'FAILED', 'QUARANTINED'],
            initialState: 'PENDING',
            transitions: [
                { from: 'PENDING', to: 'INSPECTING', roles: ['MEMBER', 'ADMIN'] },
                { from: 'INSPECTING', to: 'PASSED', roles: ['ADMIN'] },
                { from: 'INSPECTING', to: 'FAILED', roles: ['ADMIN'] },
                { from: 'INSPECTING', to: 'QUARANTINED', roles: ['ADMIN'] },
            ],
        },
    },
};
