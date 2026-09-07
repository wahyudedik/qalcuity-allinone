/**
 * @qalcuity/industry-config — Hospitality Industry Pack
 *
 * Industry pack untuk hotel, villa, resort, event organizer,
 * dan bisnis hospitality lainnya. Menyediakan konfigurasi lengkap untuk
 * Room Management, Booking System, Guest Services, Event Management,
 * dan Revenue Management.
 */

import type { IndustryPack } from '../types';

/**
 * Hospitality Industry Pack.
 *
 * @example
 * ```typescript
 * import { hospitalityIndustryPack } from '@qalcuity/industry-config';
 *
 * // Get pack info
 * console.log(hospitalityIndustryPack.name); // "Hospitality"
 *
 * // Check module
 * const roomModule = hospitalityIndustryPack.modules.roomManagement;
 * // { enabled: true, label: "Manajemen Kamar" }
 *
 * // Get custom fields for project (booking)
 * const bookingFields = hospitalityIndustryPack.customFields.project;
 * // [{ name: 'checkInDate', ... }, ...]
 * ```
 */
export const hospitalityIndustryPack: IndustryPack = {
    id: 'hospitality',
    name: 'Hospitality',
    description: 'Industry pack untuk hotel, villa, resort, event organizer, dan bisnis hospitality lainnya',

    // Base industry type
    baseIndustry: 'hospitality',

    // Module toggles
    modules: {
        roomManagement: { enabled: true, label: 'Manajemen Kamar' },
        bookingSystem: { enabled: true, label: 'Sistem Reservasi' },
        guestServices: { enabled: true, label: 'Layanan Tamu' },
        eventManagement: { enabled: true, label: 'Manajemen Event' },
        pos: { enabled: true, label: 'Point of Sale (F&B / SPA)' },
        inventory: { enabled: true, label: 'Persediaan' },
        hr: { enabled: true, label: 'Manajemen Karyawan' },
        finance: { enabled: true, label: 'Keuangan' },
        crm: { enabled: true, label: 'CRM' },
        projects: { enabled: false, label: 'Manajemen Proyek' },
    },

    // Custom fields
    customFields: {
        project: [
            { name: 'checkInDate', type: 'date', label: 'Tanggal Check-in', required: true },
            { name: 'checkOutDate', type: 'date', label: 'Tanggal Check-out', required: true },
            { name: 'roomType', type: 'select', label: 'Jenis Kamar', options: ['Standard', 'Superior', 'Deluxe', 'Suite', 'Executive', 'Presidential', 'Villa', 'Family', 'Connecting'], required: true },
            { name: 'numberOfGuests', type: 'number', label: 'Jumlah Tamu', required: true },
            { name: 'bookingSource', type: 'select', label: 'Sumber Reservasi', options: ['Website', 'OTA (Traveloka/Agoda)', 'Phone', 'Walk-in', 'Corporate', 'Travel Agent', 'Agent'], required: false },
            { name: 'specialRequests', type: 'text', label: 'Permintaan Khusus', required: false },
            { name: 'mealPlan', type: 'select', label: 'Paket Makan', options: ['Room Only', 'BB (Bed & Breakfast)', 'Half Board', 'Full Board', 'All Inclusive'], required: false },
        ],
        invoice: [
            { name: 'stayType', type: 'select', label: 'Jenis Menginap', options: ['Nightly', 'Weekly', 'Monthly', 'Hourly', 'Event'], required: true },
            { name: 'serviceType', type: 'select', label: 'Jenis Layanan', options: ['Room', 'F&B', 'SPA', 'Laundry', 'Minibar', 'Transport', 'Event', 'Misc'], required: false },
            { name: 'addOns', type: 'text', label: 'Add-ons', required: false },
        ],
        contact: [
            { name: 'guestType', type: 'select', label: 'Jenis Tamu', options: ['Individual', 'Corporate', 'Group', 'VIP', 'Loyalty Member', 'Travel Agent'], required: false },
            { name: 'nationality', type: 'text', label: 'Kebangsaan', required: false },
            { name: 'loyaltyTier', type: 'select', label: 'Tier Loyalitas', options: ['Member', 'Silver', 'Gold', 'Platinum', 'Diamond'], required: false },
            { name: 'loyaltyPoints', type: 'number', label: 'Poin Loyalitas', required: false },
            { name: 'idDocument', type: 'text', label: 'Nomor Identitas/KTP/Passport', required: false },
        ],
        inventory: [
            { name: 'location', type: 'select', label: 'Lokasi', options: ['Front Office', 'Housekeeping', 'Kitchen', 'Laundry', 'Storage', 'Minibar'], required: false },
            { name: 'parLevel', type: 'number', label: 'Par Level', required: false },
        ],
    },

    // Dashboard widgets
    dashboardWidgets: [
        { id: 'occupancy-rate', title: 'Tingkat Okupansi', module: 'roomManagement', size: 'large' },
        { id: 'today-checkin', title: 'Check-in Hari Ini', module: 'bookingSystem', size: 'medium' },
        { id: 'today-checkout', title: 'Check-out Hari Ini', module: 'bookingSystem', size: 'medium' },
        { id: 'revenue-per-room', title: 'Revenue per Kamar', module: 'finance', size: 'medium' },
        { id: 'guest-satisfaction', title: 'Kepuasan Tamu', module: 'guestServices', size: 'medium' },
        { id: 'upcoming-events', title: 'Event Mendatang', module: 'eventManagement', size: 'medium' },
    ],

    // Workflow definitions
    workflows: {
        booking: {
            states: ['TENTATIVE', 'CONFIRMED', 'CHECKED_IN', 'IN_HOUSE', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'],
            initialState: 'TENTATIVE',
            transitions: [
                { from: 'TENTATIVE', to: 'CONFIRMED', roles: ['ADMIN', 'MEMBER'] },
                { from: 'CONFIRMED', to: 'CHECKED_IN', roles: ['ADMIN', 'MEMBER'] },
                { from: 'CHECKED_IN', to: 'IN_HOUSE', roles: ['ADMIN', 'MEMBER'] },
                { from: 'IN_HOUSE', to: 'CHECKED_OUT', roles: ['ADMIN', 'MEMBER'] },
                { from: 'TENTATIVE', to: 'CANCELLED', roles: ['ADMIN', 'MEMBER'] },
                { from: 'CONFIRMED', to: 'CANCELLED', roles: ['ADMIN'] },
                { from: 'CONFIRMED', to: 'NO_SHOW', roles: ['ADMIN'] },
            ],
        },
        event: {
            states: ['INQUIRY', 'PROPOSAL', 'CONFIRMED', 'SETUP', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
            initialState: 'INQUIRY',
            transitions: [
                { from: 'INQUIRY', to: 'PROPOSAL', roles: ['ADMIN', 'MEMBER'] },
                { from: 'PROPOSAL', to: 'CONFIRMED', roles: ['ADMIN'] },
                { from: 'CONFIRMED', to: 'SETUP', roles: ['ADMIN', 'MEMBER'] },
                { from: 'SETUP', to: 'IN_PROGRESS', roles: ['ADMIN', 'MEMBER'] },
                { from: 'IN_PROGRESS', to: 'COMPLETED', roles: ['ADMIN', 'MEMBER'] },
                { from: 'INQUIRY', to: 'CANCELLED', roles: ['ADMIN'] },
                { from: 'PROPOSAL', to: 'CANCELLED', roles: ['ADMIN'] },
            ],
        },
        housekeeping: {
            states: ['PENDING', 'IN_PROGRESS', 'INSPECTING', 'READY', 'OUT_OF_ORDER'],
            initialState: 'PENDING',
            transitions: [
                { from: 'PENDING', to: 'IN_PROGRESS', roles: ['ADMIN', 'MEMBER'] },
                { from: 'IN_PROGRESS', to: 'INSPECTING', roles: ['MEMBER', 'ADMIN'] },
                { from: 'INSPECTING', to: 'READY', roles: ['ADMIN'] },
                { from: 'PENDING', to: 'OUT_OF_ORDER', roles: ['ADMIN'] },
                { from: 'IN_PROGRESS', to: 'OUT_OF_ORDER', roles: ['ADMIN'] },
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
        receiptTemplate: 'hospitality-standard',
    },
};
