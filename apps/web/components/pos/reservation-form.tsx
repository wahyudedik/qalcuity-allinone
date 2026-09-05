'use client';

/**
 * POS Table Management — Reservation Form Component
 *
 * Form untuk membuat/edit reservasi meja.
 * Fields: nama pelanggan, telepon, jumlah tamu, tanggal/waktu, durasi, meja (opsional), catatan.
 * Auto-suggest meja berdasarkan kapasitas dan waktu.
 */

import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, Users, FileText, X } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface TableOption {
    id: string;
    number: number;
    name: string | null;
    capacity: number;
    zone: string | null;
    status: string;
}

interface ReservationFormData {
    tableId?: string | null;
    customerName: string;
    customerPhone?: string;
    partySize: number;
    reservationTime: string;
    duration: number;
    notes?: string;
}

interface ReservationFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ReservationFormData) => Promise<void>;
    tables: TableOption[];
    initialData?: Partial<ReservationFormData>;
    title?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ReservationForm({
    isOpen,
    onClose,
    onSubmit,
    tables,
    initialData,
    title = 'Buat Reservasi Baru',
}: ReservationFormProps) {
    const [formData, setFormData] = useState<ReservationFormData>({
        tableId: initialData?.tableId || null,
        customerName: initialData?.customerName || '',
        customerPhone: initialData?.customerPhone || '',
        partySize: initialData?.partySize || 2,
        reservationTime: initialData?.reservationTime || '',
        duration: initialData?.duration || 60,
        notes: initialData?.notes || '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter tables based on capacity and availability
    const suggestedTables = tables.filter(
        (t) => t.capacity >= formData.partySize && t.status !== 'DISABLED'
    );

    useEffect(() => {
        if (initialData) {
            setFormData({
                tableId: initialData.tableId || null,
                customerName: initialData.customerName || '',
                customerPhone: initialData.customerPhone || '',
                partySize: initialData.partySize || 2,
                reservationTime: initialData.reservationTime || '',
                duration: initialData.duration || 60,
                notes: initialData.notes || '',
            });
        }
    }, [initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.customerName.trim()) {
            setError('Nama pelanggan wajib diisi');
            return;
        }
        if (!formData.reservationTime) {
            setError('Waktu reservasi wajib diisi');
            return;
        }
        if (formData.partySize < 1) {
            setError('Jumlah tamu minimal 1');
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit({
                ...formData,
                customerName: formData.customerName.trim(),
                customerPhone: formData.customerPhone?.trim() || undefined,
                notes: formData.notes?.trim() || undefined,
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Customer Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            <User className="inline h-4 w-4 mr-1" />
                            Nama Pelanggan *
                        </label>
                        <input
                            type="text"
                            value={formData.customerName}
                            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Masukkan nama pelanggan"
                            required
                        />
                    </div>

                    {/* Customer Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            <Phone className="inline h-4 w-4 mr-1" />
                            Nomor Telepon
                        </label>
                        <input
                            type="tel"
                            value={formData.customerPhone || ''}
                            onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="08xxxxxxxxxx"
                        />
                    </div>

                    {/* Party Size + Duration */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Users className="inline h-4 w-4 mr-1" />
                                Jumlah Tamu *
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={100}
                                value={formData.partySize}
                                onChange={(e) => setFormData({ ...formData, partySize: parseInt(e.target.value) || 1 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Clock className="inline h-4 w-4 mr-1" />
                                Durasi (menit)
                            </label>
                            <select
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value={30}>30 menit</option>
                                <option value={60}>60 menit</option>
                                <option value={90}>90 menit</option>
                                <option value={120}>120 menit</option>
                                <option value={180}>180 menit</option>
                            </select>
                        </div>
                    </div>

                    {/* Reservation Time */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            <Calendar className="inline h-4 w-4 mr-1" />
                            Waktu Reservasi *
                        </label>
                        <input
                            type="datetime-local"
                            value={formData.reservationTime}
                            onChange={(e) => setFormData({ ...formData, reservationTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            required
                        />
                    </div>

                    {/* Table Assignment */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Assigned Meja (Opsional)
                        </label>
                        <select
                            value={formData.tableId || ''}
                            onChange={(e) => setFormData({ ...formData, tableId: e.target.value || null })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="">-- Pilih Meja --</option>
                            {suggestedTables.map((table) => (
                                <option key={table.id} value={table.id}>
                                    #{table.number} {table.name ? `(${table.name})` : ''} — Kapasitas {table.capacity} {table.zone ? `• ${table.zone}` : ''}
                                </option>
                            ))}
                        </select>
                        {suggestedTables.length === 0 && (
                            <p className="mt-1 text-xs text-amber-600">
                                Tidak ada meja yang tersedia untuk {formData.partySize} tamu
                            </p>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            <FileText className="inline h-4 w-4 mr-1" />
                            Catatan
                        </label>
                        <textarea
                            value={formData.notes || ''}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Catatan tambahan (opsional)"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {submitting ? 'Menyimpan...' : 'Simpan Reservasi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
