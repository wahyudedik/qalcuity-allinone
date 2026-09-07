/**
 * @qalcuity/industry-config — Professional Services Industry Pack
 *
 * Industry pack untuk konsultan, akuntan, lawyer, agensi kreatif,
 * dan bisnis jasa profesional lainnya. Menyediakan konfigurasi lengkap untuk
 * Client Management, Time Tracking, Billing per Jam/Proyek,
 * Document Management, dan Engagement Letters.
 */

import type { IndustryPack } from '../types';

/**
 * Professional Services Industry Pack.
 *
 * @example
 * ```typescript
 * import { professionalServicesIndustryPack } from '@qalcuity/industry-config';
 *
 * // Get pack info
 * console.log(professionalServicesIndustryPack.name); // "Professional Services"
 *
 * // Check module
 * const timeTrackingModule = professionalServicesIndustryPack.modules.timeTracking;
 * // { enabled: true, label: "Pelacakan Waktu" }
 *
 * // Get custom fields for project
 * const projectFields = professionalServicesIndustryPack.customFields.project;
 * // [{ name: 'engagementType', ... }, ...]
 * ```
 */
export const professionalServicesIndustryPack: IndustryPack = {
    id: 'professional-services',
    name: 'Professional Services',
    description: 'Industry pack untuk konsultan, akuntan, lawyer, agensi kreatif, dan bisnis jasa profesional lainnya',

    // Base industry type
    baseIndustry: 'services',

    // Module toggles
    modules: {
        projects: { enabled: true, label: 'Manajemen Engagement' },
        timeTracking: { enabled: true, label: 'Pelacakan Waktu' },
        crm: { enabled: true, label: 'Client Management' },
        invoicing: { enabled: true, label: 'Penagihan per Jam/Proyek' },
        documentManagement: { enabled: true, label: 'Manajemen Dokumen' },
        hr: { enabled: true, label: 'Manajemen Karyawan' },
        finance: { enabled: true, label: 'Keuangan' },
        inventory: { enabled: false, label: 'Persediaan' },
        pos: { enabled: false, label: 'Point of Sale' },
    },

    // Custom fields
    customFields: {
        project: [
            { name: 'engagementType', type: 'select', label: 'Jenis Engagement', options: ['Audit', 'Tax', 'Advisory', 'Legal Review', 'Konsultasi', 'Desain', 'Pengembangan', 'Training'], required: true },
            { name: 'clientContact', type: 'text', label: 'Kontak Klien Utama', required: true },
            { name: 'engagementLetter', type: 'boolean', label: 'Surat Penugasan Ditandatangani', required: false },
            { name: 'billingMethod', type: 'select', label: 'Metode Penagihan', options: ['Per Jam', 'Fixed Fee', 'Retainer', 'Success Fee', 'Hybrid'], required: true },
            { name: 'hourlyRate', type: 'number', label: 'Tarif Per Jam (Rp)', required: false },
            { name: 'estimatedHours', type: 'number', label: 'Estimasi Jam', required: false },
            { name: 'deadline', type: 'date', label: 'Batas Waktu', required: false },
        ],
        task: [
            { name: 'billedHours', type: 'number', label: 'Jam Tertagih', required: false },
            { name: 'billable', type: 'boolean', label: 'Dapat Ditagih', required: false },
            { name: 'assignedProfessional', type: 'text', label: 'Profesional yang Ditugaskan', required: false },
            { name: 'deliverable', type: 'text', label: 'Deliverable', required: false },
        ],
        contact: [
            { name: 'clientType', type: 'select', label: 'Jenis Klien', options: ['Corporate', 'SME', 'Individual', 'Government', 'Non-Profit'], required: false },
            { name: 'industry', type: 'text', label: 'Industri Klien', required: false },
            { name: 'relationshipPartner', type: 'text', label: 'Partner Penanggung Jawab', required: false },
            { name: 'since', type: 'date', label: 'Klien Sejak', required: false },
        ],
        contactActivity: [
            { name: 'activityType', type: 'select', label: 'Jenis Aktivitas', options: ['Meeting', 'Phone Call', 'Email', 'Document Review', 'Site Visit', 'Presentation'], required: true },
            { name: 'durationMinutes', type: 'number', label: 'Durasi (menit)', required: false },
            { name: 'billable', type: 'boolean', label: 'Dapat Ditagih', required: false },
        ],
    },

    // Dashboard widgets
    dashboardWidgets: [
        { id: 'active-engagements', title: 'Engagement Aktif', module: 'projects', size: 'large' },
        { id: 'billable-hours', title: 'Jam Tertagih Bulan Ini', module: 'timeTracking', size: 'medium' },
        { id: 'utilization-rate', title: 'Tingkat Utilisasi', module: 'timeTracking', size: 'medium' },
        { id: 'outstanding-invoices', title: 'Invoice Belum Dibayar', module: 'invoicing', size: 'medium' },
        { id: 'client-satisfaction', title: 'Kepuasan Klien', module: 'crm', size: 'medium' },
    ],

    // Workflow definitions
    workflows: {
        engagement: {
            states: ['PROPOSAL', 'NEGOTIATION', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'],
            initialState: 'PROPOSAL',
            transitions: [
                { from: 'PROPOSAL', to: 'NEGOTIATION', roles: ['ADMIN', 'MEMBER'] },
                { from: 'NEGOTIATION', to: 'ACTIVE', roles: ['ADMIN'] },
                { from: 'ACTIVE', to: 'ON_HOLD', roles: ['ADMIN'] },
                { from: 'ON_HOLD', to: 'ACTIVE', roles: ['ADMIN'] },
                { from: 'ACTIVE', to: 'COMPLETED', roles: ['ADMIN'] },
                { from: 'PROPOSAL', to: 'CANCELLED', roles: ['ADMIN'] },
                { from: 'NEGOTIATION', to: 'CANCELLED', roles: ['ADMIN'] },
            ],
        },
        invoice: {
            states: ['DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE', 'WRITTEN_OFF'],
            initialState: 'DRAFT',
            transitions: [
                { from: 'DRAFT', to: 'SENT', roles: ['ADMIN', 'MEMBER'] },
                { from: 'SENT', to: 'PARTIAL', roles: ['ADMIN'] },
                { from: 'SENT', to: 'PAID', roles: ['ADMIN'] },
                { from: 'PARTIAL', to: 'PAID', roles: ['ADMIN'] },
                { from: 'SENT', to: 'OVERDUE', roles: ['ADMIN'] },
                { from: 'OVERDUE', to: 'WRITTEN_OFF', roles: ['ADMIN'] },
            ],
        },
        documentApproval: {
            states: ['DRAFT', 'REVIEW', 'APPROVED', 'SENT', 'ARCHIVED'],
            initialState: 'DRAFT',
            transitions: [
                { from: 'DRAFT', to: 'REVIEW', roles: ['MEMBER'] },
                { from: 'REVIEW', to: 'APPROVED', roles: ['ADMIN'] },
                { from: 'APPROVED', to: 'SENT', roles: ['MEMBER', 'ADMIN'] },
                { from: 'SENT', to: 'ARCHIVED', roles: ['ADMIN'] },
            ],
        },
    },
};
