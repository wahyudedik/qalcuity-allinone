// ============================================
// @qalcuity/ui — Badge Component
// Status badge with color variants
// ============================================

import React from 'react';

// --------------------------------------------
// Types
// --------------------------------------------

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    /** Badge variant */
    variant?: BadgeVariant;
}

// --------------------------------------------
// Variant Styles
// --------------------------------------------

const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-cyan-100 text-cyan-800',
};

// --------------------------------------------
// Badge Component
// --------------------------------------------

export function Badge({
    variant = 'default',
    className = '',
    children,
    ...props
}: BadgeProps) {
    return (
        <span
            className={`
                inline-flex items-center rounded-full px-2.5 py-0.5
                text-xs font-medium
                ${variantStyles[variant]}
                ${className}
            `.trim()}
            {...props}
        >
            {children}
        </span>
    );
}

export default Badge;
