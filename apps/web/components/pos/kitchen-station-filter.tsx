'use client';

/**
 * Kitchen Display System — Station Filter Component
 *
 * Filter dropdown untuk station.
 * Menampilkan dropdown "All Stations" + list stations.
 *
 * Ref: plans/pos-kitchen-display-architecture.md Section 5.1.2
 */

import { ChevronDown, MapPin } from 'lucide-react';
import type { KitchenStation } from '@/hooks/use-kitchen-orders';

// =============================================================================
// Types
// =============================================================================

interface KitchenStationFilterProps {
    stations: KitchenStation[];
    selectedStationId: string;
    onChange: (stationId: string) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Dropdown filter for kitchen stations.
 * Shows "Semua Stasiun" as default + list of active stations with order count.
 */
export function KitchenStationFilter({
    stations,
    selectedStationId,
    onChange,
}: KitchenStationFilterProps) {
    return (
        <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
                value={selectedStationId}
                onChange={(e) => onChange(e.target.value)}
                className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-9 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
                <option value="ALL">Semua Stasiun</option>
                {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                        {station.name}
                        {station.activeOrderCount > 0
                            ? ` (${station.activeOrderCount})`
                            : ''}
                    </option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
    );
}
