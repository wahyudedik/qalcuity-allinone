// ============================================
// @qalcuity/ui — Button Component
// Reusable button with variants, sizes, and icons
// ============================================

import React from 'react';

// --------------------------------------------
// Types
// --------------------------------------------

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Button variant */
    variant?: ButtonVariant;
    /** Button size */
    size?: ButtonSize;
    /** Loading state with spinner */
    loading?: boolean;
    /** Icon before text */
    leftIcon?: React.ReactNode;
    /** Icon after text */
    rightIcon?: React.ReactNode;
}

// --------------------------------------------
// Variant Styles
// --------------------------------------------

const variantStyles: Record<ButtonVariant, string> = {
    primary:
        'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-blue-500',
    secondary:
        'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 focus-visible:ring-gray-400',
    danger:
        'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500',
    ghost:
        'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-400',
    outline:
        'border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-gray-400',
};

// --------------------------------------------
// Size Styles
// --------------------------------------------

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
};

// --------------------------------------------
// Spinner
// --------------------------------------------

function Spinner({ className }: { className?: string }) {
    return (
        <svg
            className={`animate-spin ${className || 'h-4 w-4'}`}
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
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </svg>
    );
}

// --------------------------------------------
// Button Component
// --------------------------------------------

export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    disabled,
    className = '',
    children,
    type = 'button',
    ...props
}: ButtonProps) {
    const isDisabled = disabled || loading;

    return (
        <button
            type={type}
            disabled={isDisabled}
            className={`
                inline-flex items-center justify-center gap-2
                rounded-lg font-medium
                transition-colors duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${variantStyles[variant]}
                ${sizeStyles[size]}
                ${className}
            `.trim()}
            {...props}
        >
            {loading ? (
                <Spinner className={size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />
            ) : leftIcon ? (
                <span className="shrink-0">{leftIcon}</span>
            ) : null}
            {children && <span>{children}</span>}
            {rightIcon && !loading && <span className="shrink-0">{rightIcon}</span>}
        </button>
    );
}

export default Button;
