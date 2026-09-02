// ============================================
// @qalcuity/ui — Modal Component
// Accessible modal dialog with backdrop
// ============================================

'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// --------------------------------------------
// Types
// --------------------------------------------

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
    /** Modal state */
    isOpen: boolean;
    /** Close handler */
    onClose: () => void;
    /** Modal title */
    title: string;
    /** Modal size */
    size?: ModalSize;
    /** Modal content */
    children: React.ReactNode;
}

// --------------------------------------------
// Size Styles
// --------------------------------------------

const sizeStyles: Record<ModalSize, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
};

// --------------------------------------------
// Modal Component
// --------------------------------------------

export function Modal({
    isOpen,
    onClose,
    title,
    size = 'md',
    children,
}: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => {
                if (e.target === overlayRef.current) onClose();
            }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className={`relative w-full ${sizeStyles[size]} max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl`}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
                    <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

export default Modal;
