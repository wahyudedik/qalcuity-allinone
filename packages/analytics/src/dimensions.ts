// ============================================
// @qalcuity/analytics — Dimension Definitions
// Pre-built dimension sets for each business module
// ============================================

import type { DimensionDefinition, DatasetDefinition } from './types';

// --------------------------------------------
// Finance Dimensions
// --------------------------------------------

export const FINANCE_DIMENSIONS: DimensionDefinition[] = [
    { id: 'date', name: 'Date', nameKey: 'dimensions.date', type: 'temporal', sourceField: 'createdAt', groupable: true, filterable: true, sortable: true },
    { id: 'branch', name: 'Branch', nameKey: 'dimensions.branch', type: 'nominal', sourceField: 'branch', groupable: true, filterable: true, sortable: true },
    { id: 'customer', name: 'Customer', nameKey: 'dimensions.customer', type: 'nominal', sourceField: 'contactId', sourceModel: 'Contact', groupable: true, filterable: true, sortable: true },
    { id: 'status', name: 'Status', nameKey: 'dimensions.status', type: 'ordinal', sourceField: 'status', groupable: true, filterable: true, sortable: true },
    { id: 'payment_method', name: 'Payment Method', nameKey: 'dimensions.payment_method', type: 'nominal', sourceField: 'method', groupable: true, filterable: true, sortable: false },
    { id: 'category', name: 'Category', nameKey: 'dimensions.category', type: 'nominal', sourceField: 'categoryId', sourceModel: 'Category', groupable: true, filterable: true, sortable: true },
];

// --------------------------------------------
// CRM Dimensions
// --------------------------------------------

export const CRM_DIMENSIONS: DimensionDefinition[] = [
    { id: 'date', name: 'Date', nameKey: 'dimensions.date', type: 'temporal', sourceField: 'createdAt', groupable: true, filterable: true, sortable: true },
    { id: 'stage', name: 'Deal Stage', nameKey: 'dimensions.stage', type: 'ordinal', sourceField: 'stage', groupable: true, filterable: true, sortable: true },
    { id: 'salesperson', name: 'Salesperson', nameKey: 'dimensions.salesperson', type: 'nominal', sourceField: 'assignedTo', groupable: true, filterable: true, sortable: true },
    { id: 'source', name: 'Lead Source', nameKey: 'dimensions.source', type: 'nominal', sourceField: 'source', groupable: true, filterable: true, sortable: true },
    { id: 'branch', name: 'Branch', nameKey: 'dimensions.branch', type: 'nominal', sourceField: 'branch', groupable: true, filterable: true, sortable: true },
];

// --------------------------------------------
// HR Dimensions
// --------------------------------------------

export const HR_DIMENSIONS: DimensionDefinition[] = [
    { id: 'department', name: 'Department', nameKey: 'dimensions.department', type: 'nominal', sourceField: 'department', groupable: true, filterable: true, sortable: true },
    { id: 'branch', name: 'Branch', nameKey: 'dimensions.branch', type: 'nominal', sourceField: 'branch', groupable: true, filterable: true, sortable: true },
    { id: 'position', name: 'Position', nameKey: 'dimensions.position', type: 'nominal', sourceField: 'position', groupable: true, filterable: true, sortable: true },
    { id: 'date', name: 'Date', nameKey: 'dimensions.date', type: 'temporal', sourceField: 'createdAt', groupable: true, filterable: true, sortable: true },
    { id: 'status', name: 'Status', nameKey: 'dimensions.status', type: 'ordinal', sourceField: 'status', groupable: true, filterable: true, sortable: true },
];

// --------------------------------------------
// Inventory Dimensions
// --------------------------------------------

export const INVENTORY_DIMENSIONS: DimensionDefinition[] = [
    { id: 'category', name: 'Category', nameKey: 'dimensions.category', type: 'nominal', sourceField: 'categoryId', sourceModel: 'Category', groupable: true, filterable: true, sortable: true },
    { id: 'supplier', name: 'Supplier', nameKey: 'dimensions.supplier', type: 'nominal', sourceField: 'supplierId', sourceModel: 'Supplier', groupable: true, filterable: true, sortable: true },
    { id: 'date', name: 'Date', nameKey: 'dimensions.date', type: 'temporal', sourceField: 'createdAt', groupable: true, filterable: true, sortable: true },
    { id: 'branch', name: 'Branch', nameKey: 'dimensions.branch', type: 'nominal', sourceField: 'branch', groupable: true, filterable: true, sortable: true },
    { id: 'status', name: 'Stock Status', nameKey: 'dimensions.stock_status', type: 'ordinal', sourceField: 'stock', groupable: true, filterable: true, sortable: true },
];

// --------------------------------------------
// All Dataset Definitions
// --------------------------------------------

export const ALL_DATASETS: DatasetDefinition[] = [
    {
        id: 'invoices',
        name: 'Sales Invoices',
        nameKey: 'datasets.invoices',
        type: 'finance',
        description: 'All sales invoices and their line items',
        sourceModel: 'Invoice',
        dimensions: FINANCE_DIMENSIONS,
        measures: [
            { id: 'invoice_total', name: 'Invoice Total', nameKey: 'measures.invoice_total', aggregation: 'sum', sourceField: 'total', dataType: 'currency', description: 'Total invoice amount' },
            { id: 'tax_amount', name: 'Tax Amount', nameKey: 'measures.tax_amount', aggregation: 'sum', sourceField: 'taxAmount', dataType: 'currency', description: 'Total tax amount' },
            { id: 'invoice_count', name: 'Invoice Count', nameKey: 'measures.invoice_count', aggregation: 'count', sourceField: 'id', dataType: 'number', description: 'Number of invoices' },
            { id: 'avg_invoice', name: 'Average Invoice', nameKey: 'measures.avg_invoice', aggregation: 'avg', sourceField: 'total', dataType: 'currency', description: 'Average invoice amount' },
        ],
    },
    {
        id: 'payments',
        name: 'Payments',
        nameKey: 'datasets.payments',
        type: 'finance',
        description: 'All payment transactions',
        sourceModel: 'Payment',
        dimensions: [
            ...FINANCE_DIMENSIONS,
            { id: 'payment_method', name: 'Payment Method', nameKey: 'dimensions.payment_method', type: 'nominal', sourceField: 'method', groupable: true, filterable: true, sortable: false },
        ],
        measures: [
            { id: 'payment_amount', name: 'Payment Amount', nameKey: 'measures.payment_amount', aggregation: 'sum', sourceField: 'amount', dataType: 'currency', description: 'Total payment amount' },
            { id: 'payment_count', name: 'Payment Count', nameKey: 'measures.payment_count', aggregation: 'count', sourceField: 'id', dataType: 'number', description: 'Number of payments' },
        ],
    },
    {
        id: 'deals',
        name: 'Sales Deals',
        nameKey: 'datasets.deals',
        type: 'crm',
        description: 'All CRM deals and opportunities',
        sourceModel: 'Deal',
        dimensions: CRM_DIMENSIONS,
        measures: [
            { id: 'deal_value', name: 'Deal Value', nameKey: 'measures.deal_value', aggregation: 'sum', sourceField: 'value', dataType: 'currency', description: 'Total deal value' },
            { id: 'deal_count', name: 'Deal Count', nameKey: 'measures.deal_count', aggregation: 'count', sourceField: 'id', dataType: 'number', description: 'Number of deals' },
            { id: 'avg_probability', name: 'Average Probability', nameKey: 'measures.avg_probability', aggregation: 'avg', sourceField: 'probability', dataType: 'percentage', description: 'Average win probability' },
        ],
    },
    {
        id: 'products',
        name: 'Products & Inventory',
        nameKey: 'datasets.products',
        type: 'inventory',
        description: 'Product catalog and stock levels',
        sourceModel: 'Product',
        dimensions: INVENTORY_DIMENSIONS,
        measures: [
            { id: 'stock_level', name: 'Stock Level', nameKey: 'measures.stock_level', aggregation: 'sum', sourceField: 'stock', dataType: 'number', description: 'Current stock level' },
            { id: 'stock_value', name: 'Stock Value', nameKey: 'measures.stock_value', aggregation: 'sum', sourceField: 'stock', dataType: 'currency', description: 'Stock value (price × quantity)' },
            { id: 'product_count', name: 'Product Count', nameKey: 'measures.product_count', aggregation: 'count', sourceField: 'id', dataType: 'number', description: 'Number of products' },
        ],
    },
    {
        id: 'employees',
        name: 'Employees',
        nameKey: 'datasets.employees',
        type: 'hr',
        description: 'Employee records and HR data',
        sourceModel: 'Employee',
        dimensions: HR_DIMENSIONS,
        measures: [
            { id: 'employee_count', name: 'Employee Count', nameKey: 'measures.employee_count', aggregation: 'count', sourceField: 'id', dataType: 'number', description: 'Number of employees' },
            { id: 'total_salary', name: 'Total Salary', nameKey: 'measures.total_salary', aggregation: 'sum', sourceField: 'salary', dataType: 'currency', description: 'Total salary cost' },
            { id: 'avg_salary', name: 'Average Salary', nameKey: 'measures.avg_salary', aggregation: 'avg', sourceField: 'salary', dataType: 'currency', description: 'Average salary' },
        ],
    },
];

/**
 * Get a dataset definition by ID.
 */
export function getDatasetById(id: string): DatasetDefinition | undefined {
    return ALL_DATASETS.find(d => d.id === id);
}

/**
 * Get all dataset definitions for a given type.
 */
export function getDatasetsByType(type: DatasetDefinition['type']): DatasetDefinition[] {
    return ALL_DATASETS.filter(d => d.type === type);
}
