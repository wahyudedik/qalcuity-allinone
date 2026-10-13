/**
 * @qalcuity/industry-config — Industry Packs
 *
 * Semua industry packs yang tersedia di Qalcuity.
 * Setiap pack menyediakan konfigurasi lengkap untuk industri tertentu.
 */

export { restaurantIndustryPack } from './restaurant';
export { retailIndustryPack } from './retail';
export { manufacturingIndustryPack } from './manufacturing';
export { healthcareIndustryPack } from './healthcare';
export { constructionIndustryPack } from './construction';
export { professionalServicesIndustryPack } from './professional-services';
export { educationIndustryPack } from './education';
export { agricultureIndustryPack } from './agriculture';
export { logisticsIndustryPack } from './logistics';
export { hospitalityIndustryPack } from './hospitality';
export { communityIndustryPack } from './community';

import { restaurantIndustryPack } from './restaurant';
import { retailIndustryPack } from './retail';
import { manufacturingIndustryPack } from './manufacturing';
import { healthcareIndustryPack } from './healthcare';
import { constructionIndustryPack } from './construction';
import { professionalServicesIndustryPack } from './professional-services';
import { educationIndustryPack } from './education';
import { agricultureIndustryPack } from './agriculture';
import { logisticsIndustryPack } from './logistics';
import { hospitalityIndustryPack } from './hospitality';
import { communityIndustryPack } from './community';
import type { IndustryPack } from '../types';

/**
 * Registry semua industry packs.
 * Key adalah pack ID.
 */
export const INDUSTRY_PACKS: Record<string, IndustryPack> = {
    restaurant: restaurantIndustryPack,
    retail: retailIndustryPack,
    manufacturing: manufacturingIndustryPack,
    healthcare: healthcareIndustryPack,
    construction: constructionIndustryPack,
    'professional-services': professionalServicesIndustryPack,
    education: educationIndustryPack,
    agriculture: agricultureIndustryPack,
    logistics: logisticsIndustryPack,
    hospitality: hospitalityIndustryPack,
    community: communityIndustryPack,
};

/**
 * Daftar semua pack IDs yang tersedia.
 */
export const AVAILABLE_PACK_IDS: string[] = Object.keys(INDUSTRY_PACKS);
