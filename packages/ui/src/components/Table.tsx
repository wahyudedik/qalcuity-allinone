// ============================================
// @qalcuity/ui — Table Component
// Compound table with sub-components
// ============================================

import React from 'react';

// --------------------------------------------
// Types
// --------------------------------------------

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
    /** Alternating row colors */
    striped?: boolean;
    /** Hover effect on rows */
    hoverable?: boolean;
    /** Compact mode */
    compact?: boolean;
}

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
    children: React.ReactNode;
}

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
    children: React.ReactNode;
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
    children: React.ReactNode;
    /** Whether this row is selected */
    selected?: boolean;
}

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
    children: React.ReactNode;
}

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
    children: React.ReactNode;
}

// --------------------------------------------
// Table Component
// --------------------------------------------

export function Table({
    striped = false,
    hoverable = true,
    compact = false,
    className = '',
    children,
    ...props
}: TableProps) {
    return (
        <div className="w-full overflow-x-auto">
            <table
                className={`w-full border-collapse text-left text-sm ${className}`.trim()}
                {...props}
            >
                {React.Children.map(children, (child) => {
                    if (React.isValidElement(child)) {
                        return React.cloneElement(child as React.ReactElement<{
                            striped?: boolean;
                            hoverable?: boolean;
                            compact?: boolean;
                        }>, {
                            striped,
                            hoverable,
                            compact,
                        });
                    }
                    return child;
                })}
            </table>
        </div>
    );
}

// --------------------------------------------
// TableHeader Component
// --------------------------------------------

export function TableHeader({ children, className = '', ...props }: TableHeaderProps) {
    return (
        <thead className={`bg-gray-50 ${className}`.trim()} {...props}>
            {children}
        </thead>
    );
}

// --------------------------------------------
// TableBody Component
// --------------------------------------------

export function TableBody({
    children,
    className = '',
    ...props
}: TableBodyProps & { striped?: boolean; hoverable?: boolean; compact?: boolean }) {
    return (
        <tbody className={`divide-y divide-gray-100 ${className}`.trim()} {...props}>
            {children}
        </tbody>
    );
}

// --------------------------------------------
// TableRow Component
// --------------------------------------------

export function TableRow({
    children,
    selected = false,
    className = '',
    ...props
}: TableRowProps & { striped?: boolean; hoverable?: boolean; compact?: boolean }) {
    return (
        <tr
            className={`
                ${selected ? 'bg-blue-50' : ''}
                ${className}
            `.trim()}
            {...props}
        >
            {children}
        </tr>
    );
}

// --------------------------------------------
// TableHead Component
// --------------------------------------------

export function TableHead({
    children,
    className = '',
    ...props
}: TableHeadProps) {
    return (
        <th
            className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${className}`.trim()}
            {...props}
        >
            {children}
        </th>
    );
}

// --------------------------------------------
// TableCell Component
// --------------------------------------------

export function TableCell({
    children,
    className = '',
    ...props
}: TableCellProps) {
    return (
        <td
            className={`px-4 py-3 text-sm text-gray-900 ${className}`.trim()}
            {...props}
        >
            {children}
        </td>
    );
}

// --------------------------------------------
// Attach sub-components
// --------------------------------------------

Table.displayName = 'Table';
TableHeader.displayName = 'Table.Header';
TableBody.displayName = 'Table.Body';
TableRow.displayName = 'Table.Row';
TableHead.displayName = 'Table.Head';
TableCell.displayName = 'Table.Cell';

export default Table;
