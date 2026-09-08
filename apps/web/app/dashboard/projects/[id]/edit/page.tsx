'use client';

/**
 * Edit Project Page — Form untuk mengubah data proyek
 *
 * Menggunakan useProjects hook untuk fetchProjectDetail dan updateProject.
 * Redirect ke halaman detail setelah berhasil diupdate.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    FolderKanban,
    Save,
    X,
} from 'lucide-react';
import { useProjects } from '@/hooks/use-projects';
import { useTranslation } from '@/lib/i18n';

// =============================================================================
// Constants
// =============================================================================

const STATUS_OPTIONS = [
    { value: 'PLANNING', i18nKey: 'dashboard.projects.status.PLANNING' },
    { value: 'ACTIVE', i18nKey: 'dashboard.projects.status.ACTIVE' },
    { value: 'ON_HOLD', i18nKey: 'dashboard.projects.status.ON_HOLD' },
    { value: 'COMPLETED', i18nKey: 'dashboard.projects.status.COMPLETED' },
    { value: 'CANCELLED', i18nKey: 'dashboard.projects.status.CANCELLED' },
];

const PRIORITY_OPTIONS = [
    { value: 'LOW', i18nKey: 'dashboard.tasks.priority.LOW' },
    { value: 'MEDIUM', i18nKey: 'dashboard.tasks.priority.MEDIUM' },
    { value: 'HIGH', i18nKey: 'dashboard.tasks.priority.HIGH' },
    { value: 'URGENT', i18nKey: 'dashboard.tasks.priority.URGENT' },
];

// =============================================================================
// Main Component
// =============================================================================

export default function EditProjectPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params?.id as string;
    const { currentProject, loading, error, fetchProjectDetail, updateProject } = useProjects();
    const { t } = useTranslation();

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
    const [formError, setFormError] = useState<string | null>(null);

    // Load project data
    useEffect(() => {
        if (projectId) {
            fetchProjectDetail(projectId);
        }
    }, [projectId, fetchProjectDetail]);

    // Populate form when project data is loaded
    useEffect(() => {
        if (currentProject) {
            setForm({
                name: currentProject.name || '',
                description: currentProject.description || '',
                status: currentProject.status || 'PLANNING',
                priority: currentProject.priority || 'MEDIUM',
                startDate: currentProject.startDate ? currentProject.startDate.split('T')[0] : '',
                endDate: currentProject.endDate ? currentProject.endDate.split('T')[0] : '',
                budget: currentProject.budget != null ? String(currentProject.budget) : '',
            });
        }
    }, [currentProject]);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
            const { name, value } = e.target;
            setForm((prev) => ({ ...prev, [name]: value }));
        },
        []
    );

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            setFormError(null);

            if (!form.name.trim()) {
                setFormError('Nama proyek wajib diisi');
                return;
            }

            setSubmitting(true);
            try {
                const projectData: Record<string, unknown> = {
                    name: form.name.trim(),
                    status: form.status,
                    priority: form.priority,
                };

                if (form.description.trim()) {
                    projectData.description = form.description.trim();
                } else {
                    projectData.description = null;
                }

                if (form.startDate) {
                    projectData.startDate = form.startDate;
                } else {
                    projectData.startDate = null;
                }

                if (form.endDate) {
                    projectData.endDate = form.endDate;
                } else {
                    projectData.endDate = null;
                }

                if (form.budget) {
                    projectData.budget = parseFloat(form.budget);
                } else {
                    projectData.budget = null;
                }

                const success = await updateProject(projectId, projectData);
                if (success) {
                    router.push(`/dashboard/projects/${projectId}`);
                } else {
                    setFormError('Gagal memperbarui proyek. Silakan coba lagi.');
                }
            } catch {
                setFormError('Gagal terhubung ke server');
            } finally {
                setSubmitting(false);
            }
        },
        [form, projectId, updateProject, router]
    );

    // Loading state
    if (loading && !currentProject) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                    <div className="space-y-2">
                        <div className="h-7 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-4 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Error state (project not found)
    if (error && !currentProject) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/dashboard/projects')}
                        className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Proyek Tidak Ditemukan
                        </h1>
                    </div>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.push(`/dashboard/projects/${projectId}`)}
                    className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                    <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                    <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Edit Proyek
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Perbarui informasi proyek
                    </p>
                </div>
            </div>

            {/* Error Message */}
            {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {formError}
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
                                            {t(opt.i18nKey)}
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
                                            {t(opt.i18nKey)}
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
                        onClick={() => router.push(`/dashboard/projects/${projectId}`)}
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
                        {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                </div>
            </form>
        </div>
    );
}
