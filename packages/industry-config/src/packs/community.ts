/**
 * @qalcuity/industry-config — Community (RT/RW) Industry Pack
 *
 * Industry pack untuk komunitas lingkungan RT/RW. Menyediakan konfigurasi
 * untuk pengelolaan iuran warga, kas lingkungan, pengumuman, dan portal warga.
 */

import type { IndustryPack } from '../types';

/**
 * Community (RT/RW) Industry Pack.
 *
 * @example
 * ```typescript
 * import { communityIndustryPack } from '@qalcuity/industry-config';
 *
 * // Get pack info
 * console.log(communityIndustryPack.name); // "Komunitas / RT-RW"
 *
 * // Check module
 * const communityModule = communityIndustryPack.modules.community;
 * // { enabled: true, label: "Komunitas" }
 *
 * // Get custom fields for community member
 * const memberFields = communityIndustryPack.customFields.CommunityMember;
 * // [{ name: 'blokRumah', ... }, { name: 'statusKepengurusan', ... }]
 * ```
 */
export const communityIndustryPack: IndustryPack = {
    id: 'community',
    name: 'Komunitas / RT-RW',
    description: 'Pengelolaan iuran warga, kas lingkungan, dan pengumuman RT/RW',

    // Base industry type — komunitas tidak terikat satu industri tertentu
    baseIndustry: 'general',

    // Module toggles
    modules: {
        community: { enabled: true, label: 'Komunitas' },
        finance: { enabled: true, label: 'Kas & Keuangan' },
        reports: { enabled: true, label: 'Laporan' },
    },

    // Custom fields
    customFields: {
        CommunityMember: [
            { name: 'blokRumah', type: 'text', label: 'Blok / No. Rumah', required: false },
            {
                name: 'statusKepengurusan',
                type: 'select',
                label: 'Status KTP',
                options: ['Sesuai domisili', 'Belum pindah', 'Kos'],
                required: false,
            },
        ],
    },

    // Dashboard widgets
    dashboardWidgets: [
        { id: 'community-overview', title: 'Ringkasan Komunitas', module: 'community', size: 'medium' },
        { id: 'community-dues-status', title: 'Status Iuran Bulan Ini', module: 'community', size: 'medium' },
        { id: 'community-cash', title: 'Kas Terbaru', module: 'community', size: 'medium' },
    ],

    // Workflow definitions — belum ada workflow spesifik di Phase 1
    workflows: {},
};
