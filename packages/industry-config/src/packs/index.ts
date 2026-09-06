/**
 * @qalcuity/industry-config — Industry Packs
 *
 * Semua industry packs yang tersedia di Qalcuity.
 * Setiap pack menyediakan konfigurasi lengkap untuk industri tertentu.
 */

export { restaurantIndustryPack } from './restaurant';
export { retailIndustryPack } from './retail';
export { manufacturingIndustryPack } from './manufacturing';

import { restaurantIndustryPack } from './restaurant';
import { retailIndustryPack } from './retail';
import { manufacturingIndustryPack } from './manufacturing';
import type { IndustryPack } from '../types';

/**
 * Registry semua industry packs.
 * Key adalah pack ID.
 */
export const INDUSTRY_PACKS: Record<string, IndustryPack> = {
    restaurant: restaurantIndustryPack,
    retail: retailIndustryPack,
    manufacturing: manufacturingIndustryPack,
};

/**
 * Daftar semua pack IDs yang tersedia.
 */
export const AVAILABLE_PACK_IDS: string[] = Object.keys(INDUSTRY_PACKS);
