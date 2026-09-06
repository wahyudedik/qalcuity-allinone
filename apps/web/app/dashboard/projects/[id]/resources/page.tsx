'use client';

/**
 * Resource Allocation Page — Manajemen alokasi resource project
 *
 * Menampilkan heatmap alokasi employee, form alokasi baru,
 * dan ringkasan utilization. Menggunakan ResourceHeatmap component.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Users,
    RefreshCw,
    AlertCircle,
    Plus,
    X,
} from 'lucide-react';
import { ResourceHeatmap, type ResourceData } from '@/components/operations/resource-heatmap';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';

export default function ResourcesPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params?.id as string;

    const [resourceData, setResourceData] = useState<ResourceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Form state for adding new allocation
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        employeeId: '',
        role: 'MEMBER' as string,
        allocationPct: 50,
        startDate: '',
        endDate: '',
        hourlyRate: '',
        notes: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const fetchResources = useCallback(async () => {
        try {
            setError(null);
            const response = await fetch(`/api/projects/${projectId}/resources?active=true`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Gagal memuat data resource');
            }
            const data = await response.json();
            setResourceData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [projectId]);

    useEffect(() => {
        if (projectId) {
            void fetchResources();
        }
    }, [projectId, fetchResources]);

    const handleRefresh = () => {
        setRefreshing(true);
        void fetchResources();
    };

    const handleSubmitAllocation = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!formData.employeeId.trim()) {
            setFormError('ID Karyawan wajib diisi');
            return;
        }
        if (!formData.startDate || !formData.endDate) {
            setFormError('Tanggal mulai dan selesai wajib diisi');
            return;
        }
        if (formData.allocationPct < 1 || formData.allocationPct > 100) {
            setFormError('Persentase alokasi harus antara 1-100%');
            return;
        }

        try {
            setSubmitting(true);
            const response = await fetch(`/api/projects/${projectId}/resources`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: formData.employeeId.trim(),
                    role: formData.role,
                    allocationPct: formData.allocationPct,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
                    notes: formData.notes.trim() || null,
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Gagal membuat alokasi resource');
            }

            // Reset form and refresh
            setFormData({
                employeeId: '',
                role: 'MEMBER',
                allocationPct: 50,
                startDate: '',
                endDate: '',
                hourlyRate: '',
                notes: '',
            });
            setShowForm(false);
            void fetchResources();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Terjadi kesalahan');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push(`/dashboard/projects/${projectId}`)}
                        className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Users className="h-6 w-6 text-purple-600" />
                            Alokasi Resource
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Manajemen alokasi karyawan project
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {showForm ? 'Tutup' : 'Tambah Alokasi'}
                    </button>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Add Allocation Form */}
            {showForm && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                        Tambah Alokasi Baru
                    </h3>

                    {formError && (
                        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                            {formError}
                        </div>
                    )}

                    <form onSubmit={handleSubmitAllocation} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {/* Employee ID */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    ID Karyawan *
                                </label>
                                <input
                                    type="text"
                                    value={formData.employeeId}
                                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                    placeholder="contoh: EMP001"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Peran
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="MANAGER">Manajer</option>
                                    <option value="MEMBER">Anggota</option>
                                    <option value="CONSULTANT">Konsultan</option>
                                </select>
                            </div>

                            {/* Allocation % */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Alokasi (%) *
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="range"
                                        min="1"
                                        max="100"
                                        value={formData.allocationPct}
                                        onChange={(e) => setFormData({ ...formData, allocationPct: parseInt(e.target.value) })}
                                        className="flex-1"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
                                        {formData.allocationPct}%
                                    </span>
                                </div>
                            </div>

                            {/* Start Date */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Tanggal Mulai *
                                </label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>

                            {/* End Date */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Tanggal Selesai *
                                </label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>

                            {/* Hourly Rate */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Rate per Jam (Rp)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={formData.hourlyRate}
                                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                                    placeholder="Opsional"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Catatan
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Catatan tambahan (opsional)"
                                rows={2}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {submitting ? 'Menyimpan...' : 'Simpan Alokasi'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Error State */}
            {error && !resourceData && (
                <div className="flex flex-col items-center justify-center min-h-[400px] rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
                    <button
                        onClick={handleRefresh}
                        className="mt-4 text-sm text-blue-600 hover:text-blue-700"
                    >
                        Coba lagi
                    </button>
                </div>
            )}

            {/* Resource Heatmap */}
            {!error && (
                <ResourceHeatmap data={resourceData} loading={loading} />
            )}

            {/* Allocations Detail Table */}
            {!error && !loading && resourceData && resourceData.data.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Detail Alokasi
                        </h3>
                    </div>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Karyawan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Peran</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Alokasi</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Periode</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rate/Jam</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {resourceData.data.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                            {item.employeeId}
                                        </td>
                                        <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                                            {item.role === 'MANAGER' ? 'Manajer' : item.role === 'CONSULTANT' ? 'Konsultan' : 'Anggota'}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
                                                    <div
                                                        className={`h-2 rounded-full ${item.allocationPct > 100 ? 'bg-red-500' : item.allocationPct > 75 ? 'bg-orange-500' : item.allocationPct > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                        style={{ width: `${Math.min(item.allocationPct, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.allocationPct}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                                            {formatDate(item.startDate)} — {formatDate(item.endDate)}
                                        </td>
                                        <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                                            {item.hourlyRate ? `Rp ${item.hourlyRate.toLocaleString('id-ID')}` : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                        {resourceData.data.map((item) => (
                            <div key={item.id} className="p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{item.employeeId}</span>
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {item.role === 'MANAGER' ? 'Manajer' : item.role === 'CONSULTANT' ? 'Konsultan' : 'Anggota'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700">
                                        <div
                                            className={`h-2 rounded-full ${item.allocationPct > 100 ? 'bg-red-500' : item.allocationPct > 75 ? 'bg-orange-500' : item.allocationPct > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                            style={{ width: `${Math.min(item.allocationPct, 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.allocationPct}%</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <span>{formatDate(item.startDate)} — {formatDate(item.endDate)}</span>
                                    {item.hourlyRate && <span>Rp {item.hourlyRate.toLocaleString('id-ID')}/jam</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!error && !loading && resourceData && resourceData.data.length === 0 && (
                <EmptyState
                    icon={Users}
                    title="Belum ada alokasi resource"
                    description="Mulai alokasikan karyawan ke project ini untuk melacak pemanfaatan resource."
                    actionLabel="Tambah Alokasi"
                    onAction={() => setShowForm(true)}
                />
            )}
        </div>
    );
}
