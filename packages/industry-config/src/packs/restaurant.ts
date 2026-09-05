/**
 * @qalcuity/industry-config — Restaurant Industry Pack
 *
 * Industry pack untuk restoran, cafe, food court, dan bisnis F&B lainnya.
 * Menyediakan konfigurasi lengkap untuk POS, Kitchen Display, Table Management,
 * Reservasi, Program Loyalitas, dan workflow pesanan.
 */

import type { IndustryPack } from '../types';

/**
 * Restaurant / F&B Industry Pack.
 *
 * @example
 * ```typescript
 * import { restaurantIndustryPack } from '@qalcuity/industry-config';
 *
 * // Get pack info
 * console.log(restaurantIndustryPack.name); // "Food & Beverage / Restoran"
 *
 * // Check module
 * const posModule = restaurantIndustryPack.modules.pos;
 * // { enabled: true, label: "Point of Sale" }
 *
 * // Get custom fields for product
 * const productFields = restaurantIndustryPack.customFields.product;
 * // [{ name: 'preparationTime', ... }, ...]
 * ```
 */
export const restaurantIndustryPack: IndustryPack = {
    id: 'restaurant',
    name: 'Food & Beverage / Restoran',
    description: 'Industry pack untuk restoran, cafe, food court, dan bisnis F&B lainnya',

    // Base industry type
    baseIndustry: 'food_beverage',

    // Module toggles
    modules: {
        pos: { enabled: true, label: 'Point of Sale' },
        kitchen: { enabled: true, label: 'Kitchen Display System' },
        tables: { enabled: true, label: 'Table Management' },
        reservations: { enabled: true, label: 'Reservasi' },
        loyalty: { enabled: true, label: 'Program Loyalitas' },
        inventory: { enabled: true, label: 'Persediaan Bahan Baku' },
        hr: { enabled: true, label: 'Manajemen Karyawan' },
        finance: { enabled: true, label: 'Keuangan' },
        projects: { enabled: false, label: 'Manajemen Proyek' },
        crm: { enabled: false, label: 'CRM' },
    },

    // Custom fields
    customFields: {
        product: [
            { name: 'preparationTime', type: 'number', label: 'Waktu Persiapan (menit)', required: false },
            { name: 'isPreparedItem', type: 'boolean', label: 'Item Dapur', required: false },
            { name: 'recipe', type: 'text', label: 'Resep', required: false },
            { name: 'allergens', type: 'text', label: 'Allergen', required: false },
        ],
        transaction: [
            { name: 'tableNumber', type: 'number', label: 'Nomor Meja', required: false },
            { name: 'orderType', type: 'select', label: 'Tipe Pesanan', options: ['Dine-in', 'Takeaway', 'Delivery'], required: false },
            { name: 'guestCount', type: 'number', label: 'Jumlah Tamu', required: false },
        ],
    },

    // Dashboard widgets
    dashboardWidgets: [
        { id: 'today-revenue', title: 'Pendapatan Hari Ini', module: 'pos', size: 'large' },
        { id: 'active-orders', title: 'Pesanan Aktif', module: 'kitchen', size: 'medium' },
        { id: 'table-status', title: 'Status Meja', module: 'tables', size: 'medium' },
        { id: 'top-items', title: 'Menu Terlaris', module: 'pos', size: 'medium' },
        { id: 'low-stock', title: 'Stok Menipis', module: 'inventory', size: 'medium' },
    ],

    // Workflow definitions
    workflows: {
        order: {
            states: ['PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'],
            initialState: 'PENDING',
            transitions: [
                { from: 'PENDING', to: 'PREPARING', roles: ['ADMIN', 'MEMBER'] },
                { from: 'PREPARING', to: 'READY', roles: ['ADMIN', 'MEMBER'] },
                { from: 'READY', to: 'SERVED', roles: ['ADMIN', 'MEMBER'] },
                { from: 'PENDING', to: 'CANCELLED', roles: ['ADMIN'] },
                { from: 'PREPARING', to: 'CANCELLED', roles: ['ADMIN'] },
            ],
        },
    },

    // POS settings
    posSettings: {
        defaultOrderType: 'Dine-in',
        enableTableManagement: true,
        enableKitchenDisplay: true,
        enableReservations: true,
        enableLoyalty: true,
        receiptTemplate: 'restaurant-standard',
    },
};
