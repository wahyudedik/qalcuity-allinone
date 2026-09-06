'use client';

/**
 * Field Checklists Page — Manajemen template checklist untuk field service.
 * CRUD checklist templates dengan item management.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    ClipboardList,
    Plus,
    Search,
    X,
    Edit2,
    Trash2,
    CheckSquare,
    Type,
    Hash,
    Camera,
    PenLine,
    Eye,
    EyeOff,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useTranslation } from '@/lib/i18n';

// =============================================================================
// Types
// =============================================================================

interface ChecklistItem {
    id: string;
    label: string;
    type: 'CHECKBOX' | 'TEXT' | 'NUMBER' | 'PHOTO' | 'SIGNATURE';
    required?: boolean;
}

interface Checklist {
    id: string;
    name: string;
    description?: string | null;
    category: string;
    items: ChecklistItem[];
    isActive: boolean;
    usageCount: number;
    createdAt: string;
    updatedAt: string;
}

// =============================================================================
// Constants (non-i18n)
// =============================================================================

const CATEGORY_COLORS: Record<string, string> = {
    GENERAL: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    SAFETY: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    INSTALLATION: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    MAINTENANCE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    INSPECTION: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

const TYPE_ICONS: Record<string, React.ElementType> = {
    CHECKBOX: CheckSquare,
    TEXT: Type,
    NUMBER: Hash,
    PHOTO: Camera,
    SIGNATURE: PenLine,
};

// =============================================================================
// Main Component
// =============================================================================

export default function FieldChecklistsPage() {
    const { t } = useTranslation();
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formCategory, setFormCategory] = useState('GENERAL');
    const [formItems, setFormItems] = useState<ChecklistItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // i18n-driven constants
    const getCategoryLabels = (): Record<string, string> => ({
        GENERAL: t('field.checklists.category.GENERAL'),
        SAFETY: t('field.checklists.category.SAFETY'),
        INSTALLATION: t('field.checklists.category.INSTALLATION'),
        MAINTENANCE: t('field.checklists.category.MAINTENANCE'),
        INSPECTION: t('field.checklists.category.INSPECTION'),
    });

    const getTypeLabels = (): Record<string, string> => ({
        CHECKBOX: t('field.checklists.type.CHECKBOX'),
        TEXT: t('field.checklists.type.TEXT'),
        NUMBER: t('field.checklists.type.NUMBER'),
        PHOTO: t('field.checklists.type.PHOTO'),
        SIGNATURE: t('field.checklists.type.SIGNATURE'),
    });

    const CATEGORY_LABELS = getCategoryLabels();
    const TYPE_LABELS = getTypeLabels();

    const fetchChecklists = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
            params.set('page', String(page));
            params.set('limit', '10');

            const res = await fetch(`/api/field/checklists?${params.toString()}`);
            const data = await res.json();

            if (data.success) {
                setChecklists(data.data);
                setTotalPages(data.totalPages);
                setTotal(data.total);
            } else {
                setError(data.error || t('field.checklists.errorLoad'));
            }
        } catch {
            setError(t('field.checklists.errorGeneric'));
        } finally {
            setLoading(false);
        }
    }, [search, categoryFilter, page, t]);

    useEffect(() => {
        fetchChecklists();
    }, [fetchChecklists]);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const resetForm = () => {
        setFormName('');
        setFormDescription('');
        setFormCategory('GENERAL');
        setFormItems([]);
    };

    const openCreateModal = () => {
        resetForm();
        setEditingChecklist(null);
        setShowCreateModal(true);
    };

    const openEditModal = (cl: Checklist) => {
        setFormName(cl.name);
        setFormDescription(cl.description || '');
        setFormCategory(cl.category);
        setFormItems([...cl.items]);
        setEditingChecklist(cl);
        setShowCreateModal(true);
    };

    const addItem = () => {
        setFormItems([
            ...formItems,
            {
                id: `item-${Date.now()}`,
                label: '',
                type: 'CHECKBOX',
                required: false,
            },
        ]);
    };

    const updateItem = (index: number, field: keyof ChecklistItem, value: string | boolean) => {
        const updated = [...formItems];
        updated[index] = { ...updated[index], [field]: value };
        setFormItems(updated);
    };

    const removeItem = (index: number) => {
        setFormItems(formItems.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!formName.trim()) {
            setToast({ message: t('field.checklists.validation.nameRequired'), type: 'error' });
            return;
        }
        if (formItems.length === 0) {
            setToast({ message: t('field.checklists.validation.minOneItem'), type: 'error' });
            return;
        }
        if (formItems.some((item) => !item.label.trim())) {
            setToast({ message: t('field.checklists.validation.allItemsNeedLabel'), type: 'error' });
            return;
        }

        setIsSubmitting(true);
        try {
            const body = {
                name: formName.trim(),
                description: formDescription.trim() || null,
                category: formCategory,
                items: formItems,
            };

            const url = editingChecklist
                ? `/api/field/checklists/${editingChecklist.id}`
                : '/api/field/checklists';
            const method = editingChecklist ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (data.success) {
                setToast({
                    message: editingChecklist ? t('field.checklists.updateSuccess') : t('field.checklists.createSuccess'),
                    type: 'success',
                });
                setShowCreateModal(false);
                resetForm();
                fetchChecklists();
            } else {
                setToast({ message: data.error || t('field.checklists.saveFailed'), type: 'error' });
            }
        } catch {
            setToast({ message: t('field.checklists.errorSaving'), type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('field.checklists.confirmDelete'))) return;
        try {
            const res = await fetch(`/api/field/checklists/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setToast({ message: t('field.checklists.deleteSuccess'), type: 'success' });
                fetchChecklists();
            } else {
                setToast({ message: data.error || t('field.checklists.deleteFailed'), type: 'error' });
            }
        } catch {
            setToast({ message: t('field.checklists.errorSaving'), type: 'error' });
        }
    };

    return (
        <div className="space-y-6 p-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${toast.type === 'success'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t('field.checklists.title')}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('field.checklists.subtitle').replace('{total}', String(total))}
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800"
                >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('field.checklists.createTemplate')}</span>
                </button>
            </div>

            {/* Category Filter */}
            <div className="flex gap-1 overflow-x-auto">
                {[{ key: 'ALL', label: t('field.checklists.category.ALL') }, ...Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ key: k, label: v }))].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => { setCategoryFilter(tab.key); setPage(1); }}
                        className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${categoryFilter === tab.key
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder={t('field.checklists.searchPlaceholder')}
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                />
                {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div>
            )}

            {/* Loading */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : checklists.length === 0 ? (
                <EmptyState
                    icon={ClipboardList}
                    title={t('field.checklists.emptyTitle')}
                    description={t('field.checklists.emptyDescription')}
                    actionLabel={t('field.checklists.createTemplate')}
                    onAction={openCreateModal}
                />
            ) : (
                <div className="space-y-3">
                    {checklists.map((cl) => (
                        <div key={cl.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{cl.name}</h3>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[cl.category] || ''}`}>
                                            {CATEGORY_LABELS[cl.category] || cl.category}
                                        </span>
                                        {!cl.isActive && (
                                            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                                                <EyeOff className="h-3 w-3" /> {t('field.checklists.inactive')}
                                            </span>
                                        )}
                                    </div>
                                    {cl.description && (
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{cl.description}</p>
                                    )}
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {cl.items.map((item) => {
                                            const Icon = TYPE_ICONS[item.type] || CheckSquare;
                                            return (
                                                <span key={item.id} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                                    <Icon className="h-3 w-3" />
                                                    {item.label || TYPE_LABELS[item.type]}
                                                </span>
                                            );
                                        })}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                        {t('field.checklists.usageInfo')
                                            .replace('{count}', String(cl.usageCount))
                                            .replace('{items}', String(cl.items.length))}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => openEditModal(cl)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700">
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDelete(cl.id)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4">
                            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                {t('field.checklists.pagination.previous')}
                            </button>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {t('field.checklists.pagination.pageInfo')
                                    .replace('{page}', String(page))
                                    .replace('{totalPages}', String(totalPages))}
                            </span>
                            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                {t('field.checklists.pagination.next')}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
                    <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-t-xl sm:rounded-xl p-6 dark:bg-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editingChecklist ? t('field.checklists.modal.editTitle') : t('field.checklists.modal.createTitle')}
                            </h2>
                            <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <div className="space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">{t('field.checklists.modal.name')}</label>
                                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    placeholder={t('field.checklists.modal.namePlaceholder')} />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">{t('field.checklists.modal.description')}</label>
                                <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={2}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white resize-none"
                                    placeholder={t('field.checklists.modal.descriptionPlaceholder')} />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">{t('field.checklists.modal.category')}</label>
                                <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Items */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                                        {t('field.checklists.modal.items').replace('{count}', String(formItems.length))}
                                    </label>
                                    <button onClick={addItem} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                                        <Plus className="h-3 w-3" /> {t('field.checklists.modal.addItem')}
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {formItems.map((item, index) => {
                                        const Icon = TYPE_ICONS[item.type] || CheckSquare;
                                        return (
                                            <div key={item.id} className="flex items-center gap-2 rounded-lg border border-gray-200 p-2 dark:border-gray-600">
                                                <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                                                <input type="text" value={item.label} onChange={(e) => updateItem(index, 'label', e.target.value)}
                                                    className="flex-1 min-w-0 rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                                    placeholder={t('field.checklists.modal.itemLabelPlaceholder')} />
                                                <select value={item.type} onChange={(e) => updateItem(index, 'type', e.target.value)}
                                                    className="rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                                                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                                                        <option key={k} value={k}>{v}</option>
                                                    ))}
                                                </select>
                                                <button onClick={() => updateItem(index, 'required', !item.required)}
                                                    className={`rounded p-1 ${item.required ? 'text-red-500' : 'text-gray-300'}`}
                                                    title={t('field.checklists.modal.required')}>
                                                    *
                                                </button>
                                                <button onClick={() => removeItem(index)} className="rounded p-1 text-gray-400 hover:text-red-500">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => { setShowCreateModal(false); resetForm(); }}
                                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                    {t('field.checklists.modal.cancel')}
                                </button>
                                <button onClick={handleSubmit} disabled={isSubmitting}
                                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                                    {isSubmitting ? t('field.checklists.modal.saving') : editingChecklist ? t('field.checklists.modal.update') : t('field.checklists.modal.create')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
