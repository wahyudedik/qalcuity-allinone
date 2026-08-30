'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, File, Image, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface FileUploadProps {
    accept?: string;
    maxSize?: number; // in MB
    onUpload?: (file: File) => void;
    onRemove?: () => void;
    disabled?: boolean;
    className?: string;
}

export function FileUpload({
    accept = '*',
    maxSize = 10,
    onUpload,
    onRemove,
    disabled = false,
    className = '',
}: FileUploadProps) {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, [disabled]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (disabled) return;

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, [disabled]);

    const validateFile = (file: File): boolean => {
        if (file.size > maxSize * 1024 * 1024) {
            setErrorMessage(`Ukuran file maksimal ${maxSize}MB. File Anda: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
            return false;
        }

        if (accept !== '*') {
            const acceptedTypes = accept.split(',').map(t => t.trim());
            const fileType = file.type;
            const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

            const isAccepted = acceptedTypes.some(type => {
                if (type.startsWith('.')) {
                    return fileExtension === type.toLowerCase();
                }
                if (type.endsWith('/*')) {
                    return fileType.startsWith(type.replace('/*', '/'));
                }
                return fileType === type;
            });

            if (!isAccepted) {
                setErrorMessage(`Tipe file tidak didukung. Format yang diterima: ${accept}`);
                return false;
            }
        }

        setErrorMessage('');
        return true;
    };

    const handleFile = (file: File) => {
        if (!validateFile(file)) {
            setUploadStatus('error');
            return;
        }

        setSelectedFile(file);
        setUploadStatus('uploading');

        // Simulate upload delay
        setTimeout(() => {
            setUploadStatus('success');
            onUpload?.(file);
        }, 500);
    };

    const handleRemove = () => {
        setSelectedFile(null);
        setUploadStatus('idle');
        setErrorMessage('');
        onRemove?.();
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const getFileIcon = () => {
        if (!selectedFile) return <Upload className="h-8 w-8 text-gray-400" />;
        if (selectedFile.type.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />;
        if (selectedFile.type.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
        return <File className="h-8 w-8 text-gray-500" />;
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    return (
        <div className={`space-y-2 ${className}`}>
            <div
                className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${disabled
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                        : dragActive
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : selectedFile && uploadStatus === 'success'
                                ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                                : selectedFile && uploadStatus === 'error'
                                    ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                                    : 'border-gray-300 hover:border-gray-400 cursor-pointer'
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !disabled && !selectedFile && inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    className="hidden"
                    disabled={disabled}
                />

                {selectedFile ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-center gap-3">
                            {getFileIcon()}
                            <div className="text-left">
                                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                    {selectedFile.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {formatFileSize(selectedFile.size)}
                                </p>
                            </div>
                        </div>

                        {uploadStatus === 'uploading' && (
                            <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                <span>Mengunggah...</span>
                            </div>
                        )}

                        {uploadStatus === 'success' && (
                            <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span>File siap digunakan</span>
                            </div>
                        )}

                        {uploadStatus === 'error' && (
                            <div className="flex items-center justify-center gap-2 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                <span>Gagal mengunggah</span>
                            </div>
                        )}

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRemove();
                            }}
                            className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 transition-colors"
                        >
                            <X className="h-4 w-4" />
                            Hapus
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {getFileIcon()}
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Drag & drop file di sini, atau{' '}
                            <span className="text-blue-600 font-medium">pilih file</span>
                        </p>
                        <p className="text-xs text-gray-500">
                            {accept !== '*' ? `Format: ${accept} — ` : ''}Maksimal {maxSize}MB
                        </p>
                    </div>
                )}
            </div>

            {errorMessage && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}
        </div>
    );
}
