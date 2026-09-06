/**
 * @qalcuity/industry-config — Retail Industry Pack
 *
 * Industry pack untuk toko retail, fashion, elektronik, grocery,
 * dan bisnis retail lainnya. Menyediakan konfigurasi lengkap untuk
 * Point of Sale, Inventory Management, Customer Loyalty, dan
 * E-commerce Integration.
 */

import type { IndustryPack } from '../types';

/**
 * Retail Industry Pack.
 *
 * @example
 * ```typescript
 * import { retailIndustryPack } from '@qalcuity/industry-config';
 *
 * // Get pack info
 * console.log(retailIndustryPack.name); // "Retail"
 *
 * // Check module
 * const posModule = retailIndustryPack.modules.pos;
 * // { enabled: true, label: "Point of Sale" }
 *
 * // Get custom fields for product
 * const productFields = retailIndustryPack.customFields.product;
 * // [{ name: 'sku', ... }, { name: 'barcode', ... }, ...]
 * ```
 */
export const retailIndustryPack: IndustryPack = {
    id: 'retail',
    name: 'Retail',
    description: 'Industry pack untuk toko retail, fashion, elektronik, grocery, dan bisnis retail lainnya',

    // Base industry type
    baseIndustry: 'retail',

    // Module toggles
    modules: {
        pos: { enabled: true, label: 'Point of Sale' },
        inventory: { enabled: true, label: 'Manajemen Persediaan' },
        loyalty: { enabled: true, label: 'Program Loyalitas' },
        ecommerce: { enabled: true, label: 'Integrasi E-commerce' },
        hr: { enabled: true, label: 'Manajemen Karyawan' },
        finance: { enabled: true, label: 'Keuangan' },
        crm: { enabled: true, label: 'CRM' },
        projects: { enabled: false, label: 'Manajemen Proyek' },
        kitchen: { enabled: false, label: 'Kitchen Display System' },
        tables: { enabled: false, label: 'Manajemen Meja' },
    },

    // Custom fields
    customFields: {
        product: [
            { name: 'sku', type: 'text', label: 'SKU', required: true },
            { name: 'barcode', type: 'text', label: 'Barcode / EAN', required: false },
            { name: 'size', type: 'select', label: 'Ukuran', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'All Size'], required: false },
            { name: 'color', type: 'text', label: 'Warna', required: false },
            { name: 'brand', type: 'text', label: 'Merek', required: false },
            { name: 'season', type: 'select', label: 'Musim', options: ['Spring', 'Summer', 'Fall', 'Winter', 'All Season'], required: false },
        ],
        transaction: [
            { name: 'loyaltyCardNumber', type: 'text', label: 'Nomor Kartu Loyalitas', required: false },
            { name: 'discountCode', type: 'text', label: 'Kode Diskon', required: false },
            { name: 'storeLocation', type: 'text', label: 'Lokasi Toko', required: false },
        ],
        customer: [
            { name: 'membershipTier', type: 'select', label: 'Tier Keanggotaan', options: ['Bronze', 'Silver', 'Gold', 'Platinum'], required: false },
            { name: 'pointsBalance', type: 'number', label: 'Saldo Poin', required: false },
            { name: 'preferredCategory', type: 'text', label: 'Kategori Favorit', required: false },
        ],
    },

    // Dashboard widgets
    dashboardWidgets: [
        { id: 'sales-by-category', title: 'Penjualan per Kategori', module: 'pos', size: 'large' },
        { id: 'inventory-turnover', title: 'Perputaran Persediaan', module: 'inventory', size: 'medium' },
        { id: 'top-brands', title: 'Merek Terlaris', module: 'pos', size: 'medium' },
        { id: 'customer-retention', title: 'Tingkat Retensi Pelanggan', module: 'crm', size: 'medium' },
        { id: 'low-stock', title: 'Stok Menipis', module: 'inventory', size: 'medium' },
    ],

    // Workflow definitions
    workflows: {
        purchaseOrder: {
            states: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ORDERED', 'RECEIVED', 'CANCELLED'],
            initialState: 'DRAFT',
            transitions: [
                { from: 'DRAFT', to: 'PENDING_APPROVAL', roles: ['MEMBER', 'ADMIN'] },
                { from: 'PENDING_APPROVAL', to: 'APPROVED', roles: ['ADMIN'] },
                { from: 'APPROVED', to: 'ORDERED', roles: ['ADMIN'] },
                { from: 'ORDERED', to: 'RECEIVED', roles: ['MEMBER', 'ADMIN'] },
                { from: 'DRAFT', to: 'CANCELLED', roles: ['ADMIN'] },
                { from: 'PENDING_APPROVAL', to: 'CANCELLED', roles: ['ADMIN'] },
            ],
        },
        returnExchange: {
            states: ['REQUESTED', 'APPROVED', 'PROCESSED', 'DENIED'],
            initialState: 'REQUESTED',
            transitions: [
                { from: 'REQUESTED', to: 'APPROVED', roles: ['ADMIN', 'MEMBER'] },
                { from: 'APPROVED', to: 'PROCESSED', roles: ['MEMBER', 'ADMIN'] },
                { from: 'REQUESTED', to: 'DENIED', roles: ['ADMIN'] },
            ],
        },
        stockAdjustment: {
            states: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'COMPLETED', 'REJECTED'],
            initialState: 'DRAFT',
            transitions: [
                { from: 'DRAFT', to: 'PENDING_APPROVAL', roles: ['MEMBER'] },
                { from: 'PENDING_APPROVAL', to: 'APPROVED', roles: ['ADMIN'] },
                { from: 'APPROVED', to: 'COMPLETED', roles: ['ADMIN'] },
                { from: 'PENDING_APPROVAL', to: 'REJECTED', roles: ['ADMIN'] },
            ],
        },
    },

    // POS settings
    posSettings: {
        defaultOrderType: 'In-Store',
        enableTableManagement: false,
        enableKitchenDisplay: false,
        enableReservations: false,
        enableLoyalty: true,
        receiptTemplate: 'retail-standard',
    },
};
