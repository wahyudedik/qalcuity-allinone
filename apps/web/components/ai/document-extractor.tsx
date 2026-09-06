'use client';

import { useState, useRef, useCallback } from 'react';
import {
    Upload,
    FileText,
    CheckCircle,
    AlertCircle,
    Loader2,
    X,
    ChevronDown,
    type LucideIcon,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

// ─── Types ───────────────────────────────────────────────────────────────────

type DocumentType = 'INVOICE' | 'PURCHASE_ORDER' | 'RECEIPT' | 'KTP' | 'NPWP';

interface ExtractedField {
    key: string;
    label: string;
    value: string;
    confidence: number;
}

interface ExtractionResult {
    documentType: DocumentType;
    fields: ExtractedField[];
    confidence: number;
    extractedAt: string;
    method: 'ai' | 'regex' | 'fallback';
}

interface DocumentExtractorProps {
    onExtracted?: (result: ExtractionResult) => void;
    onApplyToForm?: (fields: ExtractedField[]) => void;
    className?: string;
}

// ─── Document Type Options ───────────────────────────────────────────────────

const DOCUMENT_TYPES: { value: DocumentType; label: string; description: string }[] = [
    { value: 'INVOICE', label: 'Invoice / Faktur', description: 'Ekstrak data dari invoice penjualan' },
    { value: 'PURCHASE_ORDER', label: 'Purchase Order (PO)', description: 'Ekstrak data dari PO pembelian' },
    { value: 'RECEIPT', label: 'Receipt / Struk', description: 'Ekstrak data dari struk pembelian' },
    { value: 'KTP', label: 'KTP', description: 'Ekstrak data dari Kartu Tanda Penduduk' },
    { value: 'NPWP', label: 'NPWP', description: 'Ekstrak data dari Nomor Pokok Wajib Pajak' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function DocumentExtractor({ onExtracted, onApplyToForm, className = '' }: DocumentExtractorProps) {
    const { t } = useTranslation();
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [documentType, setDocumentType] = useState<DocumentType>('INVOICE');
    const [isExtracting, setIsExtracting] = useState(false);
    const [result, setResult] = useState<ExtractionResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFile = (file: File) => {
        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            setError('Tipe file tidak didukung. Gunakan PNG, JPEG, atau PDF.');
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('File terlalu besar. Maksimal 10MB.');
            return;
        }

        setSelectedFile(file);
        setError(null);
        setResult(null);

        // Create preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setPreviewUrl(e.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setPreviewUrl(null);
        }
    };

    const handleExtract = async () => {
        if (!selectedFile) return;

        setIsExtracting(true);
        setError(null);
        setResult(null);

        try {
            // Convert file to base64
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = reader.result as string;
                    // Remove data URL prefix
                    const base64Data = result.split(',')[1];
                    resolve(base64Data);
                };
                reader.onerror = reject;
                reader.readAsDataURL(selectedFile);
            });

            const response = await fetch('/api/ai/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileBase64: base64,
                    fileName: selectedFile.name,
                    documentType,
                    mimeType: selectedFile.type,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Gagal mengekstrak dokumen');
            }

            setResult(data.data);
            onExtracted?.(data.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat ekstraksi');
        } finally {
            setIsExtracting(false);
        }
    };

    const handleReset = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setResult(null);
        setError(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'bg-green-500';
        if (confidence >= 0.5) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Document Type Selector */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('ai.documentType') || 'Tipe Dokumen'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DOCUMENT_TYPES.map((type) => (
                        <button
                            key={type.value}
                            onClick={() => setDocumentType(type.value)}
                            className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-sm transition ${documentType === type.value
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800'
                                }`}
                        >
                            <FileText className="h-5 w-5" />
                            <span className="font-medium text-center">{type.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Upload Area */}
            {!selectedFile ? (
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition ${dragActive
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
                        }`}
                >
                    <Upload className="mb-3 h-10 w-10 text-gray-400" />
                    <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('ai.dragDrop') || 'Drag & drop file atau klik untuk browse'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        PNG, JPEG, PDF — Maksimal 10MB
                    </p>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/png,image/jpeg,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files?.[0]) handleFile(e.target.files[0]);
                        }}
                    />
                </div>
            ) : (
                /* File Preview */
                <div className="relative rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                    <button
                        onClick={handleReset}
                        className="absolute right-2 top-2 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div className="flex items-start gap-4">
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="h-24 w-24 rounded object-cover"
                            />
                        ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded bg-gray-200 dark:bg-gray-700">
                                <FileText className="h-8 w-8 text-gray-400" />
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                {selectedFile.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type}
                            </p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Tipe: {DOCUMENT_TYPES.find((d) => d.value === documentType)?.label}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Extract Button */}
            {selectedFile && !result && (
                <button
                    onClick={handleExtract}
                    disabled={isExtracting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isExtracting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Mengekstrak data...
                        </>
                    ) : (
                        <>
                            <FileText className="h-4 w-4" />
                            Ekstrak Data
                        </>
                    )}
                </button>
            )}

            {/* Extraction Results */}
            {result && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Hasil Ekstraksi
                        </h3>
                        <div className="flex items-center gap-2">
                            <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${result.method === 'ai'
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : result.method === 'regex'
                                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                    }`}
                            >
                                {result.method === 'ai' ? 'AI Vision' : result.method === 'regex' ? 'Regex' : 'Fallback'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {Math.round(result.confidence * 100)}% akurasi
                            </span>
                        </div>
                    </div>

                    {/* Fields */}
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                        {result.fields.map((field, idx) => (
                            <div
                                key={field.key}
                                className={`flex items-center justify-between gap-4 px-4 py-3 ${idx > 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''
                                    }`}
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {field.label}
                                    </p>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                                        {field.value || (
                                            <span className="italic text-gray-400">Tidak ditemukan</span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="h-1.5 w-16 rounded-full bg-gray-200 dark:bg-gray-700">
                                        <div
                                            className={`h-full rounded-full ${getConfidenceColor(field.confidence)}`}
                                            style={{ width: `${field.confidence * 100}%` }}
                                        />
                                    </div>
                                    <span className="w-8 text-right text-xs text-gray-500">
                                        {Math.round(field.confidence * 100)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        {onApplyToForm && (
                            <button
                                onClick={() => onApplyToForm(result.fields)}
                                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                            >
                                <CheckCircle className="h-4 w-4" />
                                {t('ai.applyToForm') || 'Terapkan ke Form'}
                            </button>
                        )}
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                            <Upload className="h-4 w-4" />
                            {t('ai.extractAnother') || 'Ekstrak Lainnya'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
