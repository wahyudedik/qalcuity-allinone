'use client';

import { useState } from 'react';
import { FileText, Clock, Filter } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { DocumentExtractor } from '@/components/ai/document-extractor';

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

interface ExtractionHistory {
    id: string;
    fileName: string;
    documentType: DocumentType;
    confidence: number;
    method: string;
    extractedAt: string;
    fieldCount: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DocumentExtractionPage() {
    const { t } = useTranslation();
    const [history, setHistory] = useState<ExtractionHistory[]>([]);
    const [filterType, setFilterType] = useState<DocumentType | 'ALL'>('ALL');

    const handleExtracted = (result: ExtractionResult) => {
        // Add to history
        const newEntry: ExtractionHistory = {
            id: `ext-${Date.now()}`,
            fileName: `Dokumen ${result.documentType}`,
            documentType: result.documentType,
            confidence: result.confidence,
            method: result.method,
            extractedAt: result.extractedAt,
            fieldCount: result.fields.filter((f) => f.value).length,
        };
        setHistory((prev) => [newEntry, ...prev]);
    };

    const filteredHistory = filterType === 'ALL'
        ? history
        : history.filter((h) => h.documentType === filterType);

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Extractor */}
            <div className="lg:col-span-2">
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {t('ai.extractDocument') || 'Ekstraksi Dokumen'}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Upload dokumen untuk mengekstrak data secara otomatis
                            </p>
                        </div>
                    </div>

                    <DocumentExtractor
                        onExtracted={handleExtracted}
                        onApplyToForm={(fields) => {
                            // Copy fields to clipboard as formatted text
                            const text = fields
                                .filter((f) => f.value)
                                .map((f) => `${f.label}: ${f.value}`)
                                .join('\n');
                            navigator.clipboard.writeText(text);
                        }}
                    />
                </div>
            </div>

            {/* Extraction History Sidebar */}
            <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {t('ai.recentExtractions') || 'Ekstraksi Terakhir'}
                            </h3>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {history.length} dokumen
                        </span>
                    </div>

                    {/* Filter */}
                    <div className="mb-3 flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 text-gray-400" />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as DocumentType | 'ALL')}
                            className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        >
                            <option value="ALL">Semua Tipe</option>
                            <option value="INVOICE">Invoice</option>
                            <option value="PURCHASE_ORDER">Purchase Order</option>
                            <option value="RECEIPT">Receipt</option>
                            <option value="KTP">KTP</option>
                            <option value="NPWP">NPWP</option>
                        </select>
                    </div>

                    {/* History List */}
                    {filteredHistory.length === 0 ? (
                        <div className="py-8 text-center">
                            <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t('ai.noExtractions') || 'Belum ada ekstraksi'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredHistory.map((item) => (
                                <div
                                    key={item.id}
                                    className="rounded-lg border border-gray-100 p-3 dark:border-gray-700"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                            {item.documentType.replace('_', ' ')}
                                        </span>
                                        <span
                                            className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${item.method === 'ai'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                }`}
                                        >
                                            {item.method.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between">
                                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                            {item.fieldCount} field terisi
                                        </span>
                                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                            {Math.round(item.confidence * 100)}%
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                                        {new Date(item.extractedAt).toLocaleString('id-ID')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
