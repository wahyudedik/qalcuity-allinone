/**
 * OpenAPI 3.0 Specification Generator
 *
 * Generates a complete OpenAPI 3.0 spec for Qalcuity API.
 * Uses manual route registry (not AST parsing) for reliability.
 *
 * @see apps/web/app/api/docs/route.ts — serves this spec as JSON
 * @see apps/web/app/dashboard/api-docs/page.tsx — Swagger UI page
 */

// ============================================================
// Types
// ============================================================

interface OpenAPISchema {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
    items?: OpenAPISchema;
    description?: string;
    example?: unknown;
    format?: string;
    enum?: string[];
    oneOf?: OpenAPISchema[];
}

interface OpenAPIParameter {
    name: string;
    in: 'query' | 'path' | 'header' | 'cookie';
    required?: boolean;
    description?: string;
    schema: OpenAPISchema;
    example?: unknown;
}

interface OpenAPIRequestBody {
    required: boolean;
    content: {
        'application/json': {
            schema: OpenAPISchema;
            example?: unknown;
        };
    };
}

interface OpenAPIResponse {
    description: string;
    content?: {
        'application/json': {
            schema: OpenAPISchema;
            example?: unknown;
        };
    };
}

interface OpenAPIOperation {
    summary: string;
    description: string;
    tags: string[];
    security?: Array<Record<string, string[]>>;
    parameters?: OpenAPIParameter[];
    requestBody?: OpenAPIRequestBody;
    responses: Record<string, OpenAPIResponse>;
}

type HTTPMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface RouteDefinition {
    path: string;
    method: HTTPMethod;
    summary: string;
    description: string;
    tags: string[];
    parameters?: OpenAPIParameter[];
    requestBody?: OpenAPIRequestBody;
    responses: Record<string, OpenAPIResponse>;
    security?: Array<Record<string, string[]>>;
}

// ============================================================
// Common Schemas
// ============================================================

const errorSchema: OpenAPISchema = {
    type: 'object',
    properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Error message' },
        code: { type: 'string', example: 'ERROR_CODE' },
    },
    required: ['success', 'error'],
};

const paginatedSchema = (itemSchema: OpenAPISchema): OpenAPISchema => ({
    type: 'object',
    properties: {
        success: { type: 'boolean', example: true },
        data: {
            type: 'array',
            items: itemSchema,
        },
        pagination: {
            type: 'object',
            properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 20 },
                total: { type: 'integer', example: 100 },
                totalPages: { type: 'integer', example: 5 },
            },
        },
    },
});

const successSchema = (message?: string): OpenAPISchema => ({
    type: 'object',
    properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: message || 'Operation completed successfully' },
        data: { type: 'object' },
    },
});

// ============================================================
// Entity Schemas
// ============================================================

const invoiceSchema: OpenAPISchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        invoiceNumber: { type: 'string', example: 'INV-2026-001' },
        clientId: { type: 'string', format: 'uuid' },
        clientName: { type: 'string', example: 'PT Maju Jaya' },
        date: { type: 'string', format: 'date', example: '2026-09-16' },
        dueDate: { type: 'string', format: 'date', example: '2026-10-16' },
        status: { type: 'string', enum: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'] },
        subtotal: { type: 'number', example: 1000000 },
        tax: { type: 'number', example: 110000 },
        total: { type: 'number', example: 1110000 },
        notes: { type: 'string' },
        items: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    description: { type: 'string' },
                    quantity: { type: 'number' },
                    unitPrice: { type: 'number' },
                    total: { type: 'number' },
                },
            },
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
    },
};

const paymentSchema: OpenAPISchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        paymentNumber: { type: 'string', example: 'PAY-2026-001' },
        invoiceId: { type: 'string', format: 'uuid' },
        amount: { type: 'number', example: 1110000 },
        paymentDate: { type: 'string', format: 'date' },
        paymentMethod: { type: 'string', enum: ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'E_WALLET'] },
        status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'] },
        notes: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
    },
};

const quotationSchema: OpenAPISchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        quotationNumber: { type: 'string', example: 'QUO-2026-001' },
        clientId: { type: 'string', format: 'uuid' },
        clientName: { type: 'string', example: 'PT Maju Jaya' },
        date: { type: 'string', format: 'date' },
        validUntil: { type: 'string', format: 'date' },
        status: { type: 'string', enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'] },
        subtotal: { type: 'number' },
        tax: { type: 'number' },
        total: { type: 'number' },
        items: { type: 'array', items: { type: 'object' } },
        createdAt: { type: 'string', format: 'date-time' },
    },
};

const purchaseOrderSchema: OpenAPISchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        poNumber: { type: 'string', example: 'PO-2026-001' },
        supplierId: { type: 'string', format: 'uuid' },
        supplierName: { type: 'string', example: 'PT Supplier ABC' },
        date: { type: 'string', format: 'date' },
        expectedDelivery: { type: 'string', format: 'date' },
        status: { type: 'string', enum: ['DRAFT', 'SENT', 'CONFIRMED', 'RECEIVED', 'CANCELLED'] },
        subtotal: { type: 'number' },
        tax: { type: 'number' },
        total: { type: 'number' },
        items: { type: 'array', items: { type: 'object' } },
        createdAt: { type: 'string', format: 'date-time' },
    },
};

const accountSchema: OpenAPISchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        code: { type: 'string', example: '1101' },
        name: { type: 'string', example: 'Kas' },
        type: { type: 'string', enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] },
        parentId: { type: 'string', format: 'uuid' },
        balance: { type: 'number', example: 50000000 },
        isActive: { type: 'boolean', example: true },
        description: { type: 'string' },
    },
};

const journalEntrySchema: OpenAPISchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        entryNumber: { type: 'string', example: 'JE-2026-001' },
        date: { type: 'string', format: 'date' },
        description: { type: 'string', example: 'Pendapatan dari penjualan' },
        status: { type: 'string', enum: ['DRAFT', 'POSTED', 'REVERSED'] },
        lines: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    accountId: { type: 'string', format: 'uuid' },
                    accountCode: { type: 'string' },
                    accountName: { type: 'string' },
                    debit: { type: 'number' },
                    credit: { type: 'number' },
                    description: { type: 'string' },
                },
            },
        },
        totalDebit: { type: 'number' },
        totalCredit: { type: 'number' },
        createdAt: { type: 'string', format: 'date-time' },
    },
};

const leadSchema: OpenAPISchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
        company: { type: 'string', example: 'PT Maju Jaya' },
        source: { type: 'string', enum: ['WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'COLD_CALL', 'OTHER'] },
        status: { type: 'string', enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'] },
        score: { type: 'integer', example: 75 },
        notes: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
    },
};

const contactSchema: OpenAPISchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
        company: { type: 'string', example: 'PT Maju Jaya' },
        position: { type: 'string', example: 'Director' },
        type: { type: 'string', enum: ['CUSTOMER', 'SUPPLIER', 'PARTNER'] },
        createdAt: { type: 'string', format: 'date-time' },
    },
};

const dealSchema: OpenAPISchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string', example: 'Project Website Redesign' },
        contactId: { type: 'string', format: 'uuid' },
        contactName: { type: 'string' },
        value: { type: 'number', example: 50000000 },
        stage: { type: 'string', enum: ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'] },
        probability: { type: 'integer', example: 60 },
        expectedCloseDate: { type: 'string', format: 'date' },
        notes: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
    },
};

const employeeSchema: OpenAPISchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        employeeId: { type: 'string', example: 'EMP-001' },
        name: { type: 'string', example: 'Budi Santoso' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
        department: { type: 'string', example: 'Engineering' },
        position: { type: 'string', example: 'Software Engineer' },
        startDate: { type: 'string', format: 'date' },
        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'TERMINATED'] },
        salary: { type: 'number' },
        createdAt: { type: 'string', format: 'date-time' },
    },
};

const attendanceSchema: OpenAPISchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        employeeId: { type: 'string', format: 'uuid' },
        employeeName: { type: 'string' },
        date: { type: 'string', format: 'date' },
        clockIn: { type: 'string', format: 'date-time' },
        clockOut: { type: 'string', format: 'date-time' },
        status: { type: 'string', enum: ['PRESENT', 'ABSENT', 'LATE', 'LEAVE'] },
        hoursWorked: { type: 'number', example: 8 },
    },
};

const leaveSchema: OpenAPISchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        employeeId: { type: 'string', format: 'uuid' },
        employeeName: { type: 'string' },
        type: { type: 'string', enum: ['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'OTHER'] },
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
        days: { type: 'integer', example: 2 },
        reason: { type: 'string' },
        status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
        createdAt: { type: 'string', format: 'date-time' },
    },
};

const productSchema: OpenAPISchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        sku: { type: 'string', example: 'PRD-001' },
        name: { type: 'string', example: 'Laptop ASUS' },
        description: { type: 'string' },
        category: { type: 'string' },
        price: { type: 'number', example: 15000000 },
        cost: { type: 'number', example: 12000000 },
        stock: { type: 'integer', example: 50 },
        minStock: { type: 'integer', example: 10 },
        unit: { type: 'string', example: 'pcs' },
        isActive: { type: 'boolean', example: true },
        createdAt: { type: 'string', format: 'date-time' },
    },
};

const categorySchema: OpenAPISchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', example: 'Electronics' },
        description: { type: 'string' },
        parentId: { type: 'string', format: 'uuid' },
        isActive: { type: 'boolean', example: true },
    },
};

const supplierSchema: OpenAPISchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', example: 'PT Supplier ABC' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
        address: { type: 'string' },
        contactPerson: { type: 'string' },
        isActive: { type: 'boolean', example: true },
        createdAt: { type: 'string', format: 'date-time' },
    },
};

const posTransactionSchema: OpenAPISchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        transactionNumber: { type: 'string', example: 'TXN-2026-001' },
        cashierId: { type: 'string', format: 'uuid' },
        cashierName: { type: 'string' },
        items: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    productId: { type: 'string', format: 'uuid' },
                    productName: { type: 'string' },
                    quantity: { type: 'integer' },
                    unitPrice: { type: 'number' },
                    total: { type: 'number' },
                },
            },
        },
        subtotal: { type: 'number' },
        tax: { type: 'number' },
        discount: { type: 'number' },
        total: { type: 'number' },
        paymentMethod: { type: 'string', enum: ['CASH', 'CARD', 'E_WALLET', 'QRIS'] },
        status: { type: 'string', enum: ['COMPLETED', 'REFUNDED', 'VOIDED'] },
        createdAt: { type: 'string', format: 'date-time' },
    },
};

const sessionSchema: OpenAPISchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        device: { type: 'string', example: 'Chrome on Windows' },
        ip: { type: 'string', example: '192.168.1.1' },
        lastActive: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
        isCurrent: { type: 'boolean', example: false },
    },
};

const aiQuerySchema: OpenAPISchema = {
    type: 'object',
    properties: {
        query: { type: 'string', example: 'Tampilkan penjualan bulan ini' },
        module: { type: 'string', enum: ['finance', 'crm', 'hr', 'inventory', 'pos', 'analytics'] },
    },
    required: ['query'],
};

const aiAgentSchema: OpenAPISchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', example: 'Finance Agent' },
        type: { type: 'string', enum: ['finance', 'sales', 'inventory', 'hr', 'support', 'document'] },
        status: { type: 'string', enum: ['active', 'inactive', 'error'] },
        capabilities: { type: 'array', items: { type: 'string' } },
        lastActive: { type: 'string', format: 'date-time' },
    },
};

// ============================================================
// Route Registry
// ============================================================

const routes: RouteDefinition[] = [
    // ─── Auth ──────────────────────────────────────────────────────────────────
    {
        path: '/api/auth/register',
        method: 'post',
        summary: 'Register new tenant',
        description: 'Create a new tenant account with company information and initial admin user. Rate limit: 5 requests per 15 minutes.',
        tags: ['Auth'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            companyName: { type: 'string', example: 'PT Maju Jaya' },
                            email: { type: 'string', format: 'email', example: 'admin@majujaya.com' },
                            password: { type: 'string', format: 'password', minLength: 8 },
                            phone: { type: 'string', example: '+6281234567890' },
                            industry: { type: 'string', example: 'manufacturing' },
                        },
                        required: ['companyName', 'email', 'password'],
                    },
                },
            },
        },
        responses: {
            '201': {
                description: 'Registration successful',
                content: {
                    'application/json': {
                        schema: successSchema('Registration successful'),
                    },
                },
            },
            '400': { description: 'Validation error', content: { 'application/json': { schema: errorSchema } } },
            '409': { description: 'Email already exists', content: { 'application/json': { schema: errorSchema } } },
        },
        security: [],
    },
    {
        path: '/api/auth/login',
        method: 'post',
        summary: 'Login',
        description: 'Authenticate user with email and password. Returns JWT token. Rate limit: 5 requests per 15 minutes.',
        tags: ['Auth'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            email: { type: 'string', format: 'email', example: 'admin@majujaya.com' },
                            password: { type: 'string', format: 'password' },
                        },
                        required: ['email', 'password'],
                    },
                },
            },
        },
        responses: {
            '200': {
                description: 'Login successful',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                name: { type: 'string' },
                                email: { type: 'string' },
                                role: { type: 'string', enum: ['SUPERADMIN', 'ADMIN', 'MEMBER', 'VIEWER'] },
                                tenantId: { type: 'string', format: 'uuid' },
                            },
                        },
                    },
                },
            },
            '401': { description: 'Invalid credentials', content: { 'application/json': { schema: errorSchema } } },
        },
        security: [],
    },

    // ─── Finance: Invoices ─────────────────────────────────────────────────────
    {
        path: '/api/finance/invoices',
        method: 'get',
        summary: 'List invoices',
        description: 'Retrieve all invoices for the current tenant. Supports pagination and filtering by status. Requires `finance:view` permission.',
        tags: ['Finance'],
        parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', example: 1 }, description: 'Page number' },
            { name: 'limit', in: 'query', schema: { type: 'integer', example: 20 }, description: 'Items per page' },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'] }, description: 'Filter by status' },
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by invoice number or client name' },
        ],
        responses: {
            '200': { description: 'List of invoices', content: { 'application/json': { schema: paginatedSchema(invoiceSchema) } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: errorSchema } } },
            '403': { description: 'Forbidden — insufficient permissions', content: { 'application/json': { schema: errorSchema } } },
        },
    },
    {
        path: '/api/finance/invoices',
        method: 'post',
        summary: 'Create invoice',
        description: 'Create a new invoice with line items. Requires `finance:create` permission.',
        tags: ['Finance'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            clientId: { type: 'string', format: 'uuid' },
                            date: { type: 'string', format: 'date' },
                            dueDate: { type: 'string', format: 'date' },
                            notes: { type: 'string' },
                            items: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        description: { type: 'string', example: 'Website Development' },
                                        quantity: { type: 'number', example: 1 },
                                        unitPrice: { type: 'number', example: 10000000 },
                                    },
                                    required: ['description', 'quantity', 'unitPrice'],
                                },
                            },
                        },
                        required: ['clientId', 'date', 'dueDate', 'items'],
                    },
                },
            },
        },
        responses: {
            '201': { description: 'Invoice created', content: { 'application/json': { schema: successSchema('Invoice created successfully') } } },
            '400': { description: 'Validation error', content: { 'application/json': { schema: errorSchema } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: errorSchema } } },
        },
    },
    {
        path: '/api/finance/invoices/[id]',
        method: 'get',
        summary: 'Get invoice detail',
        description: 'Retrieve detailed information for a specific invoice including line items. Requires `finance:view` permission.',
        tags: ['Finance'],
        parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Invoice ID' },
        ],
        responses: {
            '200': { description: 'Invoice details', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: invoiceSchema } } } } },
            '404': { description: 'Invoice not found', content: { 'application/json': { schema: errorSchema } } },
        },
    },
    {
        path: '/api/finance/invoices/[id]',
        method: 'put',
        summary: 'Update invoice',
        description: 'Update an existing invoice. Only DRAFT invoices can be edited. Requires `finance:edit` permission.',
        tags: ['Finance'],
        parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Invoice ID' },
        ],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            clientId: { type: 'string', format: 'uuid' },
                            date: { type: 'string', format: 'date' },
                            dueDate: { type: 'string', format: 'date' },
                            status: { type: 'string', enum: ['DRAFT', 'SENT', 'PAID', 'CANCELLED'] },
                            notes: { type: 'string' },
                            items: { type: 'array', items: { type: 'object' } },
                        },
                    },
                },
            },
        },
        responses: {
            '200': { description: 'Invoice updated', content: { 'application/json': { schema: successSchema('Invoice updated successfully') } } },
            '400': { description: 'Validation error', content: { 'application/json': { schema: errorSchema } } },
            '404': { description: 'Invoice not found', content: { 'application/json': { schema: errorSchema } } },
        },
    },
    {
        path: '/api/finance/invoices/[id]',
        method: 'delete',
        summary: 'Delete invoice',
        description: 'Delete an invoice. Only DRAFT invoices can be deleted. Requires `finance:delete` permission.',
        tags: ['Finance'],
        parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Invoice ID' },
        ],
        responses: {
            '200': { description: 'Invoice deleted', content: { 'application/json': { schema: successSchema('Invoice deleted successfully') } } },
            '404': { description: 'Invoice not found', content: { 'application/json': { schema: errorSchema } } },
        },
    },

    // ─── Finance: Payments ─────────────────────────────────────────────────────
    {
        path: '/api/finance/payments',
        method: 'get',
        summary: 'List payments',
        description: 'Retrieve all payments for the current tenant. Requires `finance:view` permission.',
        tags: ['Finance'],
        parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', example: 1 }, description: 'Page number' },
            { name: 'limit', in: 'query', schema: { type: 'integer', example: 20 }, description: 'Items per page' },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'] }, description: 'Filter by status' },
        ],
        responses: {
            '200': { description: 'List of payments', content: { 'application/json': { schema: paginatedSchema(paymentSchema) } } },
        },
    },
    {
        path: '/api/finance/payments',
        method: 'post',
        summary: 'Create payment',
        description: 'Record a new payment for an invoice. Requires `finance:create` permission.',
        tags: ['Finance'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            invoiceId: { type: 'string', format: 'uuid' },
                            amount: { type: 'number', example: 1110000 },
                            paymentDate: { type: 'string', format: 'date' },
                            paymentMethod: { type: 'string', enum: ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'E_WALLET'] },
                            notes: { type: 'string' },
                        },
                        required: ['invoiceId', 'amount', 'paymentDate', 'paymentMethod'],
                    },
                },
            },
        },
        responses: {
            '201': { description: 'Payment created', content: { 'application/json': { schema: successSchema('Payment recorded successfully') } } },
            '400': { description: 'Validation error', content: { 'application/json': { schema: errorSchema } } },
        },
    },

    // ─── Finance: Quotations ───────────────────────────────────────────────────
    {
        path: '/api/finance/quotations',
        method: 'get',
        summary: 'List quotations',
        description: 'Retrieve all quotations for the current tenant. Requires `finance:view` permission.',
        tags: ['Finance'],
        parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' }, description: 'Page number' },
            { name: 'limit', in: 'query', schema: { type: 'integer' }, description: 'Items per page' },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'] } },
        ],
        responses: {
            '200': { description: 'List of quotations', content: { 'application/json': { schema: paginatedSchema(quotationSchema) } } },
        },
    },
    {
        path: '/api/finance/quotations',
        method: 'post',
        summary: 'Create quotation',
        description: 'Create a new quotation with line items. Requires `finance:create` permission.',
        tags: ['Finance'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            clientId: { type: 'string', format: 'uuid' },
                            date: { type: 'string', format: 'date' },
                            validUntil: { type: 'string', format: 'date' },
                            notes: { type: 'string' },
                            items: { type: 'array', items: { type: 'object' } },
                        },
                        required: ['clientId', 'date', 'validUntil', 'items'],
                    },
                },
            },
        },
        responses: {
            '201': { description: 'Quotation created', content: { 'application/json': { schema: successSchema('Quotation created successfully') } } },
        },
    },

    // ─── Finance: Purchase Orders ──────────────────────────────────────────────
    {
        path: '/api/finance/purchase-orders',
        method: 'get',
        summary: 'List purchase orders',
        description: 'Retrieve all purchase orders for the current tenant. Requires `finance:view` permission.',
        tags: ['Finance'],
        parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' }, description: 'Page number' },
            { name: 'limit', in: 'query', schema: { type: 'integer' }, description: 'Items per page' },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'SENT', 'CONFIRMED', 'RECEIVED', 'CANCELLED'] } },
        ],
        responses: {
            '200': { description: 'List of purchase orders', content: { 'application/json': { schema: paginatedSchema(purchaseOrderSchema) } } },
        },
    },
    {
        path: '/api/finance/purchase-orders',
        method: 'post',
        summary: 'Create purchase order',
        description: 'Create a new purchase order. Requires `finance:create` permission.',
        tags: ['Finance'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            supplierId: { type: 'string', format: 'uuid' },
                            date: { type: 'string', format: 'date' },
                            expectedDelivery: { type: 'string', format: 'date' },
                            notes: { type: 'string' },
                            items: { type: 'array', items: { type: 'object' } },
                        },
                        required: ['supplierId', 'date', 'expectedDelivery', 'items'],
                    },
                },
            },
        },
        responses: {
            '201': { description: 'Purchase order created', content: { 'application/json': { schema: successSchema('Purchase order created successfully') } } },
        },
    },

    // ─── Finance: Chart of Accounts ────────────────────────────────────────────
    {
        path: '/api/finance/accounts',
        method: 'get',
        summary: 'List chart of accounts',
        description: 'Retrieve all accounts in the chart of accounts. Requires `finance:view` permission.',
        tags: ['Finance'],
        parameters: [
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] }, description: 'Filter by account type' },
        ],
        responses: {
            '200': { description: 'List of accounts', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: accountSchema } } } } } },
        },
    },
    {
        path: '/api/finance/accounts',
        method: 'post',
        summary: 'Create account',
        description: 'Add a new account to the chart of accounts. Requires `finance:create` permission.',
        tags: ['Finance'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            code: { type: 'string', example: '1101' },
                            name: { type: 'string', example: 'Kas' },
                            type: { type: 'string', enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] },
                            parentId: { type: 'string', format: 'uuid' },
                            description: { type: 'string' },
                        },
                        required: ['code', 'name', 'type'],
                    },
                },
            },
        },
        responses: {
            '201': { description: 'Account created', content: { 'application/json': { schema: successSchema('Account created successfully') } } },
        },
    },

    // ─── Finance: Journal Entries ──────────────────────────────────────────────
    {
        path: '/api/finance/journal-entries',
        method: 'get',
        summary: 'List journal entries',
        description: 'Retrieve all journal entries. Requires `finance:view` permission.',
        tags: ['Finance'],
        parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' }, description: 'Page number' },
            { name: 'limit', in: 'query', schema: { type: 'integer' }, description: 'Items per page' },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'POSTED', 'REVERSED'] } },
            { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Filter from date' },
            { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Filter to date' },
        ],
        responses: {
            '200': { description: 'List of journal entries', content: { 'application/json': { schema: paginatedSchema(journalEntrySchema) } } },
        },
    },
    {
        path: '/api/finance/journal-entries',
        method: 'post',
        summary: 'Create journal entry',
        description: 'Create a new journal entry with debit/credit lines. Total debit must equal total credit. Requires `finance:create` permission.',
        tags: ['Finance'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            date: { type: 'string', format: 'date' },
                            description: { type: 'string', example: 'Pendapatan dari penjualan' },
                            lines: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        accountId: { type: 'string', format: 'uuid' },
                                        debit: { type: 'number' },
                                        credit: { type: 'number' },
                                        description: { type: 'string' },
                                    },
                                    required: ['accountId'],
                                },
                                minItems: 2,
                            },
                        },
                        required: ['date', 'description', 'lines'],
                    },
                },
            },
        },
        responses: {
            '201': { description: 'Journal entry created', content: { 'application/json': { schema: successSchema('Journal entry created successfully') } } },
        },
    },

    // ─── Finance: Accounting Periods ───────────────────────────────────────────
    {
        path: '/api/finance/periods',
        method: 'get',
        summary: 'List accounting periods',
        description: 'Retrieve all accounting periods. Requires `finance:view` permission.',
        tags: ['Finance'],
        responses: {
            '200': {
                description: 'List of accounting periods',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                data: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string', format: 'uuid' },
                                            name: { type: 'string', example: 'September 2026' },
                                            startDate: { type: 'string', format: 'date' },
                                            endDate: { type: 'string', format: 'date' },
                                            status: { type: 'string', enum: ['OPEN', 'CLOSED'] },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    // ─── Finance: Reports ──────────────────────────────────────────────────────
    {
        path: '/api/finance/reports/trial-balance',
        method: 'get',
        summary: 'Get trial balance',
        description: 'Generate trial balance report for a specific period. Requires `reports:view` permission.',
        tags: ['Finance'],
        parameters: [
            { name: 'periodId', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Accounting period ID' },
            { name: 'asOfDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Date for trial balance' },
        ],
        responses: {
            '200': {
                description: 'Trial balance data',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                data: {
                                    type: 'object',
                                    properties: {
                                        accounts: { type: 'array', items: { type: 'object', properties: { code: { type: 'string' }, name: { type: 'string' }, debit: { type: 'number' }, credit: { type: 'number' } } } },
                                        totalDebit: { type: 'number' },
                                        totalCredit: { type: 'number' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    {
        path: '/api/finance/reports/balance-sheet',
        method: 'get',
        summary: 'Get balance sheet',
        description: 'Generate balance sheet report. Requires `reports:view` permission.',
        tags: ['Finance'],
        parameters: [
            { name: 'asOfDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Date for balance sheet' },
        ],
        responses: {
            '200': {
                description: 'Balance sheet data',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                data: {
                                    type: 'object',
                                    properties: {
                                        assets: { type: 'object', properties: { total: { type: 'number' }, items: { type: 'array' } } },
                                        liabilities: { type: 'object', properties: { total: { type: 'number' }, items: { type: 'array' } } },
                                        equity: { type: 'object', properties: { total: { type: 'number' }, items: { type: 'array' } } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    {
        path: '/api/finance/reports/income-statement',
        method: 'get',
        summary: 'Get income statement',
        description: 'Generate income statement (profit & loss) report. Requires `reports:view` permission.',
        tags: ['Finance'],
        parameters: [
            { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Period start date' },
            { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Period end date' },
        ],
        responses: {
            '200': {
                description: 'Income statement data',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                data: {
                                    type: 'object',
                                    properties: {
                                        revenue: { type: 'object', properties: { total: { type: 'number' }, items: { type: 'array' } } },
                                        expenses: { type: 'object', properties: { total: { type: 'number' }, items: { type: 'array' } } },
                                        netIncome: { type: 'number' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    {
        path: '/api/finance/reports/cash-flow',
        method: 'get',
        summary: 'Get cash flow statement',
        description: 'Generate cash flow statement report. Requires `reports:view` permission.',
        tags: ['Finance'],
        parameters: [
            { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
            '200': {
                description: 'Cash flow statement data',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                data: {
                                    type: 'object',
                                    properties: {
                                        operating: { type: 'object', properties: { total: { type: 'number' }, items: { type: 'array' } } },
                                        investing: { type: 'object', properties: { total: { type: 'number' }, items: { type: 'array' } } },
                                        financing: { type: 'object', properties: { total: { type: 'number' }, items: { type: 'array' } } },
                                        netCashFlow: { type: 'number' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    {
        path: '/api/finance/reports/general-ledger',
        method: 'get',
        summary: 'Get general ledger',
        description: 'Retrieve general ledger with all transactions. Requires `reports:view` permission.',
        tags: ['Finance'],
        parameters: [
            { name: 'accountId', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter by account' },
            { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
            '200': {
                description: 'General ledger data',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                data: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            date: { type: 'string', format: 'date' },
                                            entryNumber: { type: 'string' },
                                            description: { type: 'string' },
                                            debit: { type: 'number' },
                                            credit: { type: 'number' },
                                            balance: { type: 'number' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    {
        path: '/api/finance/aging-report',
        method: 'get',
        summary: 'Get aging report',
        description: 'Generate accounts receivable/payable aging report. Requires `reports:view` permission.',
        tags: ['Finance'],
        parameters: [
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['receivable', 'payable'] }, description: 'Report type' },
            { name: 'asOfDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
            '200': {
                description: 'Aging report data',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                data: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            clientName: { type: 'string' },
                                            current: { type: 'number' },
                                            days30: { type: 'number' },
                                            days60: { type: 'number' },
                                            days90: { type: 'number' },
                                            over90: { type: 'number' },
                                            total: { type: 'number' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    // ─── CRM: Leads ────────────────────────────────────────────────────────────
    {
        path: '/api/crm/leads',
        method: 'get',
        summary: 'List leads',
        description: 'Retrieve all leads for the current tenant. Requires `crm:view` permission.',
        tags: ['CRM'],
        parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'] } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
            '200': { description: 'List of leads', content: { 'application/json': { schema: paginatedSchema(leadSchema) } } },
        },
    },
    {
        path: '/api/crm/leads',
        method: 'post',
        summary: 'Create lead',
        description: 'Create a new lead in the CRM. Requires `crm:create` permission.',
        tags: ['CRM'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', example: 'John Doe' },
                            email: { type: 'string', format: 'email' },
                            phone: { type: 'string' },
                            company: { type: 'string' },
                            source: { type: 'string', enum: ['WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'COLD_CALL', 'OTHER'] },
                            notes: { type: 'string' },
                        },
                        required: ['name'],
                    },
                },
            },
        },
        responses: {
            '201': { description: 'Lead created', content: { 'application/json': { schema: successSchema('Lead created successfully') } } },
        },
    },

    // ─── CRM: Contacts ─────────────────────────────────────────────────────────
    {
        path: '/api/crm/contacts',
        method: 'get',
        summary: 'List contacts',
        description: 'Retrieve all contacts. Requires `crm:view` permission.',
        tags: ['CRM'],
        parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['CUSTOMER', 'SUPPLIER', 'PARTNER'] } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
            '200': { description: 'List of contacts', content: { 'application/json': { schema: paginatedSchema(contactSchema) } } },
        },
    },
    {
        path: '/api/crm/contacts',
        method: 'post',
        summary: 'Create contact',
        description: 'Create a new contact. Requires `crm:create` permission.',
        tags: ['CRM'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', example: 'John Doe' },
                            email: { type: 'string', format: 'email' },
                            phone: { type: 'string' },
                            company: { type: 'string' },
                            position: { type: 'string' },
                            type: { type: 'string', enum: ['CUSTOMER', 'SUPPLIER', 'PARTNER'] },
                        },
                        required: ['name', 'type'],
                    },
                },
            },
        },
        responses: {
            '201': { description: 'Contact created', content: { 'application/json': { schema: successSchema('Contact created successfully') } } },
        },
    },

    // ─── CRM: Deals ────────────────────────────────────────────────────────────
    {
        path: '/api/crm/deals',
        method: 'get',
        summary: 'List deals',
        description: 'Retrieve all deals in the pipeline. Requires `crm:view` permission.',
        tags: ['CRM'],
        parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'stage', in: 'query', schema: { type: 'string', enum: ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'] } },
        ],
        responses: {
            '200': { description: 'List of deals', content: { 'application/json': { schema: paginatedSchema(dealSchema) } } },
        },
    },
    {
        path: '/api/crm/deals',
        method: 'post',
        summary: 'Create deal',
        description: 'Create a new deal in the pipeline. Requires `crm:create` permission.',
        tags: ['CRM'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            title: { type: 'string', example: 'Project Website Redesign' },
                            contactId: { type: 'string', format: 'uuid' },
                            value: { type: 'number', example: 50000000 },
                            stage: { type: 'string', enum: ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION'] },
                            expectedCloseDate: { type: 'string', format: 'date' },
                            notes: { type: 'string' },
                        },
                        required: ['title', 'contactId', 'value'],
                    },
                },
            },
        },
        responses: {
            '201': { description: 'Deal created', content: { 'application/json': { schema: successSchema('Deal created successfully') } } },
        },
    },

    // ─── HR: Employees ─────────────────────────────────────────────────────────
    {
        path: '/api/hr/employees',
        method: 'get',
        summary: 'List employees',
        description: 'Retrieve all employees. Requires `hr:view` permission.',
        tags: ['HR'],
        parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'department', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'TERMINATED'] } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
            '200': { description: 'List of employees', content: { 'application/json': { schema: paginatedSchema(employeeSchema) } } },
        },
    },
    {
        path: '/api/hr/employees',
        method: 'post',
        summary: 'Create employee',
        description: 'Add a new employee. Requires `hr:create` permission.',
        tags: ['HR'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', example: 'Budi Santoso' },
                            email: { type: 'string', format: 'email' },
                            phone: { type: 'string' },
                            department: { type: 'string', example: 'Engineering' },
                            position: { type: 'string', example: 'Software Engineer' },
                            startDate: { type: 'string', format: 'date' },
                            salary: { type: 'number' },
                        },
                        required: ['name', 'email', 'department', 'position', 'startDate'],
                    },
                },
            },
        },
        responses: {
            '201': { description: 'Employee created', content: { 'application/json': { schema: successSchema('Employee created successfully') } } },
        },
    },

    // ─── HR: Attendance ────────────────────────────────────────────────────────
    {
        path: '/api/hr/attendance',
        method: 'get',
        summary: 'List attendance records',
        description: 'Retrieve attendance records. Requires `hr:view` permission.',
        tags: ['HR'],
        parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'employeeId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
            '200': { description: 'List of attendance records', content: { 'application/json': { schema: paginatedSchema(attendanceSchema) } } },
        },
    },
    {
        path: '/api/hr/attendance',
        method: 'post',
        summary: 'Clock in/out',
        description: 'Record clock-in or clock-out for the current user. Requires `hr:create` permission.',
        tags: ['HR'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            action: { type: 'string', enum: ['CLOCK_IN', 'CLOCK_OUT'] },
                        },
                        required: ['action'],
                    },
                },
            },
        },
        responses: {
            '200': { description: 'Attendance recorded', content: { 'application/json': { schema: successSchema('Attendance recorded successfully') } } },
        },
    },

    // ─── HR: Leaves ────────────────────────────────────────────────────────────
    {
        path: '/api/hr/leaves',
        method: 'get',
        summary: 'List leave requests',
        description: 'Retrieve leave requests. Requires `hr:view` permission.',
        tags: ['HR'],
        parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] } },
            { name: 'employeeId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
            '200': { description: 'List of leave requests', content: { 'application/json': { schema: paginatedSchema(leaveSchema) } } },
        },
    },
    {
        path: '/api/hr/leaves',
        method: 'post',
        summary: 'Create leave request',
        description: 'Submit a new leave request. Requires `hr:create` permission.',
        tags: ['HR'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', enum: ['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'OTHER'] },
                            startDate: { type: 'string', format: 'date' },
                            endDate: { type: 'string', format: 'date' },
                            reason: { type: 'string' },
                        },
                        required: ['type', 'startDate', 'endDate', 'reason'],
                    },
                },
            },
        },
        responses: {
            '201': { description: 'Leave request created', content: { 'application/json': { schema: successSchema('Leave request submitted successfully') } } },
        },
    },

    // ─── HR: Payroll ───────────────────────────────────────────────────────────
    {
        path: '/api/hr/payroll',
        method: 'get',
        summary: 'List payroll records',
        description: 'Retrieve payroll records. Requires `hr:view` permission.',
        tags: ['HR'],
        parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'month', in: 'query', schema: { type: 'integer', example: 9 }, description: 'Month (1-12)' },
            { name: 'year', in: 'query', schema: { type: 'integer', example: 2026 }, description: 'Year' },
        ],
        responses: {
            '200': {
                description: 'List of payroll records',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                data: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string', format: 'uuid' },
                                            employeeId: { type: 'string', format: 'uuid' },
                                            employeeName: { type: 'string' },
                                            month: { type: 'integer' },
                                            year: { type: 'integer' },
                                            baseSalary: { type: 'number' },
                                            allowances: { type: 'number' },
                                            deductions: { type: 'number' },
                                            netSalary: { type: 'number' },
                                            status: { type: 'string', enum: ['DRAFT', 'APPROVED', 'PAID'] },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    // ─── Inventory: Products ───────────────────────────────────────────────────
    {
        path: '/api/inventory/products',
        method: 'get',
        summary: 'List products',
        description: 'Retrieve all products. Requires `inventory:view` permission.',
        tags: ['Inventory'],
        parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
            '200': { description: 'List of products', content: { 'application/json': { schema: paginatedSchema(productSchema) } } },
        },
    },
    {
        path: '/api/inventory/products',
        method: 'post',
        summary: 'Create product',
        description: 'Add a new product to inventory. Requires `inventory:create` permission.',
        tags: ['Inventory'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            sku: { type: 'string', example: 'PRD-001' },
                            name: { type: 'string', example: 'Laptop ASUS' },
                            description: { type: 'string' },
                            category: { type: 'string' },
                            price: { type: 'number', example: 15000000 },
                            cost: { type: 'number', example: 12000000 },
                            stock: { type: 'integer', example: 50 },
                            minStock: { type: 'integer', example: 10 },
                            unit: { type: 'string', example: 'pcs' },
                        },
                        required: ['sku', 'name', 'price', 'cost'],
                    },
                },
            },
        },
        responses: {
            '201': { description: 'Product created', content: { 'application/json': { schema: successSchema('Product created successfully') } } },
        },
    },

    // ─── Inventory: Stock ──────────────────────────────────────────────────────
    {
        path: '/api/inventory/stock',
        method: 'get',
        summary: 'Get stock levels',
        description: 'Retrieve current stock levels for all products. Requires `inventory:view` permission.',
        tags: ['Inventory'],
        parameters: [
            { name: 'lowStock', in: 'query', schema: { type: 'boolean' }, description: 'Only show products with low stock' },
        ],
        responses: {
            '200': {
                description: 'Stock levels',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                data: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            productId: { type: 'string', format: 'uuid' },
                                            productName: { type: 'string' },
                                            sku: { type: 'string' },
                                            currentStock: { type: 'integer' },
                                            minStock: { type: 'integer' },
                                            status: { type: 'string', enum: ['OK', 'LOW', 'OUT_OF_STOCK'] },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    {
        path: '/api/inventory/stock',
        method: 'post',
        summary: 'Adjust stock',
        description: 'Manually adjust stock level for a product. Requires `inventory:edit` permission.',
        tags: ['Inventory'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            productId: { type: 'string', format: 'uuid' },
                            adjustment: { type: 'integer', example: -5, description: 'Positive to add, negative to subtract' },
                            reason: { type: 'string', example: 'Damaged goods' },
                        },
                        required: ['productId', 'adjustment', 'reason'],
                    },
                },
            },
        },
        responses: {
            '200': { description: 'Stock adjusted', content: { 'application/json': { schema: successSchema('Stock adjusted successfully') } } },
        },
    },

    // ─── Inventory: Categories ─────────────────────────────────────────────────
    {
        path: '/api/inventory/categories',
        method: 'get',
        summary: 'List categories',
        description: 'Retrieve all product categories. Requires `inventory:view` permission.',
        tags: ['Inventory'],
        responses: {
            '200': { description: 'List of categories', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: categorySchema } } } } } },
        },
    },

    // ─── Inventory: Suppliers ──────────────────────────────────────────────────
    {
        path: '/api/inventory/suppliers',
        method: 'get',
        summary: 'List suppliers',
        description: 'Retrieve all suppliers. Requires `inventory:view` permission.',
        tags: ['Inventory'],
        parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
            '200': { description: 'List of suppliers', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: supplierSchema } } } } } },
        },
    },

    // ─── POS: Transactions ─────────────────────────────────────────────────────
    {
        path: '/api/pos/transactions',
        method: 'get',
        summary: 'List POS transactions',
        description: 'Retrieve all POS transactions. Requires `pos:view` permission.',
        tags: ['POS'],
        parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'cashierId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
            '200': { description: 'List of POS transactions', content: { 'application/json': { schema: paginatedSchema(posTransactionSchema) } } },
        },
    },
    {
        path: '/api/pos/transactions',
        method: 'post',
        summary: 'Create POS transaction',
        description: 'Create a new POS transaction (sale). Requires `pos:create` permission.',
        tags: ['POS'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            items: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        productId: { type: 'string', format: 'uuid' },
                                        quantity: { type: 'integer', example: 2 },
                                    },
                                    required: ['productId', 'quantity'],
                                },
                            },
                            paymentMethod: { type: 'string', enum: ['CASH', 'CARD', 'E_WALLET', 'QRIS'] },
                            discount: { type: 'number', example: 0 },
                            notes: { type: 'string' },
                        },
                        required: ['items', 'paymentMethod'],
                    },
                },
            },
        },
        responses: {
            '201': { description: 'Transaction created', content: { 'application/json': { schema: successSchema('Transaction completed successfully') } } },
        },
    },

    // ─── POS: Refunds ──────────────────────────────────────────────────────────
    {
        path: '/api/pos/refunds',
        method: 'post',
        summary: 'Create refund',
        description: 'Process a refund for a POS transaction. Requires `pos:create` permission.',
        tags: ['POS'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            transactionId: { type: 'string', format: 'uuid' },
                            reason: { type: 'string' },
                            items: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        productId: { type: 'string', format: 'uuid' },
                                        quantity: { type: 'integer' },
                                    },
                                },
                            },
                        },
                        required: ['transactionId', 'reason'],
                    },
                },
            },
        },
        responses: {
            '201': { description: 'Refund processed', content: { 'application/json': { schema: successSchema('Refund processed successfully') } } },
        },
    },

    // ─── POS: Stock Adjustment ─────────────────────────────────────────────────
    {
        path: '/api/pos/stock-adjustment',
        method: 'post',
        summary: 'Adjust stock from POS',
        description: 'Adjust product stock from POS module. Requires `pos:create` permission.',
        tags: ['POS'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            productId: { type: 'string', format: 'uuid' },
                            adjustment: { type: 'integer' },
                            reason: { type: 'string' },
                        },
                        required: ['productId', 'adjustment', 'reason'],
                    },
                },
            },
        },
        responses: {
            '200': { description: 'Stock adjusted', content: { 'application/json': { schema: successSchema('Stock adjusted successfully') } } },
        },
    },

    // ─── POS: Kitchen Display ──────────────────────────────────────────────────
    {
        path: '/api/pos/kitchen/orders',
        method: 'get',
        summary: 'Kitchen display orders',
        description: 'Retrieve orders for kitchen display. Requires `pos:view` permission.',
        tags: ['POS'],
        parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'PREPARING', 'READY', 'SERVED'] } },
        ],
        responses: {
            '200': {
                description: 'Kitchen orders',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                data: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string', format: 'uuid' },
                                            transactionId: { type: 'string', format: 'uuid' },
                                            tableNumber: { type: 'string' },
                                            items: { type: 'array', items: { type: 'object' } },
                                            status: { type: 'string', enum: ['PENDING', 'PREPARING', 'READY', 'SERVED'] },
                                            createdAt: { type: 'string', format: 'date-time' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    // ─── POS: Tables ───────────────────────────────────────────────────────────
    {
        path: '/api/pos/tables',
        method: 'get',
        summary: 'List tables',
        description: 'Retrieve all POS tables with their current status. Requires `pos:view` permission.',
        tags: ['POS'],
        responses: {
            '200': {
                description: 'List of tables',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                data: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string', format: 'uuid' },
                                            number: { type: 'string', example: 'T1' },
                                            capacity: { type: 'integer', example: 4 },
                                            status: { type: 'string', enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'] },
                                            section: { type: 'string', example: 'Indoor' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    // ─── AI: Query ─────────────────────────────────────────────────────────────
    {
        path: '/api/ai/query',
        method: 'post',
        summary: 'Natural language query',
        description: 'Process a natural language query against business data. Supports reporting, comparison, filtering, aggregation, and prediction queries. Rate limit: 50 requests per minute.',
        tags: ['AI'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: aiQuerySchema,
                },
            },
        },
        responses: {
            '200': {
                description: 'Query result',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                data: {
                                    type: 'object',
                                    properties: {
                                        answer: { type: 'string', example: 'Total penjualan bulan ini adalah Rp 150.000.000' },
                                        query: { type: 'string' },
                                        module: { type: 'string' },
                                        executionTime: { type: 'number', description: 'Execution time in milliseconds' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    // ─── AI: Agents ────────────────────────────────────────────────────────────
    {
        path: '/api/ai/agents',
        method: 'get',
        summary: 'List AI agents',
        description: 'Retrieve all available AI agents and their status.',
        tags: ['AI'],
        responses: {
            '200': { description: 'List of AI agents', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: aiAgentSchema } } } } } },
        },
    },
    {
        path: '/api/ai/agents',
        method: 'post',
        summary: 'Execute agent action',
        description: 'Execute an action through an AI agent.',
        tags: ['AI'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            agentId: { type: 'string', format: 'uuid' },
                            action: { type: 'string', example: 'predict_cash_flow' },
                            parameters: { type: 'object' },
                        },
                        required: ['agentId', 'action'],
                    },
                },
            },
        },
        responses: {
            '200': {
                description: 'Agent action result',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                data: {
                                    type: 'object',
                                    properties: {
                                        agentId: { type: 'string' },
                                        action: { type: 'string' },
                                        result: { type: 'object' },
                                        executionTime: { type: 'number' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    // ─── Analytics: Dashboard ──────────────────────────────────────────────────
    {
        path: '/api/analytics/dashboard',
        method: 'get',
        summary: 'Dashboard summary',
        description: 'Retrieve analytics dashboard summary with key metrics. Requires `analytics:view` permission.',
        tags: ['Analytics'],
        responses: {
            '200': {
                description: 'Dashboard summary',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                data: {
                                    type: 'object',
                                    properties: {
                                        totalRevenue: { type: 'number' },
                                        totalExpenses: { type: 'number' },
                                        netProfit: { type: 'number' },
                                        totalCustomers: { type: 'integer' },
                                        totalProducts: { type: 'integer' },
                                        pendingInvoices: { type: 'integer' },
                                        overdueInvoices: { type: 'integer' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    // ─── Analytics: Metrics ────────────────────────────────────────────────────
    {
        path: '/api/analytics/metrics',
        method: 'get',
        summary: 'List metrics',
        description: 'Retrieve available analytics metrics. Requires `analytics:view` permission.',
        tags: ['Analytics'],
        parameters: [
            { name: 'module', in: 'query', schema: { type: 'string', enum: ['finance', 'crm', 'hr', 'inventory', 'pos'] }, description: 'Filter by module' },
        ],
        responses: {
            '200': {
                description: 'List of metrics',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                data: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string' },
                                            name: { type: 'string' },
                                            module: { type: 'string' },
                                            value: { type: 'number' },
                                            unit: { type: 'string' },
                                            trend: { type: 'string', enum: ['up', 'down', 'stable'] },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    // ─── Analytics: Refresh Views ──────────────────────────────────────────────
    {
        path: '/api/analytics/refresh-views',
        method: 'post',
        summary: 'Refresh materialized views',
        description: 'Refresh analytics materialized views for up-to-date data. Requires `analytics:edit` permission.',
        tags: ['Analytics'],
        responses: {
            '200': { description: 'Views refreshed', content: { 'application/json': { schema: successSchema('Analytics views refreshed successfully') } } },
        },
    },

    // ─── Settings: Sessions ────────────────────────────────────────────────────
    {
        path: '/api/settings/sessions',
        method: 'get',
        summary: 'List active sessions',
        description: 'Retrieve all active sessions for the current user. Requires `settings:view` permission.',
        tags: ['Settings'],
        responses: {
            '200': {
                description: 'List of sessions',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                data: { type: 'array', items: sessionSchema },
                            },
                        },
                    },
                },
            },
        },
    },
    {
        path: '/api/settings/sessions/[id]',
        method: 'delete',
        summary: 'Revoke session',
        description: 'Revoke (terminate) a specific session. Requires `settings:view` permission.',
        tags: ['Settings'],
        parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Session ID' },
        ],
        responses: {
            '200': { description: 'Session revoked', content: { 'application/json': { schema: successSchema('Session revoked successfully') } } },
            '404': { description: 'Session not found', content: { 'application/json': { schema: errorSchema } } },
        },
    },
    {
        path: '/api/settings/sessions/revoke-all',
        method: 'post',
        summary: 'Revoke all sessions',
        description: 'Revoke all sessions except the current one. Requires `settings:view` permission.',
        tags: ['Settings'],
        responses: {
            '200': { description: 'All sessions revoked', content: { 'application/json': { schema: successSchema('All sessions revoked successfully') } } },
        },
    },

    // ─── Settings: Security (2FA) ──────────────────────────────────────────────
    {
        path: '/api/settings/security/2fa',
        method: 'get',
        summary: 'Get 2FA status',
        description: 'Check if two-factor authentication is enabled for the current user. Requires `settings:view` permission.',
        tags: ['Settings'],
        responses: {
            '200': {
                description: '2FA status',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean' },
                                data: {
                                    type: 'object',
                                    properties: {
                                        enabled: { type: 'boolean' },
                                        method: { type: 'string', enum: ['TOTP', 'SMS', 'EMAIL'] },
                                        lastVerified: { type: 'string', format: 'date-time' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    {
        path: '/api/settings/security/2fa',
        method: 'put',
        summary: 'Enable 2FA',
        description: 'Enable or update two-factor authentication. Requires `settings:edit` permission.',
        tags: ['Settings'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            action: { type: 'string', enum: ['ENABLE', 'DISABLE'] },
                            method: { type: 'string', enum: ['TOTP', 'SMS', 'EMAIL'] },
                            verificationCode: { type: 'string', example: '123456' },
                        },
                        required: ['action'],
                    },
                },
            },
        },
        responses: {
            '200': { description: '2FA updated', content: { 'application/json': { schema: successSchema('Two-factor authentication updated successfully') } } },
            '400': { description: 'Invalid verification code', content: { 'application/json': { schema: errorSchema } } },
        },
    },
];

// ============================================================
// OpenAPI Spec Generator
// ============================================================

/**
 * Generate the complete OpenAPI 3.0 specification for Qalcuity API.
 *
 * @returns OpenAPI 3.0 spec object (JSON-serializable)
 */
export function generateOpenApiSpec() {
    // Group paths by route
    const paths: Record<string, Record<string, OpenAPIOperation>> = {};

    for (const route of routes) {
        const path = route.path;
        if (!paths[path]) {
            paths[path] = {};
        }

        const operation: OpenAPIOperation = {
            summary: route.summary,
            description: route.description,
            tags: route.tags,
            responses: route.responses,
        };

        // Add security (default: JWT Bearer)
        if (route.security !== undefined) {
            operation.security = route.security;
        } else {
            operation.security = [{ BearerAuth: [] }];
        }

        // Add parameters
        if (route.parameters && route.parameters.length > 0) {
            operation.parameters = route.parameters;
        }

        // Add request body
        if (route.requestBody) {
            operation.requestBody = route.requestBody;
        }

        paths[path][route.method] = operation;
    }

    return {
        openapi: '3.0.3',
        info: {
            title: 'Qalcuity API',
            version: '11.24.0',
            description: `Qalcuity — Business Operating System API.

## Authentication
All endpoints (except Auth) require JWT Bearer token authentication.
Obtain a token via \`POST /api/auth/login\` and include it in the \`Authorization\` header:
\`\`\`
Authorization: Bearer <your-token>
\`\`\`

## Multi-tenancy
All data is scoped to your tenant. The \`tenantId\` is automatically extracted from your JWT token.

## Error Format
All errors follow a standard format:
\`\`\`json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
\`\`\`

## Rate Limiting
Rate limits are applied per endpoint category:
- **Auth endpoints**: 5 requests / 15 minutes
- **API endpoints**: 100 requests / 15 minutes
- **Search/Analytics**: 50 requests / minute
- **File upload**: 10 requests / hour

## Pagination
List endpoints support pagination via \`page\` and \`limit\` query parameters.
Response includes \`pagination\` object with \`page\`, \`limit\`, \`total\`, and \`totalPages\`.`,
            contact: {
                name: 'Qalcuity Support',
                email: 'support@qalcuity.com',
                url: 'https://qalcuity.com',
            },
            license: {
                name: 'Proprietary',
                url: 'https://qalcuity.com/terms',
            },
        },
        servers: [
            {
                url: 'https://qalcuity.com',
                description: 'Production server',
            },
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
        ],
        security: [{ BearerAuth: [] }],
        paths,
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT token obtained from POST /api/auth/login',
                },
            },
            schemas: {
                Error: errorSchema,
                SuccessMessage: successSchema(),
                Invoice: invoiceSchema,
                Payment: paymentSchema,
                Quotation: quotationSchema,
                PurchaseOrder: purchaseOrderSchema,
                Account: accountSchema,
                JournalEntry: journalEntrySchema,
                Lead: leadSchema,
                Contact: contactSchema,
                Deal: dealSchema,
                Employee: employeeSchema,
                Attendance: attendanceSchema,
                Leave: leaveSchema,
                Product: productSchema,
                Category: categorySchema,
                Supplier: supplierSchema,
                PosTransaction: posTransactionSchema,
                Session: sessionSchema,
                AiQuery: aiQuerySchema,
                AiAgent: aiAgentSchema,
            },
        },
        tags: [
            {
                name: 'Auth',
                description: 'Authentication and registration endpoints',
            },
            {
                name: 'Finance',
                description: 'Financial management — invoices, payments, quotations, purchase orders, chart of accounts, journal entries, reports',
            },
            {
                name: 'CRM',
                description: 'Customer Relationship Management — leads, contacts, deals',
            },
            {
                name: 'HR',
                description: 'Human Resources — employees, attendance, leaves, payroll',
            },
            {
                name: 'Inventory',
                description: 'Inventory management — products, stock, categories, suppliers',
            },
            {
                name: 'POS',
                description: 'Point of Sale — transactions, refunds, kitchen display, tables',
            },
            {
                name: 'AI',
                description: 'AI features — natural language query, AI agents',
            },
            {
                name: 'Analytics',
                description: 'Analytics dashboard, metrics, materialized views',
            },
            {
                name: 'Settings',
                description: 'User settings — sessions, security, 2FA',
            },
        ],
    };
}
