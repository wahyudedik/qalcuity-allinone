'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
    Upload,
    FileText,
    CheckCircle,
    AlertCircle,
    Loader2,
    X,
    ChevronDown,
    Clock,
    Download,
    Files,
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

interface ExtractionHistoryItem {
    id: string;
    documentType: string;
    fileName: string;
    mimeType: string;
    fileSize: number | null;
    confidence: number | null;
    method: string;
    sourceType: string | null;
    sourceId: string | null;
    extractedAt: string;
    createdAt: string;
}

interface BatchResultItem {
    fileName: string;
    status: 'success' | 'error';
    data?: ExtractionResult;
    error?: string;
}

interface BatchSummary {
    total: number;
    success: number;
    failed: number;
}

interface DocumentExtractorProps {
    onExtracted?: (result: ExtractionResult) => void;
    onApplyToForm?: (fields: ExtractedField[]) => void;
    className?: string;
}

// ─── Document Type Options ───────────────────────────────────────────────────

// Document type labels use labelKey pattern for i18n
const DOCUMENT_TYPE_KEYS: { value: DocumentType; labelKey: string; descKey: string }[] = [
    { value: 'INVOICE', labelKey: 'ai.extraction.invoice', descKey: 'ai.extraction.invoiceDesc' },
    { value: 'PURCHASE_ORDER', labelKey: 'ai.extraction.purchaseOrder', descKey: 'ai.extraction.purchaseOrderDesc' },
    { value: 'RECEIPT', labelKey: 'ai.extraction.receipt', descKey: 'ai.extraction.receiptDesc' },
    { value: 'KTP', labelKey: 'ai.extraction.ktp', descKey: 'ai.extraction.ktpDesc' },
    { value: 'NPWP', labelKey: 'ai.extraction.npwp', descKey: 'ai.extraction.npwpDesc' },
];

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_BATCH_SIZE = 20;

// ─── Component ───────────────────────────────────────────────────────────────

export function DocumentExtractor({ onExtracted, onApplyToForm, className = '' }: DocumentExtractorProps) {
    const { t } = useTranslation();
    const [dragActive, setDragActive] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
    const [documentType, setDocumentType] = useState<DocumentType>('INVOICE');
    const [isExtracting, setIsExtracting] = useState(false);
    const [result, setResult] = useState<ExtractionResult | null>(null);
    const [batchResults, setBatchResults] = useState<BatchResultItem[] | null>(null);
    const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null);
    const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<ExtractionHistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
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
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch extraction history on mount
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setHistoryLoading(true);
                const response = await fetch('/api/ai/extraction-history?limit=10');
                const data = await response.json();
                if (response.ok && data.success) {
                    setHistory(data.data.history);
                }
            } catch {
                // Silently fail — history is non-critical
            } finally {
                setHistoryLoading(false);
            }
        };
        fetchHistory();
    }, []);

    // Refresh history after successful extraction
    const refreshHistory = useCallback(async () => {
        try {
            const response = await fetch('/api/ai/extraction-history?limit=10');
            const data = await response.json();
            if (response.ok && data.success) {
                setHistory(data.data.history);
            }
        } catch {
            // Silently fail
        }
    }, []);

    const handleLoadHistory = (item: ExtractionHistoryItem) => {
        // Reconstruct ExtractionResult from history item
        const reconstructedResult: ExtractionResult = {
            documentType: item.documentType as DocumentType,
            fields: [], // Fields are stored in DB but not loaded in list view
            confidence: item.confidence || 0,
            extractedAt: item.extractedAt,
            method: item.method as 'ai' | 'regex' | 'fallback',
        };
        setResult(reconstructedResult);
        setBatchResults(null);
        setBatchSummary(null);
        setError(null);
    };

    const validateFile = (file: File): string | null => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            return t('ai.extraction.fileTypeError');
        }
        if (file.size > MAX_FILE_SIZE) {
            return t('ai.extraction.fileTooLarge');
        }
        return null;
    };

    const handleFiles = (files: File[]) => {
        setError(null);
        setResult(null);
        setBatchResults(null);
        setBatchSummary(null);

        const validFiles: File[] = [];
        const errors: string[] = [];

        for (const file of files) {
            const validationError = validateFile(file);
            if (validationError) {
                errors.push(`${file.name}: ${validationError}`);
            } else {
                validFiles.push(file);
            }
        }

        if (errors.length > 0) {
            setError(errors.join('\n'));
        }

        if (validFiles.length === 0) return;

        // Enforce batch size limit
        const totalFiles = selectedFiles.length + validFiles.length;
        if (totalFiles > MAX_BATCH_SIZE) {
            setError(t('ai.extraction.batchTooLarge') || `Maksimal ${MAX_BATCH_SIZE} file per batch`);
            return;
        }

        const newFiles = [...selectedFiles, ...validFiles];
        setSelectedFiles(newFiles);

        // Create previews for images
        const newPreviews = { ...previewUrls };
        for (const file of validFiles) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setPreviewUrls((prev) => ({
                        ...prev,
                        [file.name]: e.target?.result as string,
                    }));
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleRemoveFile = (index: number) => {
        const file = selectedFiles[index];
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
        setPreviewUrls((prev) => {
            const next = { ...prev };
            delete next[file.name];
            return next;
        });
    };

    const handleExtract = async () => {
        if (selectedFiles.length === 0) return;

        setIsExtracting(true);
        setError(null);
        setResult(null);
        setBatchResults(null);
        setBatchSummary(null);

        try {
            if (selectedFiles.length === 1) {
                // ─── Single file mode (backward compatible JSON) ──────
                const file = selectedFiles[0];
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const result = reader.result as string;
                        const base64Data = result.split(',')[1];
                        resolve(base64Data);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                const response = await fetch('/api/ai/extract', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileBase64: base64,
                        fileName: file.name,
                        documentType,
                        mimeType: file.type,
                    }),
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || t('ai.extraction.errorExtract'));
                }

                setResult(data.data);
                onExtracted?.(data.data);
            } else {
                // ─── Batch mode (FormData) ───────────────────────────
                const formData = new FormData();
                for (const file of selectedFiles) {
                    formData.append('files', file);
                }
                formData.append('documentType', documentType);

                setBatchProgress({ current: 0, total: selectedFiles.length });

                const response = await fetch('/api/ai/extract', {
                    method: 'POST',
                    body: formData,
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || t('ai.extraction.errorExtract'));
                }

                setBatchResults(data.results);
                setBatchSummary(data.summary);
                setBatchProgress(null);

                // Notify parent for each successful result
                if (data.results) {
                    for (const item of data.results) {
                        if (item.status === 'success' && item.data) {
                            onExtracted?.(item.data);
                        }
                    }
                }
            }

            refreshHistory();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('ai.extraction.errorGeneric'));
            setBatchProgress(null);
        } finally {
            setIsExtracting(false);
        }
    };

    const handleReset = () => {
        setSelectedFiles([]);
        setPreviewUrls({});
        setResult(null);
        setBatchResults(null);
        setBatchSummary(null);
        setBatchProgress(null);
        setError(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'bg-green-500';
        if (confidence >= 0.5) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const handleDownloadAll = () => {
        if (!batchResults) return;

        const csvRows: string[] = ['File Name,Status,Document Type,Confidence,Method,Error'];

        for (const item of batchResults) {
            const status = item.status;
            const docType = item.data?.documentType || '';
            const confidence = item.data?.confidence ? `${Math.round(item.data.confidence * 100)}%` : '';
            const method = item.data?.method || '';
            const error = item.error || '';

            // Escape CSV fields
            const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
            csvRows.push([
                escapeCsv(item.fileName),
                status,
                docType,
                confidence,
                method,
                escapeCsv(error),
            ].join(','));
        }

        // Add detailed field extraction for successful results
        csvRows.push('');
        csvRows.push('--- Detailed Field Extraction ---');
        csvRows.push('File Name,Field Key,Field Label,Value,Confidence');

        for (const item of batchResults) {
            if (item.status === 'success' && item.data?.fields) {
                for (const field of item.data.fields) {
                    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
                    csvRows.push([
                        escapeCsv(item.fileName),
                        field.key,
                        escapeCsv(field.label),
                        escapeCsv(field.value || ''),
                        `${Math.round(field.confidence * 100)}%`,
                    ].join(','));
                }
            }
        }

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `extraction-results-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const isBatchMode = selectedFiles.length > 1;

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Document Type Selector */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('ai.documentType') || 'Tipe Dokumen'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DOCUMENT_TYPE_KEYS.map((type) => (
                        <button
                            key={type.value}
                            onClick={() => setDocumentType(type.value)}
                            className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-sm transition ${documentType === type.value
                                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800'
                                }`}
                        >
                            <FileText className="h-5 w-5" />
                            <span className="font-medium text-center">{t(type.labelKey)}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Upload Area */}
            {selectedFiles.length === 0 ? (
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
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
                        {t('ai.extraction.fileSizeHint')} • {t('ai.extraction.batchHint') || `Maksimal ${MAX_BATCH_SIZE} file`}
                    </p>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/png,image/jpeg,application/pdf"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                handleFiles(Array.from(e.target.files));
                            }
                        }}
                    />
                </div>
            ) : (
                /* File List Preview */
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {selectedFiles.length} {t('common.filesSelected')}
                            {isBatchMode && (
                                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                                    ({t('common.batchMode')})
                                </span>
                            )}
                        </p>
                        <button
                            onClick={handleReset}
                            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                            {t('common.clear') || 'Hapus Semua'}
                        </button>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-2 rounded-lg border border-gray-200 dark:border-gray-700 p-2">
                        {selectedFiles.map((file, idx) => (
                            <div
                                key={`${file.name}-${idx}`}
                                className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800"
                            >
                                {previewUrls[file.name] ? (
                                    <img
                                        src={previewUrls[file.name]}
                                        alt={t('common.preview')}
                                        className="h-10 w-10 rounded object-cover"
                                    />
                                ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-200 dark:bg-gray-700">
                                        <FileText className="h-5 w-5 text-gray-400" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {(file.size / 1024).toFixed(1)} KB • {file.type}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleRemoveFile(idx)}
                                    className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add more files button */}
                    <button
                        onClick={() => inputRef.current?.click()}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        <Upload className="h-4 w-4" />
                        {t('ai.extraction.addMoreFiles') || 'Tambah File Lainnya'}
                    </button>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/png,image/jpeg,application/pdf"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                handleFiles(Array.from(e.target.files));
                            }
                        }}
                    />
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <pre className="whitespace-pre-wrap text-xs">{error}</pre>
                </div>
            )}

            {/* Extract Button */}
            {selectedFiles.length > 0 && !result && !batchResults && (
                <button
                    onClick={handleExtract}
                    disabled={isExtracting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isExtracting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {batchProgress
                                ? `${t('ai.extraction.extracting')} (${batchProgress.current}/${batchProgress.total})`
                                : t('ai.extraction.extracting')
                            }
                        </>
                    ) : (
                        <>
                            {isBatchMode ? <Files className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                            {isBatchMode
                                ? `${t('ai.extraction.extractData') || 'Ekstrak Data'} (${selectedFiles.length} file)`
                                : t('ai.extraction.extractData')
                            }
                        </>
                    )}
                </button>
            )}

            {/* Batch Progress Indicator */}
            {batchProgress && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">
                            {t('ai.extraction.processing') || 'Memproses...'}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                            {batchProgress.current}/{batchProgress.total}
                        </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                            className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Single Extraction Result */}
            {result && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {t('ai.extraction.results')}
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
                                {result.method === 'ai' ? t('ai.aiVision') : result.method === 'regex' ? t('ai.regexBased') : t('ai.fallback')}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {Math.round(result.confidence * 100)}% {t('ai.extraction.accuracy')}
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
                                            <span className="italic text-gray-400">{t('ai.extraction.notFound')}</span>
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

            {/* Batch Results */}
            {batchResults && batchSummary && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {t('ai.extraction.batchResults') || 'Hasil Batch'} ({batchSummary.total} file)
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle className="h-3 w-3" />
                                {batchSummary.success}
                            </span>
                            {batchSummary.failed > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                    <AlertCircle className="h-3 w-3" />
                                    {batchSummary.failed}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Batch Results Table */}
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="max-h-64 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {t('ai.extraction.fileName') || 'File'}
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {t('ai.extraction.status') || 'Status'}
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {t('ai.extraction.accuracy') || 'Akurasi'}
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {t('ai.extraction.method') || 'Metode'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {batchResults.map((item, idx) => (
                                        <tr
                                            key={`${item.fileName}-${idx}`}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                        >
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                                                    <span className="truncate text-sm text-gray-900 dark:text-gray-100 max-w-[200px]">
                                                        {item.fileName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                {item.status === 'success' ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                        <CheckCircle className="h-3 w-3" />
                                                        {t('ai.extraction.success') || 'Berhasil'}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400" title={item.error}>
                                                        <AlertCircle className="h-3 w-3" />
                                                        {t('ai.extraction.failed') || 'Gagal'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2">
                                                {item.data?.confidence != null ? (
                                                    <span className="text-xs text-gray-700 dark:text-gray-300">
                                                        {Math.round(item.data.confidence * 100)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2">
                                                {item.data?.method ? (
                                                    <span className={`text-xs font-medium ${item.data.method === 'ai'
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : item.data.method === 'regex'
                                                            ? 'text-yellow-600 dark:text-yellow-400'
                                                            : 'text-gray-500 dark:text-gray-400'
                                                        }`}>
                                                        {item.data.method === 'ai' ? 'AI' : item.data.method === 'regex' ? 'Regex' : 'Fallback'}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Batch Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleDownloadAll}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                        >
                            <Download className="h-4 w-4" />
                            {t('ai.extraction.downloadAll') || 'Download Semua (CSV)'}
                        </button>
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

            {/* Extraction History */}
            <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {t('ai.extraction.history')}
                    </h3>
                </div>

                {historyLoading ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{t('ai.extraction.loadingHistory')}</span>
                    </div>
                ) : history.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 py-4 text-center">
                        {t('ai.extraction.noHistory')}
                    </p>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {history.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleLoadHistory(item)}
                                className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {item.fileName}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {(() => { const found = DOCUMENT_TYPE_KEYS.find((d) => d.value === item.documentType); return found ? t(found.labelKey) : item.documentType; })()}
                                        </span>
                                        <span className="text-xs text-gray-400">•</span>
                                        <span className={`text-xs font-medium ${item.method === 'ai'
                                            ? 'text-green-600 dark:text-green-400'
                                            : item.method === 'regex'
                                                ? 'text-yellow-600 dark:text-yellow-400'
                                                : 'text-gray-500 dark:text-gray-400'
                                            }`}>
                                            {item.method === 'ai' ? 'AI' : item.method === 'regex' ? 'Regex' : 'Fallback'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 ml-2">
                                    {item.confidence != null && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {Math.round(item.confidence * 100)}%
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        {new Date(item.extractedAt).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
