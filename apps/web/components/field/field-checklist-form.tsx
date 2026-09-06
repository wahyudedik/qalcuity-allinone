'use client';

/**
 * FieldChecklistForm — Mobile-first checklist form untuk technician di lapangan.
 * Mendukung berbagai tipe input: checkbox, text, number, photo, signature.
 * Dirancang untuk digunakan di mobile device di field.
 */

import { useState } from 'react';
import {
    CheckSquare,
    Square,
    Camera,
    PenLine,
    Hash,
    Type,
    Send,
    AlertCircle,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

// =============================================================================
// Types
// =============================================================================

export interface ChecklistItem {
    id: string;
    label: string;
    type: 'CHECKBOX' | 'TEXT' | 'NUMBER' | 'PHOTO' | 'SIGNATURE';
    required?: boolean;
}

export interface ChecklistAnswer {
    itemId: string;
    value: string | boolean | number;
    notes?: string;
}

interface FieldChecklistFormProps {
    checklistId: string;
    checklistName: string;
    items: ChecklistItem[];
    onSubmit: (data: {
        checklistId: string;
        answers: ChecklistAnswer[];
        notes?: string;
        photos?: string;
    }) => Promise<void>;
    onCancel?: () => void;
}

// =============================================================================
// Sub-components
// =============================================================================

function ChecklistItemInput({
    item,
    value,
    onChange,
    t,
}: {
    item: ChecklistItem;
    value: ChecklistAnswer | undefined;
    onChange: (itemId: string, val: string | boolean | number) => void;
    t: (key: string) => string;
}) {
    switch (item.type) {
        case 'CHECKBOX':
            return (
                <button
                    type="button"
                    onClick={() => onChange(item.id, !(value?.value ?? false))}
                    className="flex items-center gap-3 w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors dark:border-gray-600 dark:hover:bg-gray-700 dark:active:bg-gray-600"
                >
                    {value?.value ? (
                        <CheckSquare className="h-6 w-6 text-green-500 shrink-0" />
                    ) : (
                        <Square className="h-6 w-6 text-gray-300 dark:text-gray-600 shrink-0" />
                    )}
                    <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                        {item.label}
                        {item.required && <span className="text-red-500 ml-1">*</span>}
                    </span>
                </button>
            );

        case 'TEXT':
            return (
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                        {item.label}
                        {item.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <textarea
                        value={(value?.value as string) || ''}
                        onChange={(e) => onChange(item.id, e.target.value)}
                        placeholder={t('field.components.checklistForm.textInputPlaceholder')}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 resize-none"
                    />
                </div>
            );

        case 'NUMBER':
            return (
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                        {item.label}
                        {item.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="number"
                            value={(value?.value as string) || ''}
                            onChange={(e) => onChange(item.id, e.target.value ? Number(e.target.value) : '')}
                            placeholder="0"
                            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                        />
                    </div>
                </div>
            );

        case 'PHOTO':
            return (
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                        {item.label}
                        {item.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <label className="flex items-center justify-center gap-2 w-full h-24 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors dark:border-gray-600 dark:bg-gray-700 dark:hover:border-blue-500">
                        <Camera className="h-6 w-6 text-gray-400" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {value?.value ? t('field.components.checklistForm.photoSelected') : t('field.components.checklistForm.photoTap')}
                        </span>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    // In production, upload to server and get URL
                                    onChange(item.id, file.name);
                                }
                            }}
                        />
                    </label>
                </div>
            );

        case 'SIGNATURE':
            return (
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                        {item.label}
                        {item.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <div className="flex items-center gap-2">
                        <PenLine className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {value?.value ? t('field.components.checklistForm.signatureGiven') : t('field.components.checklistForm.signaturePending')}
                        </span>
                    </div>
                </div>
            );

        default:
            return null;
    }
}

// =============================================================================
// Main Component
// =============================================================================

export function FieldChecklistForm({
    checklistId,
    checklistName,
    items,
    onSubmit,
    onCancel,
}: FieldChecklistFormProps) {
    const { t } = useTranslation();
    const [answers, setAnswers] = useState<Record<string, ChecklistAnswer>>({});
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAnswerChange = (itemId: string, value: string | boolean | number) => {
        setAnswers((prev) => ({
            ...prev,
            [itemId]: { itemId, value, notes: prev[itemId]?.notes },
        }));
    };

    const validate = (): boolean => {
        for (const item of items) {
            if (item.required) {
                const answer = answers[item.id];
                if (!answer || answer.value === '' || answer.value === false || answer.value === undefined) {
                    setError(t('field.components.checklistForm.itemRequired').replace('{label}', item.label));
                    return false;
                }
            }
        }
        setError(null);
        return true;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const answersArray = Object.values(answers);
            await onSubmit({
                checklistId,
                answers: answersArray,
                notes: notes.trim() || undefined,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : t('field.components.checklistForm.errorSaving'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const completedCount = Object.values(answers).filter(
        (a) => a.value !== '' && a.value !== false && a.value !== undefined
    ).length;
    const requiredCount = items.filter((i) => i.required).length;
    const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    {checklistName}
                </h3>
                <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-blue-200 dark:bg-blue-800">
                        <div
                            className="h-2 rounded-full bg-blue-600 transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        {completedCount}/{items.length}
                    </span>
                </div>
                {requiredCount > 0 && (
                    <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                        {requiredCount} {t('field.components.checklistForm.requiredItems')}
                    </p>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Checklist Items */}
            <div className="space-y-3">
                {items.map((item, index) => (
                    <div key={item.id} className="relative">
                        <div className="absolute -left-1 top-4 h-5 w-5 rounded-full bg-gray-100 text-xs font-medium text-gray-500 flex items-center justify-center dark:bg-gray-700 dark:text-gray-400">
                            {index + 1}
                        </div>
                        <div className="ml-4">
                            <ChecklistItemInput
                                item={item}
                                value={answers[item.id]}
                                onChange={handleAnswerChange}
                                t={t}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Notes */}
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    {t('field.components.checklistForm.additionalNotes')}
                </label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('field.components.checklistForm.notesPlaceholder')}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 resize-none"
                />
            </div>

            {/* Actions — Mobile-first: full-width buttons */}
            <div className="flex flex-col gap-2 sm:flex-row">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                        {t('field.components.checklistForm.cancel')}
                    </button>
                )}
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send className="h-4 w-4" />
                    {isSubmitting ? t('field.components.checklistForm.saving') : t('field.components.checklistForm.submitChecklist')}
                </button>
            </div>
        </div>
    );
}
