'use client';

/**
 * Create Project Page — Form untuk membuat proyek baru
 *
 * Menggunakan useProjects hook untuk createProject action.
 * Redirect ke halaman detail setelah berhasil dibuat.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    FolderKanban,
    Save,
    X,
} from 'lucide-react';
import { useProjects } from '@/hooks/use-projects';

// =============================================================================
// Constants
// =============================================================================

const STATUS_OPTIONS = [
    { value: 'PLANNING', label: 'Perencanaan' },
    { value: 'ACTIVE', label: 'Aktif' },
    { value: 'ON_HOLD', label: 'Ditangguhkan' },
];

const PRIORITY_OPTIONS = [
    { value: 'LOW', label: 'Rendah' },
    { value: 'MEDIUM', label: 'Sedang' },
    { value: 'HIGH', label: 'Tinggi' },
    { value: 'URGENT', label: 'Mendesak' },
];

// =============================================================================
// Main Component
// =============================================================================

export default function NewProjectPage() {
    const router = useRouter();
    const { createProject } = useProjects();

    const [form, setForm] = useState({
        name: '',
        description: '',
        status: 'PLANNING',
        priority: 'MEDIUM',
        startDate: '',
        endDate: '',
        budget: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!form.name.trim()) {
            setError('Nama proyek wajib diisi');
            return;
        }

        setSubmitting(true);
        try {
            const projectData: {
                name: string;
                description?: string;
                status?: string;
                priority?: string;
                startDate?: string;
                endDate?: string;
                budget?: number;
            } = {
                name: form.name.trim(),
                status: form.status,
                priority: form.priority,
            };

            if (form.description.trim()) {
                projectData.description = form.description.trim();
            }
            if (form.startDate) {
                projectData.startDate = form.startDate;
            }
            if (form.endDate) {
                projectData.endDate = form.endDate;
            }
            if (form.budget) {
                projectData.budget = parseFloat(form.budget);
            }

            const success = await createProject(projectData);
            if (success) {
                router.push('/dashboard/projects');
            } else {
                setError('Gagal membuat proyek. Silakan coba lagi.');
            }
        } catch {
            setError('Gagal terhubung ke server');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.push('/dashboard/projects')}
                    className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                    <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                    <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Proyek Baru
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Buat proyek baru untuk tim Anda
                    </p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {error}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                        Informasi Proyek
                    </h2>

                    <div className="space-y-4">
                        {/* Nama Proyek */}
                        <div>
                            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Nama Proyek <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Masukkan nama proyek"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                                required
                            />
                        </div>

                        {/* Deskripsi */}
                        <div>
                            <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Deskripsi
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                placeholder="Deskripsi singkat proyek"
                                rows={3}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                            />
                        </div>

                        {/* Status & Priority */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Status
                                </label>
                                <select
                                    id="status"
                                    name="status"
                                    value={form.status}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                >
                                    {STATUS_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="priority" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Prioritas
                                </label>
                                <select
                                    id="priority"
                                    name="priority"
                                    value={form.priority}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                >
                                    {PRIORITY_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Tanggal Mulai & Selesai */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="startDate" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Tanggal Mulai
                                </label>
                                <input
                                    type="date"
                                    id="startDate"
                                    name="startDate"
                                    value={form.startDate}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label htmlFor="endDate" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Tanggal Selesai
                                </label>
                                <input
                                    type="date"
                                    id="endDate"
                                    name="endDate"
                                    value={form.endDate}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Budget */}
                        <div>
                            <label htmlFor="budget" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Anggaran (Rp)
                            </label>
                            <input
                                type="number"
                                id="budget"
                                name="budget"
                                value={form.budget}
                                onChange={handleChange}
                                placeholder="0"
                                min="0"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => router.push('/dashboard/projects')}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <X className="h-4 w-4" />
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        {submitting ? 'Menyimpan...' : 'Simpan Proyek'}
                    </button>
                </div>
            </form>
        </div>
    );
}
