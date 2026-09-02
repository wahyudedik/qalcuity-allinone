'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Check, AlertCircle, FileText, Download } from 'lucide-react'
import { Modal } from '@/components/ui/modal'

interface ImportError {
    row: number
    field?: string
    message: string
}

interface ImportResult {
    imported: number
    errors: number
    totalRows: number
    errorDetails: ImportError[]
}

interface ImportModalProps {
    isOpen: boolean
    onClose: () => void
    /** 'contacts' | 'leads' */
    type: 'contacts' | 'leads'
    /** Called after successful import so parent can refresh data */
    onImportComplete?: () => void
}

type Step = 'upload' | 'importing' | 'result'

export function ImportModal({ isOpen, onClose, type, onImportComplete }: ImportModalProps) {
    const [step, setStep] = useState<Step>('upload')
    const [file, setFile] = useState<File | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const [importResult, setImportResult] = useState<ImportResult | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const reset = useCallback(() => {
        setStep('upload')
        setFile(null)
        setImportResult(null)
        setErrorMessage(null)
        setDragActive(false)
    }, [])

    const handleClose = useCallback(() => {
        reset()
        onClose()
    }, [reset, onClose])

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0])
        }
    }, [])

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0])
        }
    }, [])

    const validateAndSetFile = (f: File) => {
        setErrorMessage(null)

        // Validate file type
        const name = f.name.toLowerCase()
        const isCsv = name.endsWith('.csv')
        const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls')
        if (!isCsv && !isExcel) {
            setErrorMessage('Format file tidak didukung. Gunakan .csv, .xlsx, atau .xls')
            return
        }

        // Validate file size (5MB)
        if (f.size > 5 * 1024 * 1024) {
            setErrorMessage('Ukuran file maksimal 5MB')
            return
        }

        setFile(f)
    }

    const handleImport = async () => {
        if (!file) return

        setStep('importing')
        setErrorMessage(null)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const endpoint = type === 'contacts'
                ? '/api/crm/contacts/import'
                : '/api/crm/leads/import'

            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
            })

            const result = await response.json()

            if (result.success && result.data) {
                setImportResult(result.data)
                setStep('result')
                onImportComplete?.()
            } else {
                setErrorMessage(result.error || 'Gagal mengimport data')
                setStep('upload')
            }
        } catch {
            setErrorMessage('Terjadi kesalahan saat mengupload file')
            setStep('upload')
        }
    }

    const handleDownloadTemplate = () => {
        let csvContent = ''
        if (type === 'contacts') {
            csvContent = 'name,email,phone,company,address,notes,type\n'
            csvContent += '"John Doe","john@example.com","08123456789","PT Maju Jaya","Jl. Sudah Sejahtera No 1","Pelanggan setia","CUSTOMER"\n'
            csvContent += '"Jane Smith","jane@example.com","08567890123","CV Berkah","Jl. Damai Sentosa No 5","","SUPPLIER"\n'
        } else {
            csvContent = 'name,email,phone,company,source,value,notes,status\n'
            csvContent += '"Ahmad Rizki","ahmad@example.com","08123456789","PT Maju Jaya","Website","5000000","Prospek dari landing page","NEW"\n'
            csvContent += '"Siti Nurhaliza","siti@example.com","08567890123","CV Berkah","Referral","10000000","","CONTACTED"\n'
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `template-import-${type}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const title = type === 'contacts' ? 'Import Kontak' : 'Import Leads'

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={title} size="lg">
            {/* Step: Upload */}
            {step === 'upload' && (
                <div className="space-y-4">
                    {/* Download template */}
                    <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-blue-800">Belum punya file template?</span>
                        </div>
                        <button
                            onClick={handleDownloadTemplate}
                            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                            <Download className="h-3 w-3" />
                            Download Template
                        </button>
                    </div>

                    {/* Drop zone */}
                    <div
                        className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${dragActive
                                ? 'border-blue-500 bg-blue-50'
                                : file
                                    ? 'border-green-400 bg-green-50'
                                    : 'border-gray-300 hover:border-gray-400'
                            }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        {file ? (
                            <div className="space-y-2">
                                <Check className="mx-auto h-10 w-10 text-green-500" />
                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                    {(file.size / 1024).toFixed(1)} KB
                                </p>
                                <button
                                    onClick={() => {
                                        setFile(null)
                                        setErrorMessage(null)
                                        if (fileInputRef.current) fileInputRef.current.value = ''
                                    }}
                                    className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
                                >
                                    <X className="h-3 w-3" />
                                    Hapus file
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Upload className="mx-auto h-10 w-10 text-gray-400" />
                                <p className="text-sm text-gray-600">
                                    Drag & drop file CSV atau Excel di sini
                                </p>
                                <p className="text-xs text-gray-400">Format: .csv, .xlsx, .xls (maks. 5MB)</p>
                                <label
                                    htmlFor={`import-file-${type}`}
                                    className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                >
                                    <Upload className="h-4 w-4" />
                                    Pilih File
                                </label>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            id={`import-file-${type}`}
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Error message */}
                    {errorMessage && (
                        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3">
                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                            <p className="text-sm text-red-700">{errorMessage}</p>
                        </div>
                    )}

                    {/* Column mapping info */}
                    <div className="rounded-lg border border-gray-200 p-4">
                        <p className="mb-2 text-sm font-medium text-gray-700">Kolom yang didukung:</p>
                        <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                            {type === 'contacts' ? (
                                <>
                                    <span><strong>name</strong> / nama (wajib)</span>
                                    <span>email</span>
                                    <span>phone / telepon</span>
                                    <span>company / perusahaan</span>
                                    <span>address / alamat</span>
                                    <span>notes / catatan</span>
                                    <span>type / tipe</span>
                                </>
                            ) : (
                                <>
                                    <span><strong>name</strong> / nama (wajib)</span>
                                    <span>email</span>
                                    <span>phone / telepon</span>
                                    <span>company / perusahaan</span>
                                    <span>source / sumber</span>
                                    <span>value / nilai</span>
                                    <span>notes / catatan</span>
                                    <span>status</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                        <button
                            onClick={handleClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={!file}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Import Sekarang
                        </button>
                    </div>
                </div>
            )}

            {/* Step: Importing */}
            {step === 'importing' && (
                <div className="space-y-4 py-8 text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                    <p className="text-sm text-gray-600">Sedang memproses import...</p>
                    <p className="text-xs text-gray-400">Mohon tunggu, jangan tutup halaman ini</p>
                </div>
            )}

            {/* Step: Result */}
            {step === 'result' && importResult && (
                <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="rounded-lg border border-gray-200 p-4 text-center">
                            <p className="text-2xl font-bold text-gray-900">{importResult.totalRows}</p>
                            <p className="text-xs text-gray-500">Total Baris</p>
                        </div>
                        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                            <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
                            <p className="text-xs text-green-600">Berhasil</p>
                        </div>
                        <div className={`rounded-lg border p-4 text-center ${importResult.errors > 0
                                ? 'border-red-200 bg-red-50'
                                : 'border-gray-200'
                            }`}>
                            <p className={`text-2xl font-bold ${importResult.errors > 0 ? 'text-red-600' : 'text-gray-900'
                                }`}>{importResult.errors}</p>
                            <p className={`text-xs ${importResult.errors > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                Gagal
                            </p>
                        </div>
                    </div>

                    {/* Success message */}
                    {importResult.imported > 0 && importResult.errors === 0 && (
                        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3">
                            <Check className="h-4 w-4 text-green-500" />
                            <p className="text-sm text-green-700">
                                Semua {importResult.imported} data berhasil diimport!
                            </p>
                        </div>
                    )}

                    {importResult.imported > 0 && importResult.errors > 0 && (
                        <div className="flex items-center gap-2 rounded-lg bg-yellow-50 p-3">
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                            <p className="text-sm text-yellow-700">
                                {importResult.imported} data berhasil, {importResult.errors} data gagal.
                            </p>
                        </div>
                    )}

                    {/* Error details */}
                    {importResult.errorDetails.length > 0 && (
                        <div className="max-h-48 overflow-y-auto rounded-lg border border-red-200">
                            <div className="sticky top-0 bg-red-50 px-4 py-2 text-xs font-medium text-red-700">
                                Detail Error:
                            </div>
                            <div className="divide-y divide-red-100">
                                {importResult.errorDetails.map((err, idx) => (
                                    <div key={idx} className="px-4 py-2 text-xs text-red-600">
                                        <span className="font-medium">Baris {err.row}</span>
                                        {err.field && <span className="text-red-400"> ({err.field})</span>}
                                        : {err.message}
                                    </div>
                                ))}
                            </div>
                            {importResult.errorDetails.length >= 50 && (
                                <div className="px-4 py-2 text-xs text-gray-500">
                                    ...dan {importResult.errors - 50} error lainnya
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                        <button
                            onClick={handleClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            Tutup
                        </button>
                        {importResult.errors > 0 && (
                            <button
                                onClick={reset}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                            >
                                Import Lagi
                            </button>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    )
}
