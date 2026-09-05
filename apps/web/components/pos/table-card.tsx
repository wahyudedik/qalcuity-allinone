'use client';

/**
 * POS Table Management — Table Card Component
 *
 * Visual card yang merepresentasikan satu meja di grid view.
 * Menampilkan: nomor meja, kapasitas, status (color-coded), zone, info sesi aktif.
 * Klik untuk expand → tombol status change + info reservasi + edit.
 */

import { useState } from 'react';
import {
    Users,
    Clock,
    MapPin,
    ChevronDown,
    ChevronUp,
    Trash2,
    Edit3,
    Utensils,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface ActiveReservation {
    id: string;
    customerName: string;
    partySize: number;
    reservationTime: string;
    status: string;
}

interface TableCardData {
    id: string;
    number: number;
    name: string | null;
    capacity: number;
    status: string;
    zone: string | null;
    floor: string | null;
    currentSessionId: string | null;
    activeReservationCount: number;
    activeReservations: ActiveReservation[];
    isActive: boolean;
}

interface TableCardProps {
    table: TableCardData;
    onStatusChange: (id: string, status: string) => void;
    onDelete: (id: string) => void;
    onUpdate?: (table: TableCardData) => void;
}

// =============================================================================
// Status Config
// =============================================================================

const STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; label: string }> = {
    AVAILABLE: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800', label: 'Tersedia' },
    OCCUPIED: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-800', label: 'Terisi' },
    RESERVED: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800', label: 'Direservasi' },
    CLEANING: { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800', label: 'Bersih-bersih' },
    DISABLED: { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-800', label: 'Nonaktif' },
};

const STATUS_OPTIONS = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'DISABLED'];

// =============================================================================
// Component
// =============================================================================

export function TableCard({ table, onStatusChange, onDelete, onUpdate }: TableCardProps) {
    const [expanded, setExpanded] = useState(false);
    const config = STATUS_CONFIG[table.status] || STATUS_CONFIG.AVAILABLE;

    const formatTime = (isoString: string) => {
        try {
            return new Date(isoString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '--:--';
        }
    };

    return (
        <div
            className={`rounded-lg border-2 ${config.bg} ${config.border} p-4 transition-all hover:shadow-md cursor-pointer`}
            onClick={() => setExpanded(!expanded)}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${config.text}`}>
                        #{table.number}
                    </span>
                    {table.name && (
                        <span className={`text-sm ${config.text} opacity-75`}>
                            {table.name}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {expanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} ring-1 ring-inset ring-current/10`}>
                    {config.label}
                </span>
            </div>

            {/* Info Row */}
            <div className="flex items-center gap-3 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {table.capacity}
                </span>
                {table.zone && (
                    <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {table.zone}
                    </span>
                )}
                {table.activeReservationCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-blue-600">
                        <Clock className="h-3.5 w-3.5" />
                        {table.activeReservationCount} reservasi
                    </span>
                )}
                {table.currentSessionId && (
                    <span className="inline-flex items-center gap-1 text-orange-600">
                        <Utensils className="h-3.5 w-3.5" />
                        Aktif
                    </span>
                )}
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-300" onClick={(e) => e.stopPropagation()}>
                    {/* Status Change Buttons */}
                    <div className="mb-3">
                        <p className="text-xs font-medium text-gray-500 mb-2">Ubah Status:</p>
                        <div className="flex flex-wrap gap-1.5">
                            {STATUS_OPTIONS.map((status) => {
                                const stConfig = STATUS_CONFIG[status];
                                const isActive = table.status === status;
                                return (
                                    <button
                                        key={status}
                                        onClick={() => onStatusChange(table.id, status)}
                                        disabled={isActive}
                                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors
                                            ${isActive
                                                ? 'opacity-50 cursor-not-allowed ring-2 ring-gray-300'
                                                : 'hover:opacity-80 cursor-pointer'
                                            } ${stConfig.bg} ${stConfig.text}`}
                                    >
                                        {stConfig.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Active Reservations */}
                    {table.activeReservations.length > 0 && (
                        <div className="mb-3">
                            <p className="text-xs font-medium text-gray-500 mb-2">Reservasi Aktif:</p>
                            <div className="space-y-1.5">
                                {table.activeReservations.map((reservation) => (
                                    <div
                                        key={reservation.id}
                                        className="flex items-center justify-between bg-white/50 rounded-md px-2.5 py-1.5 text-xs"
                                    >
                                        <div>
                                            <span className="font-medium">{reservation.customerName}</span>
                                            <span className="text-gray-500 ml-1.5">({reservation.partySize} orang)</span>
                                        </div>
                                        <span className="text-gray-500">{formatTime(reservation.reservationTime)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {onUpdate && (
                            <button
                                onClick={() => onUpdate(table)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                            >
                                <Edit3 className="h-3 w-3" />
                                Edit
                            </button>
                        )}
                        {table.isActive && (
                            <button
                                onClick={() => onDelete(table.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                            >
                                <Trash2 className="h-3 w-3" />
                                Hapus
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
