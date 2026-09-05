'use client';

/**
 * POS Table Management — Main Page
 *
 * Halaman untuk mengelola meja POS: grid view, list view, quick status change,
 * reservasi, dan zone filtering.
 *
 * Features:
 * - Grid View (visual cards) + List View (table format)
 * - Quick status change (AVAILABLE, OCCUPIED, RESERVED, CLEANING, DISABLED)
 * - Reservation form (create reservasi langsung)
 * - Zone filtering
 * - Stats bar (total, available, occupied, reserved)
 * - Auto-refresh setiap 15 detik
 */

import { useState, useMemo } from 'react';
import {
    LayoutGrid,
    List,
    Plus,
    Search,
    Filter,
    RefreshCw,
    MapPin,
    Users,
    Calendar,
    AlertCircle,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { usePosTables, type PosTableData } from '@/hooks/use-pos-tables';
import { TableCard } from '@/components/pos/table-card';
import { ReservationForm } from '@/components/pos/reservation-form';

// =============================================================================
// Status Config
// =============================================================================

const STATUS_OPTIONS = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'DISABLED'];

const STATUS_LABELS: Record<string, string> = {
    AVAILABLE: 'Tersedia',
    OCCUPIED: 'Terisi',
    RESERVED: 'Direservasi',
    CLEANING: 'Bersih-bersih',
    DISABLED: 'Nonaktif',
};

const STATUS_COLORS: Record<string, string> = {
    AVAILABLE: 'bg-green-100 text-green-800',
    OCCUPIED: 'bg-red-100 text-red-800',
    RESERVED: 'bg-blue-100 text-blue-800',
    CLEANING: 'bg-yellow-100 text-yellow-800',
    DISABLED: 'bg-gray-100 text-gray-800',
};

// =============================================================================
// Component
// =============================================================================

export default function TablesPage() {
    const { t } = useTranslation();
    const {
        tables,
        stats,
        loading,
        error,
        filters,
        setFilters,
        fetchTables,
        fetchStats,
        createTable,
        updateTableStatus,
        deleteTable,
        createReservation,
    } = usePosTables();

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [showReservationForm, setShowReservationForm] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createFormData, setCreateFormData] = useState({
        number: 1,
        name: '',
        capacity: 4,
        zone: '',
        floor: '',
        notes: '',
    });
    const [creating, setCreating] = useState(false);

    // Filter tables by search query
    const filteredTables = useMemo(() => {
        if (!searchQuery.trim()) return tables;
        const query = searchQuery.toLowerCase();
        return tables.filter(
            (table) =>
                table.number.toString().includes(query) ||
                (table.name && table.name.toLowerCase().includes(query)) ||
                (table.zone && table.zone.toLowerCase().includes(query)) ||
                (table.floor && table.floor.toLowerCase().includes(query))
        );
    }, [tables, searchQuery]);

    // Extract unique zones for filter
    const zones = useMemo(() => {
        const zoneSet = new Set<string>();
        tables.forEach((table) => {
            if (table.zone) zoneSet.add(table.zone);
        });
        return Array.from(zoneSet).sort();
    }, [tables]);

    // Handle create table
    const handleCreateTable = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            await createTable({
                number: createFormData.number,
                name: createFormData.name || undefined,
                capacity: createFormData.capacity,
                zone: createFormData.zone || undefined,
                floor: createFormData.floor || undefined,
                notes: createFormData.notes || undefined,
            });
            setShowCreateForm(false);
            setCreateFormData({ number: 1, name: '', capacity: 4, zone: '', floor: '', notes: '' });
        } catch {
            // Error handled by hook
        } finally {
            setCreating(false);
        }
    };

    // Handle status change
    const handleStatusChange = async (id: string, status: string) => {
        await updateTableStatus(id, status);
    };

    // Handle delete
    const handleDelete = async (id: string) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus meja ini?')) {
            await deleteTable(id);
        }
    };

    // Handle reservation submit
    const handleReservationSubmit = async (data: {
        tableId?: string | null;
        customerName: string;
        customerPhone?: string;
        partySize: number;
        reservationTime: string;
        duration?: number;
        notes?: string;
    }) => {
        const { tableId, ...rest } = data;
        await createReservation({
            ...rest,
            tableId: tableId ?? undefined,
        });
        setShowReservationForm(false);
    };

    // Stats data
    const totalTables = stats?.tables.total || 0;
    const availableTables = stats?.tables.available || 0;
    const occupiedTables = stats?.tables.occupied || 0;
    const reservedTables = stats?.tables.reserved || 0;
    const cleaningTables = stats?.tables.cleaning || 0;
    const utilizationRate = stats?.utilization.rate || 0;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t('pos.tables.title') || 'Manajemen Meja'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('pos.tables.subtitle') || 'Kelola meja, status, dan reservasi POS'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowReservationForm(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        <Calendar className="h-4 w-4" />
                        Reservasi
                    </button>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Tambah Meja
                    </button>
                    <button
                        onClick={() => { fetchTables(); fetchStats(); }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Stats Bar */}
            <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm">
                    <span className="font-medium text-gray-500">Total:</span>
                    <span className="font-bold text-gray-900">{totalTables}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm">
                    <span className="font-medium text-green-700">Tersedia:</span>
                    <span className="font-bold text-green-800">{availableTables}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-sm">
                    <span className="font-medium text-red-700">Terisi:</span>
                    <span className="font-bold text-red-800">{occupiedTables}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                    <span className="font-medium text-blue-700">Direservasi:</span>
                    <span className="font-bold text-blue-800">{reservedTables}</span>
                </div>
                {cleaningTables > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                        <span className="font-medium text-yellow-700">Bersih-bersih:</span>
                        <span className="font-bold text-yellow-800">{cleaningTables}</span>
                    </div>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                    <span className="font-medium text-gray-500">Utilisasi:</span>
                    <span className="font-bold text-gray-900">{utilizationRate}%</span>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    {/* View Mode Toggle */}
                    <div className="flex rounded-lg bg-gray-100 p-0.5">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'grid'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <LayoutGrid className="h-4 w-4" />
                            Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'list'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <List className="h-4 w-4" />
                            List
                        </button>
                    </div>

                    {/* Zone Filter */}
                    {zones.length > 0 && (
                        <select
                            value={filters.zone || ''}
                            onChange={(e) => setFilters({ ...filters, zone: e.target.value || undefined })}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        >
                            <option value="">Semua Zona</option>
                            {zones.map((zone) => (
                                <option key={zone} value={zone}>
                                    {zone}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Status Filter */}
                    <select
                        value={filters.status || ''}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    >
                        <option value="">Semua Status</option>
                        {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                                {STATUS_LABELS[status]}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari meja..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white w-48"
                    />
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Memuat data meja...</div>
            ) : filteredTables.length === 0 ? (
                <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Belum ada meja</p>
                    <p className="text-sm text-gray-400 mt-1">
                        Klik "Tambah Meja" untuk menambahkan meja pertama Anda.
                    </p>
                </div>
            ) : viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredTables.map((table) => (
                        <TableCard
                            key={table.id}
                            table={table}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            ) : (
                /* List View */
                <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No.</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kapasitas</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zona</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reservasi</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredTables.map((table) => (
                                <tr key={table.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-bold text-gray-900">#{table.number}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{table.name || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                        <span className="inline-flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />
                                            {table.capacity}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[table.status] || ''}`}>
                                            {STATUS_LABELS[table.status] || table.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                        {table.zone ? (
                                            <span className="inline-flex items-center gap-1">
                                                <MapPin className="h-3.5 w-3.5" />
                                                {table.zone}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{table.activeReservationCount}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <select
                                                value={table.status}
                                                onChange={(e) => handleStatusChange(table.id, e.target.value)}
                                                className="text-xs border border-gray-300 rounded px-1.5 py-1"
                                            >
                                                {STATUS_OPTIONS.map((s) => (
                                                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => handleDelete(table.id)}
                                                className="text-xs text-red-600 hover:text-red-800 px-1.5 py-1"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Reservation Form Modal */}
            <ReservationForm
                isOpen={showReservationForm}
                onClose={() => setShowReservationForm(false)}
                onSubmit={handleReservationSubmit}
                tables={tables.map((t) => ({
                    id: t.id,
                    number: t.number,
                    name: t.name,
                    capacity: t.capacity,
                    zone: t.zone,
                    status: t.status,
                }))}
            />

            {/* Create Table Modal */}
            {showCreateForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateForm(false)}>
                    <div
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tambah Meja Baru</h3>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleCreateTable} className="px-6 py-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nomor Meja *</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={createFormData.number}
                                        onChange={(e) => setCreateFormData({ ...createFormData, number: parseInt(e.target.value) || 1 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kapasitas</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={createFormData.capacity}
                                        onChange={(e) => setCreateFormData({ ...createFormData, capacity: parseInt(e.target.value) || 4 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Meja</label>
                                <input
                                    type="text"
                                    value={createFormData.name}
                                    onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="Contoh: VIP 1"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Zona</label>
                                    <input
                                        type="text"
                                        value={createFormData.zone}
                                        onChange={(e) => setCreateFormData({ ...createFormData, zone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="Contoh: Indoor"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lantai</label>
                                    <input
                                        type="text"
                                        value={createFormData.floor}
                                        onChange={(e) => setCreateFormData({ ...createFormData, floor: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="Contoh: 1"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catatan</label>
                                <textarea
                                    value={createFormData.notes}
                                    onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    rows={2}
                                    placeholder="Catatan opsional..."
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateForm(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {creating ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
