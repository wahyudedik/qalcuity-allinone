// ============================================
// @qalcuity/ui — Spinner Component
// Loading indicator with multiple sizes
// ============================================

import React from 'react';

// --------------------------------------------
// Types
// --------------------------------------------

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
    /** Spinner size */
    size?: SpinnerSize;
    /** Additional CSS classes */
    className?: string;
    /** Accessible label */
    label?: string;
}

// --------------------------------------------
// Size Styles
// --------------------------------------------

const sizeStyles: Record<SpinnerSize, string> = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
};

const strokeWidths: Record<SpinnerSize, number> = {
    sm: 3,
    md: 3.5,
    lg: 4,
};

// --------------------------------------------
// Spinner Component
// --------------------------------------------

export function Spinner({ size = 'md', className = '', label = 'Loading...' }: SpinnerProps) {
    return (
        <div className={`inline-flex items-center justify-center ${className}`} role="status" aria-label={label}>
            <svg
                className={`animate-spin text-blue-600 ${sizeStyles[size]}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
            >
                <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth={strokeWidths[size]}
                />
                <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
            </svg>
        </div>
    );
}

export default Spinner;
