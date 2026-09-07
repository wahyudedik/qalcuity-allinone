/**
 * @qalcuity/industry-config — Logistics Industry Pack
 *
 * Industry pack untuk pengiriman, kurir, warehouse management,
 * freight forwarding, dan bisnis logistik lainnya. Menyediakan konfigurasi
 * lengkap untuk Fleet Management, Shipment Tracking, Warehouse Operations,
 * Route Optimization, dan Delivery Management.
 */

import type { IndustryPack } from '../types';

/**
 * Logistics Industry Pack.
 *
 * @example
 * ```typescript
 * import { logisticsIndustryPack } from '@qalcuity/industry-config';
 *
 * // Get pack info
 * console.log(logisticsIndustryPack.name); // "Logistics"
 *
 * // Check module
 * const fleetModule = logisticsIndustryPack.modules.fleetManagement;
 * // { enabled: true, label: "Manajemen Armada" }
 *
 * // Get custom fields for project (shipment)
 * const shipmentFields = logisticsIndustryPack.customFields.project;
 * // [{ name: 'trackingNumber', ... }, ...]
 * ```
 */
export const logisticsIndustryPack: IndustryPack = {
    id: 'logistics',
    name: 'Logistics',
    description: 'Industry pack untuk pengiriman, kurir, warehouse management, freight forwarding, dan bisnis logistik lainnya',

    // Base industry type
    baseIndustry: 'logistics',

    // Module toggles
    modules: {
        fleetManagement: { enabled: true, label: 'Manajemen Armada' },
        shipmentTracking: { enabled: true, label: 'Pelacakan Pengiriman' },
        warehouse: { enabled: true, label: 'Manajemen Gudang' },
        routeOptimization: { enabled: true, label: 'Optimasi Rute' },
        deliveryManagement: { enabled: true, label: 'Manajemen Pengiriman' },
        hr: { enabled: true, label: 'Manajemen Karyawan' },
        finance: { enabled: true, label: 'Keuangan' },
        inventory: { enabled: true, label: 'Persediaan' },
        crm: { enabled: false, label: 'CRM' },
        pos: { enabled: false, label: 'Point of Sale' },
    },

    // Custom fields
    customFields: {
        project: [
            { name: 'trackingNumber', type: 'text', label: 'Nomor Tracking', required: true },
            { name: 'origin', type: 'text', label: 'Kota Asal', required: true },
            { name: 'destination', type: 'text', label: 'Kota Tujuan', required: true },
            { name: 'shipmentType', type: 'select', label: 'Jenis Pengiriman', options: ['Reguler', 'Express', 'Same Day', 'Next Day', 'Economy', 'Cargo', 'FCL', 'LCL'], required: true },
            { name: 'vehicleType', type: 'select', label: 'Jenis Kendaraan', options: ['Motor', 'Mobil', 'Van', 'Truck Box', 'Truck Reefer', 'Tronton', 'Container'], required: false },
            { name: 'estimatedDeliveryDate', type: 'date', label: 'Estimasi Tanggal Sampai', required: false },
            { name: 'insuranceValue', type: 'number', label: 'Nilai Asuransi', required: false },
        ],
        invoice: [
            { name: 'serviceType', type: 'select', label: 'Jenis Layanan', options: ['Pengiriman', 'Warehousing', 'Fulfillment', 'Customs Clearance', 'Insurance', 'COD'], required: true },
            { name: 'weightKg', type: 'number', label: 'Berat (kg)', required: false },
            { name: 'volumeM3', type: 'number', label: 'Volume (m³)', required: false },
            { name: 'codAmount', type: 'number', label: 'Nilai COD', required: false },
        ],
        inventory: [
            { name: 'warehouseZone', type: 'select', label: 'Zona Gudang', options: ['Receiving', 'Storage', 'Picking', 'Packing', 'Shipping', 'Returns', 'Cold Storage'], required: false },
            { name: 'shelfLocation', type: 'text', label: 'Lokasi Rak', required: false },
            { name: 'handlingInstructions', type: 'text', label: 'Instruksi Penanganan', required: false },
            { name: 'fragile', type: 'boolean', label: 'Barang Rapuh', required: false },
        ],
        contact: [
            { name: 'contactType', type: 'select', label: 'Jenis Kontak', options: ['Pengirim', 'Penerima', 'Dropshipper', 'Supplier', 'Agent'], required: true },
            { name: 'serviceArea', type: 'text', label: 'Area Layanan', required: false },
        ],
        task: [
            { name: 'deliveryStatus', type: 'select', label: 'Status Pengiriman', options: ['Pending', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed', 'Returned'], required: false },
            { name: 'driverName', type: 'text', label: 'Nama Driver', required: false },
            { name: 'vehiclePlate', type: 'text', label: 'Nomor Plat Kendaraan', required: false },
            { name: 'podPhoto', type: 'text', label: 'Photo Proof of Delivery', required: false },
        ],
    },

    // Dashboard widgets
    dashboardWidgets: [
        { id: 'active-shipments', title: 'Pengiriman Aktif', module: 'shipmentTracking', size: 'large' },
        { id: 'fleet-status', title: 'Status Armada', module: 'fleetManagement', size: 'medium' },
        { id: 'warehouse-utilization', title: 'Utilisasi Gudang', module: 'warehouse', size: 'medium' },
        { id: 'delivery-performance', title: 'Performa Pengiriman', module: 'deliveryManagement', size: 'medium' },
        { id: 'pending-pickup', title: 'Pickup Pending', module: 'shipmentTracking', size: 'medium' },
    ],

    // Workflow definitions
    workflows: {
        shipment: {
            states: ['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_DELIVERY', 'RETURNED', 'CANCELLED'],
            initialState: 'CREATED',
            transitions: [
                { from: 'CREATED', to: 'PICKED_UP', roles: ['ADMIN', 'MEMBER'] },
                { from: 'PICKED_UP', to: 'IN_TRANSIT', roles: ['ADMIN', 'MEMBER'] },
                { from: 'IN_TRANSIT', to: 'OUT_FOR_DELIVERY', roles: ['ADMIN', 'MEMBER'] },
                { from: 'OUT_FOR_DELIVERY', to: 'DELIVERED', roles: ['ADMIN', 'MEMBER'] },
                { from: 'OUT_FOR_DELIVERY', to: 'FAILED_DELIVERY', roles: ['ADMIN', 'MEMBER'] },
                { from: 'FAILED_DELIVERY', to: 'RETURNED', roles: ['ADMIN'] },
                { from: 'CREATED', to: 'CANCELLED', roles: ['ADMIN'] },
            ],
        },
        warehouseTransfer: {
            states: ['REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'],
            initialState: 'REQUESTED',
            transitions: [
                { from: 'REQUESTED', to: 'APPROVED', roles: ['ADMIN'] },
                { from: 'APPROVED', to: 'IN_TRANSIT', roles: ['MEMBER', 'ADMIN'] },
                { from: 'IN_TRANSIT', to: 'RECEIVED', roles: ['MEMBER', 'ADMIN'] },
                { from: 'REQUESTED', to: 'CANCELLED', roles: ['ADMIN'] },
            ],
        },
        vehicleMaintenance: {
            states: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED'],
            initialState: 'SCHEDULED',
            transitions: [
                { from: 'SCHEDULED', to: 'IN_PROGRESS', roles: ['ADMIN', 'MEMBER'] },
                { from: 'IN_PROGRESS', to: 'COMPLETED', roles: ['ADMIN', 'MEMBER'] },
                { from: 'SCHEDULED', to: 'POSTPONED', roles: ['ADMIN'] },
            ],
        },
    },
};
