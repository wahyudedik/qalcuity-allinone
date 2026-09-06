'use client';

/**
 * FieldJobMap — Komponen sederhana untuk menampilkan lokasi pekerjaan.
 * Menampilkan map link dan info GPS coordinates.
 * Mobile-first design untuk technician di lapangan.
 */

import { MapPin, Navigation, ExternalLink } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

// =============================================================================
// Types
// =============================================================================

interface FieldJobMapProps {
    latitude?: number | null;
    longitude?: number | null;
    location?: string | null;
    address?: string | null;
}

// =============================================================================
// Main Component
// =============================================================================

export function FieldJobMap({ latitude, longitude, location, address }: FieldJobMapProps) {
    const { t } = useTranslation();
    const hasGps = latitude != null && longitude != null;
    const mapUrl = hasGps
        ? `https://www.google.com/maps?q=${latitude},${longitude}`
        : null;

    const openInMaps = () => {
        if (mapUrl) {
            window.open(mapUrl, '_blank', 'noopener,noreferrer');
        }
    };

    if (!location && !address && !hasGps) {
        return (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-gray-700 dark:bg-gray-800">
                <MapPin className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {t('field.components.jobMap.noLocationInfo')}
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden dark:border-gray-700 dark:bg-gray-800">
            {/* Map placeholder — click to open Google Maps */}
            {hasGps && (
                <button
                    onClick={openInMaps}
                    className="w-full h-40 bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center cursor-pointer hover:from-blue-100 hover:to-green-100 transition-colors dark:from-blue-900/20 dark:to-green-900/20 dark:hover:from-blue-900/30 dark:hover:to-green-900/30"
                >
                    <div className="text-center">
                        <MapPin className="mx-auto h-10 w-10 text-blue-500 dark:text-blue-400" />
                        <p className="mt-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                            {t('field.components.jobMap.openInMaps')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {latitude!.toFixed(6)}, {longitude!.toFixed(6)}
                        </p>
                    </div>
                </button>
            )}

            {/* Location info */}
            <div className="p-4 space-y-3">
                {location && (
                    <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('field.components.jobMap.location')}</p>
                            <p className="text-sm text-gray-900 dark:text-white">{location}</p>
                        </div>
                    </div>
                )}

                {address && (
                    <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('field.components.jobMap.address')}</p>
                            <p className="text-sm text-gray-900 dark:text-white">{address}</p>
                        </div>
                    </div>
                )}

                {hasGps && (
                    <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-gray-400 shrink-0" />
                        <div className="flex-1">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('field.components.jobMap.coordinates')}</p>
                            <p className="text-sm text-gray-900 dark:text-white">
                                {latitude!.toFixed(7)}, {longitude!.toFixed(7)}
                            </p>
                        </div>
                        <a
                            href={mapUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                        >
                            <ExternalLink className="h-3 w-3" />
                            {t('field.components.jobMap.open')}
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
