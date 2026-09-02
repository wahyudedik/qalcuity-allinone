// ============================================
// @qalcuity/ui — Select Component
// Reusable select dropdown with label and error
// ============================================

import React, { forwardRef } from 'react';

// --------------------------------------------
// Types
// --------------------------------------------

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
    /** Label text */
    label?: string;
    /** Array of options */
    options: SelectOption[];
    /** Error message */
    error?: string;
    /** Placeholder text */
    placeholder?: string;
}

// --------------------------------------------
// Select Component
// --------------------------------------------

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            label,
            options,
            error,
            placeholder,
            disabled = false,
            required = false,
            className = '',
            id,
            value,
            ...props
        },
        ref
    ) => {
        const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
        const hasValue = value !== undefined && value !== '';

        return (
            <div className="w-full">
                {/* Label */}
                {label && (
                    <label
                        htmlFor={selectId}
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                        {label}
                        {required && <span className="ml-0.5 text-red-500">*</span>}
                    </label>
                )}

                {/* Select wrapper */}
                <div className="relative">
                    <select
                        ref={ref}
                        id={selectId}
                        disabled={disabled}
                        required={required}
                        value={value}
                        className={`
                            block w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-10
                            text-sm text-gray-900
                            transition-colors duration-150
                            focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                            disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500
                            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}
                            ${!hasValue ? 'text-gray-400' : ''}
                            ${className}
                        `.trim()}
                        {...props}
                    >
                        {/* Placeholder option */}
                        {placeholder && (
                            <option value="" disabled>
                                {placeholder}
                            </option>
                        )}

                        {/* Options */}
                        {options.map((option) => (
                            <option
                                key={option.value}
                                value={option.value}
                                disabled={option.disabled}
                            >
                                {option.label}
                            </option>
                        ))}
                    </select>

                    {/* Chevron icon */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <svg
                            className="h-4 w-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </div>
                </div>

                {/* Error message */}
                {error && (
                    <p className="mt-1 text-sm text-red-600">{error}</p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';

export default Select;
