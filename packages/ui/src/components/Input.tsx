// ============================================
// @qalcuity/ui — Input Component
// Reusable input with label, error, icons
// ============================================

import React, { useState, forwardRef } from 'react';

// --------------------------------------------
// Types
// --------------------------------------------

export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    /** Input type */
    type?: InputType;
    /** Label text */
    label?: string;
    /** Error message */
    error?: string;
    /** Helper text */
    helperText?: string;
    /** Icon before input */
    leftIcon?: React.ReactNode;
    /** Icon after input */
    rightIcon?: React.ReactNode;
}

// --------------------------------------------
// Input Component
// --------------------------------------------

export const Input = forwardRef<HTMLInputElement, InputProps>(
    (
        {
            type = 'text',
            label,
            error,
            helperText,
            leftIcon,
            rightIcon,
            disabled = false,
            required = false,
            className = '',
            id,
            ...props
        },
        ref
    ) => {
        const [showPassword, setShowPassword] = useState(false);
        const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
        const isPassword = type === 'password';
        const actualType = isPassword && showPassword ? 'text' : type;

        return (
            <div className="w-full">
                {/* Label */}
                {label && (
                    <label
                        htmlFor={inputId}
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                        {label}
                        {required && <span className="ml-0.5 text-red-500">*</span>}
                    </label>
                )}

                {/* Input wrapper */}
                <div className="relative">
                    {/* Left icon */}
                    {leftIcon && (
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className="text-gray-400">{leftIcon}</span>
                        </div>
                    )}

                    {/* Input */}
                    <input
                        ref={ref}
                        id={inputId}
                        type={actualType}
                        disabled={disabled}
                        required={required}
                        className={`
                            block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900
                            placeholder:text-gray-400
                            transition-colors duration-150
                            focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                            disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500
                            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}
                            ${leftIcon ? 'pl-10' : ''}
                            ${rightIcon || isPassword ? 'pr-10' : ''}
                            ${className}
                        `.trim()}
                        {...props}
                    />

                    {/* Right icon or password toggle */}
                    {isPassword ? (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                            tabIndex={-1}
                        >
                            {showPassword ? (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                            ) : (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            )}
                        </button>
                    ) : rightIcon ? (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-gray-400">{rightIcon}</span>
                        </div>
                    ) : null}
                </div>

                {/* Error message */}
                {error && (
                    <p className="mt-1 text-sm text-red-600">{error}</p>
                )}

                {/* Helper text */}
                {helperText && !error && (
                    <p className="mt-1 text-sm text-gray-500">{helperText}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;
