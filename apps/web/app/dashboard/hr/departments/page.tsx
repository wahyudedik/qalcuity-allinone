'use client'
import { usePermission } from '@/lib/use-permission'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import {
    Search,
    Plus,
    Building2,
    Users,
    Edit,
    Trash2,
    Loader2,
    LayoutGrid,
    List,
    X,
    ChevronRight,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// ============================================
// TYPES
// ============================================

interface Department {
    id: string
    name: string
    description: string
    isActive: boolean
    employeeCount: number
    createdAt: string
    updatedAt: string
}

interface DepartmentFormData {
    name: string
    description: string
    isActive: boolean
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function DepartmentsPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const { canMutate: canMutateFn } = usePermission()
    const canMutate = canMutateFn('hr')

    const [departments, setDepartments] = useState<Department[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterActive, setFilterActive] = useState('')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Form modal
    const [showForm, setShowForm] = useState(false)
    const [editingDept, setEditingDept] = useState<Department | null>(null)
    const [formData, setFormData] = useState<DepartmentFormData>({ name: '', description: '', isActive: true })
    const [formErrors, setFormErrors] = useState<{ name?: string }>({})
    const [submitting, setSubmitting] = useState(false)

    // Delete confirm
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deletingDept, setDeletingDept] = useState<Department | null>(null)
    const [deleting, setDeleting] = useState(false)

    // ============================================
    // EFFECTS
    // ============================================

    useEffect(() => {
        fetchDepartments()
    }, [])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    // ============================================
    // DATA FETCHING
    // ============================================

    const fetchDepartments = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (search) params.set('search', search)
            if (filterActive) params.set('isActive', filterActive)

            const response = await fetch(`/api/hr/departments?${params.toString()}`)
            const data = await response.json()
            if (data.success) {
                setDepartments(data.data)
            }
        } catch {
            setToast({ message: t('hr.department.toast.loadFailed') || 'Gagal memuat departemen', type: 'error' })
        } finally {
            setLoading(false)
        }
    }, [search, filterActive, t])

    useEffect(() => {
        fetchDepartments()
    }, [fetchDepartments])

    // ============================================
    // FILTERED DATA
    // ============================================

    const filteredDepartments = departments.filter((dept) => {
        if (!search) return true
        return dept.name.toLowerCase().includes(search.toLowerCase()) ||
            dept.description.toLowerCase().includes(search.toLowerCase())
    })

    // ============================================
    // HANDLERS
    // ============================================

    const validateForm = (): boolean => {
        const errors: { name?: string } = {}
        if (!formData.name.trim()) {
            errors.name = t('hr.department.validation.nameRequired') || 'Nama departemen wajib diisi'
        }
        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const openCreateForm = () => {
        setEditingDept(null)
        setFormData({ name: '', description: '', isActive: true })
        setFormErrors({})
        setShowForm(true)
    }

    const openEditForm = (dept: Department) => {
        setEditingDept(dept)
        setFormData({ name: dept.name, description: dept.description, isActive: dept.isActive })
        setFormErrors({})
        setShowForm(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validateForm()) return

        try {
            setSubmitting(true)
            const url = editingDept ? `/api/hr/departments/${editingDept.id}` : '/api/hr/departments'
            const method = editingDept ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            const result = await response.json()
            if (result.success) {
                setToast({ message: editingDept ? (t('hr.department.toast.updateSuccess') || 'Departemen berhasil diperbarui') : (t('hr.department.toast.createSuccess') || 'Departemen berhasil dibuat'), type: 'success' })
                setShowForm(false)
                fetchDepartments()
            } else {
                setToast({ message: result.error || (t('hr.department.toast.saveFailed') || 'Gagal menyimpan departemen'), type: 'error' })
            }
        } catch {
            setToast({ message: t('hr.department.toast.saveFailed') || 'Gagal menyimpan departemen', type: 'error' })
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = (dept: Department) => {
        setDeletingDept(dept)
        setShowDeleteConfirm(true)
    }

    const confirmDelete = async () => {
        if (!deletingDept) return
        try {
            setDeleting(true)
            const response = await fetch(`/api/hr/departments/${deletingDept.id}`, { method: 'DELETE' })
            const result = await response.json()
            if (result.success) {
                setToast({ message: t('hr.department.toast.deleteSuccess') || 'Departemen berhasil dihapus', type: 'success' })
                fetchDepartments()
            } else {
                setToast({ message: result.error || (t('hr.department.toast.deleteFailed') || 'Gagal menghapus departemen'), type: 'error' })
            }
        } catch {
            setToast({ message: t('hr.department.toast.deleteFailed') || 'Gagal menghapus departemen', type: 'error' })
        } finally {
            setDeleting(false)
            setShowDeleteConfirm(false)
            setDeletingDept(null)
        }
    }

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-6 p-6">
            {/* Toast */}
            {toast && (
                <div
                    className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                >
                    {toast.message}
                </div>
            )}

            {/* Delete Confirm Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => { setShowDeleteConfirm(false); setDeletingDept(null) }}
                onConfirm={confirmDelete}
                title={t('hr.department.confirm.deleteTitle') || 'Hapus Departemen'}
                message={`${t('hr.department.confirm.deleteMessage') || 'Apakah Anda yakin ingin menghapus'} ${deletingDept?.name || ''}?`}
                confirmText={deleting ? (t('common.processing') || 'Memproses...') : (t('common.confirm') || 'Ya, Hapus')}
                variant="danger"
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('hr.department.title') || 'Departemen'}</h1>
                    <p className="text-gray-500 mt-1">{t('hr.department.subtitle') || 'Kelola departemen dalam organisasi Anda'}</p>
                </div>
                {canMutate && (
                    <button
                        onClick={openCreateForm}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        {t('hr.department.create') || 'Tambah Departemen'}
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-100 p-2">
                            <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">{t('hr.department.stats.total') || 'Total Departemen'}</p>
                            <p className="text-xl font-bold text-gray-900">{departments.length}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-green-100 p-2">
                            <Building2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">{t('hr.department.stats.active') || 'Aktif'}</p>
                            <p className="text-xl font-bold text-gray-900">{departments.filter((d) => d.isActive).length}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-purple-100 p-2">
                            <Users className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">{t('hr.department.stats.totalEmployees') || 'Total Karyawan'}</p>
                            <p className="text-xl font-bold text-gray-900">{departments.reduce((sum, d) => sum + d.employeeCount, 0)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder={t('hr.department.searchPlaceholder') || 'Cari departemen...'}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <select
                    value={filterActive}
                    onChange={(e) => setFilterActive(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                    <option value="">{t('hr.department.filter.allStatus') || 'Semua Status'}</option>
                    <option value="true">{t('hr.department.filter.active') || 'Aktif'}</option>
                    <option value="false">{t('hr.department.filter.inactive') || 'Tidak Aktif'}</option>
                </select>
                <div className="flex items-center gap-1 rounded-lg border border-gray-300 p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`rounded-md p-1.5 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`rounded-md p-1.5 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <List className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 bg-gray-200 rounded-lg" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-5 w-40 bg-gray-200 rounded" />
                                    <div className="h-3 w-64 bg-gray-200 rounded" />
                                </div>
                                <div className="h-6 w-20 bg-gray-200 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredDepartments.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                    <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">{t('hr.department.empty.title') || 'Belum ada departemen'}</h3>
                    <p className="text-gray-500 mb-4">{t('hr.department.empty.description') || 'Mulai dengan membuat departemen pertama'}</p>
                    {canMutate && (
                        <button
                            onClick={openCreateForm}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" />
                            {t('hr.department.create') || 'Tambah Departemen'}
                        </button>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDepartments.map((dept) => (
                        <div key={dept.id} className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-blue-100 p-2">
                                        <Building2 className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <Link
                                            href={`/dashboard/hr/departments/${dept.id}`}
                                            className="font-semibold text-gray-900 hover:text-blue-600"
                                        >
                                            {dept.name}
                                        </Link>
                                    </div>
                                </div>
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${dept.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                    {dept.isActive ? (t('hr.department.status.active') || 'Aktif') : (t('hr.department.status.inactive') || 'Nonaktif')}
                                </span>
                            </div>
                            {dept.description && (
                                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{dept.description}</p>
                            )}
                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                    <Users className="h-4 w-4" />
                                    {dept.employeeCount} {t('hr.department.employees') || 'karyawan'}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/dashboard/hr/departments/${dept.id}`}
                                        className="rounded-lg p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Link>
                                    {canMutate && (
                                        <>
                                            <button
                                                onClick={() => openEditForm(dept)}
                                                className="rounded-lg p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(dept)}
                                                className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('hr.department.table.name') || 'Nama'}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('hr.department.table.description') || 'Deskripsi'}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('hr.department.table.employees') || 'Karyawan'}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('hr.department.table.status') || 'Status'}</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('hr.department.table.actions') || 'Aksi'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredDepartments.map((dept) => (
                                    <tr key={dept.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/dashboard/hr/departments/${dept.id}`}
                                                className="font-medium text-gray-900 hover:text-blue-600"
                                            >
                                                {dept.name}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{dept.description || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{dept.employeeCount}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${dept.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                                {dept.isActive ? (t('hr.department.status.active') || 'Aktif') : (t('hr.department.status.inactive') || 'Nonaktif')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/dashboard/hr/departments/${dept.id}`}
                                                    className="rounded-lg p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Link>
                                                {canMutate && (
                                                    <>
                                                        <button
                                                            onClick={() => openEditForm(dept)}
                                                            className="rounded-lg p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(dept)}
                                                            className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {editingDept ? (t('hr.department.form.editTitle') || 'Edit Departemen') : (t('hr.department.form.createTitle') || 'Tambah Departemen')}
                            </h2>
                            <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('hr.department.form.name') || 'Nama Departemen'} *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 ${formErrors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
                                    placeholder={t('hr.department.form.namePlaceholder') || 'Masukkan nama departemen'}
                                />
                                {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('hr.department.form.description') || 'Deskripsi'}</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    placeholder={t('hr.department.form.descriptionPlaceholder') || 'Masukkan deskripsi departemen'}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="isActive" className="text-sm text-gray-700">{t('hr.department.form.active') || 'Aktif'}</label>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    {t('common.cancel') || 'Batal'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {submitting ? (t('common.processing') || 'Menyimpan...') : (t('common.save') || 'Simpan')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
