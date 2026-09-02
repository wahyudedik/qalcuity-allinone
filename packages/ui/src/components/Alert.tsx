// ============================================
// @qalcuity/ui — Alert Component
// Alert banners with color variants
// ============================================

import React from 'react';
import {
    Info,
    CheckCircle,
    AlertTriangle,
    XCircle,
    X,
} from 'lucide-react';

// --------------------------------------------
// Types
// --------------------------------------------

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Alert variant */
    variant?: AlertVariant;
    /** Alert title */
    title?: string;
    /** Show close button */
    closable?: boolean;
    /** Close handler */
    onClose?: () => void;
}

// --------------------------------------------
// Variant Styles
// --------------------------------------------

const variantStyles: Record<AlertVariant, { container: string; icon: string; text: string }> = {
    info: {
        container: 'bg-blue-50 border-blue-200',
        icon: 'text-blue-400',
        text: 'text-blue-800',
    },
    success: {
        container: 'bg-green-50 border-green-200',
        icon: 'text-green-400',
        text: 'text-green-800',
    },
    warning: {
        container: 'bg-yellow-50 border-yellow-200',
        icon: 'text-yellow-400',
        text: 'text-yellow-800',
    },
    error: {
        container: 'bg-red-50 border-red-200',
        icon: 'text-red-400',
        text: 'text-red-800',
    },
};

// --------------------------------------------
// Icon Component
// --------------------------------------------

function AlertIcon({ variant }: { variant: AlertVariant }) {
    const iconProps = { className: 'h-5 w-5 shrink-0' };
    const style = variantStyles[variant];

    switch (variant) {
        case 'info':
            return <Info {...iconProps} />;
        case 'success':
            return <CheckCircle {...iconProps} />;
        case 'warning':
            return <AlertTriangle {...iconProps} />;
        case 'error':
            return <XCircle {...iconProps} />;
        default:
            return <Info {...iconProps} />;
    }
}

// --------------------------------------------
// Alert Component
// --------------------------------------------

export function Alert({
    variant = 'info',
    title,
    closable = false,
    onClose,
    className = '',
    children,
    ...props
}: AlertProps) {
    const style = variantStyles[variant];

    return (
        <div
            role="alert"
            className={`
                flex items-start gap-3 rounded-lg border p-4
                ${style.container}
                ${className}
            `.trim()}
            {...props}
        >
            {/* Icon */}
            <div className={style.icon}>
                <AlertIcon variant={variant} />
            </div>

            {/* Content */}
            <div className="flex-1">
                {title && (
                    <h4 className={`text-sm font-semibold ${style.text}`}>{title}</h4>
                )}
                <div className={`text-sm ${style.text} ${title ? 'mt-1' : ''}`}>
                    {children}
                </div>
            </div>

            {/* Close button */}
            {closable && onClose && (
                <button
                    onClick={onClose}
                    className={`shrink-0 rounded p-1 ${style.text} opacity-70 hover:opacity-100`}
                    aria-label="Close"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}

export default Alert;
