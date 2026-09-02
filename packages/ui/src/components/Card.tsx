// ============================================
// @qalcuity/ui — Card Component
// Compound card with header, body, footer
// ============================================

import React from 'react';

// --------------------------------------------
// Types
// --------------------------------------------

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Hover effect */
    hoverable?: boolean;
    /** Show border */
    bordered?: boolean;
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

// --------------------------------------------
// Card Component
// --------------------------------------------

export function Card({
    hoverable = false,
    bordered = true,
    className = '',
    children,
    ...props
}: CardProps) {
    return (
        <div
            className={`
                rounded-xl bg-white
                ${bordered ? 'border border-gray-200' : ''}
                ${hoverable ? 'transition-shadow duration-200 hover:shadow-md' : 'shadow-sm'}
                ${className}
            `.trim()}
            {...props}
        >
            {children}
        </div>
    );
}

// --------------------------------------------
// CardHeader Component
// --------------------------------------------

export function CardHeader({ children, className = '', ...props }: CardHeaderProps) {
    return (
        <div
            className={`border-b border-gray-200 px-6 py-4 ${className}`.trim()}
            {...props}
        >
            {children}
        </div>
    );
}

// --------------------------------------------
// CardBody Component
// --------------------------------------------

export function CardBody({ children, className = '', ...props }: CardBodyProps) {
    return (
        <div className={`px-6 py-4 ${className}`.trim()} {...props}>
            {children}
        </div>
    );
}

// --------------------------------------------
// CardFooter Component
// --------------------------------------------

export function CardFooter({ children, className = '', ...props }: CardFooterProps) {
    return (
        <div
            className={`border-t border-gray-200 px-6 py-4 ${className}`.trim()}
            {...props}
        >
            {children}
        </div>
    );
}

// --------------------------------------------
// Attach sub-components
// --------------------------------------------

Card.displayName = 'Card';
CardHeader.displayName = 'Card.Header';
CardBody.displayName = 'Card.Body';
CardFooter.displayName = 'Card.Footer';

export default Card;
