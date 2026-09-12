/**
 * Centralized API error/success messages (English).
 *
 * Backend API routes use these constants instead of hardcoded strings.
 * Frontend handles localization via the i18n system — these messages
 * serve as the machine-readable source of truth consumed by the UI.
 *
 * Convention: every message has a matching code that the frontend can
 * use to look up the translated version in its locale files.
 */

// ---------------------------------------------------------------------------
// Generic
// ---------------------------------------------------------------------------
export const MSG = {
    DATA_NOT_FOUND: 'Data not found',
    INVALID_INPUT: 'Invalid input',
    INVALID_DATA: 'Invalid data',
    ID_REQUIRED: 'ID is required',
    TOKEN_REQUIRED: 'Token is required',
    FILE_NOT_FOUND: 'File not found',
    FILE_UPLOAD_REQUIRED: 'File upload is required',
    UNAUTHORIZED: 'Unauthorized',
    FORBIDDEN: 'Forbidden',
    TOO_MANY_REQUESTS: 'Too many requests. Please try again.',

    // ---------------------------------------------------------------------------
    // Prisma / Database
    // ---------------------------------------------------------------------------
    DUPLICATE_DATA: 'Data already exists (duplicate)',
    RELATED_DATA_NOT_FOUND: 'Related data not found. Ensure the reference is valid.',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please contact administrator.',
    DATABASE_ERROR: 'A database error occurred',
    INTERNAL_SERVER_ERROR: 'An internal server error occurred',

    // ---------------------------------------------------------------------------
    // Auth
    // ---------------------------------------------------------------------------
    EMAIL_ALREADY_REGISTERED: 'Email already registered',
    PASSWORD_MIN_LENGTH: 'Password must be at least 8 characters',
    INVALID_EMAIL_FORMAT: 'Invalid email format',
    INVALID_INPUT_FORMAT: 'Invalid input format',
    INVALID_DATA_REFERENCE: 'Invalid data reference',
    TOKEN_NOT_FOUND: 'Token not found',
    RESET_TOKEN_INVALID_OR_EXPIRED: 'Reset token is invalid or has expired.',
    PASSWORD_RESET_SUCCESS: 'Password has been reset successfully.',
    RESET_TOKEN_REQUIRED: 'Reset token and new password are required.',

    // ---------------------------------------------------------------------------
    // Users / Roles
    // ---------------------------------------------------------------------------
    USER_NOT_FOUND: 'User not found',
    ROLE_NOT_FOUND: 'Role not found',
    TENANT_NOT_FOUND: 'Tenant not found',

    // ---------------------------------------------------------------------------
    // Tasks / Projects
    // ---------------------------------------------------------------------------
    TASK_NOT_FOUND: 'Task not found',
    PROJECT_NOT_FOUND: 'Project not found',
    PROJECT_MEMBER_NOT_FOUND: 'Project member not found',
    PROJECT_HAS_ACTIVE_TASKS: 'Cannot delete project with active tasks. Complete or cancel all tasks first.',
    PROJECT_MEMBER_ALREADY_EXISTS: 'Member already added to this project',
    PROJECT_RESOURCE_OVERLAP: 'Resource allocation overlaps with an existing entry',
    PROJECT_RESOURCE_END_BEFORE_START: 'End date must be after start date',
    RESOURCE_ALLOCATION_NOT_FOUND: 'Resource allocation not found',

    // ---------------------------------------------------------------------------
    // HR
    // ---------------------------------------------------------------------------
    EMPLOYEE_NOT_FOUND: 'Employee not found',
    EMPLOYEE_EMAIL_DUPLICATE: 'Email already used by another employee',
    EMPLOYEE_DATA_DUPLICATE: 'Employee data already exists',
    EMPLOYEE_ACCESS_DENIED: 'Employee not found or access denied',
    LEAVE_REQUEST_NOT_FOUND: 'Leave request not found',
    LEAVE_END_DATE_BEFORE_START: 'End date must be after start date',
    PAYROLL_RECORD_NOT_FOUND: 'Payroll record not found',
    INVALID_STATUS_TRANSITION: 'Invalid status transition',
    DEPARTMENT_NOT_FOUND: 'Department not found',
    DEPARTMENT_NAME_DUPLICATE: 'A department with this name already exists',
    DEPARTMENT_HAS_EMPLOYEES: 'Cannot delete department with active employees',
    DEPARTMENT_ACCESS_DENIED: 'Department not found or access denied',

    // ---------------------------------------------------------------------------
    // Inventory
    // ---------------------------------------------------------------------------
    PRODUCT_NOT_FOUND: 'Product not found',
    PRODUCT_DELETED: 'Product deleted successfully',
    PRODUCT_SKU_DUPLICATE: 'A product with this SKU already exists',
    PRODUCT_ADMIN_ONLY_CREATE: 'Only admin can create products',
    PRODUCT_ADMIN_ONLY_UPDATE: 'Only admin can update products',
    PRODUCT_ADMIN_ONLY_DELETE: 'Only admin can delete products',
    CATEGORY_NOT_FOUND: 'Category not found',
    CATEGORY_NAME_DUPLICATE: 'A category with this name already exists',
    CATEGORY_DELETED: 'Category deleted successfully',
    SUPPLIER_NOT_FOUND: 'Supplier not found',
    WAREHOUSE_NOT_FOUND: 'Warehouse not found',
    WAREHOUSE_DELETED: 'Warehouse deleted successfully',
    STOCK_OPNAME_NOT_FOUND: 'Stock opname not found',

    // ---------------------------------------------------------------------------
    // Finance
    // ---------------------------------------------------------------------------
    INVOICE_NOT_FOUND: 'Invoice not found',
    PAYMENT_NOT_FOUND: 'Payment not found',
    PERIOD_NOT_FOUND: 'Period not found',
    QUOTATION_NOT_FOUND: 'Quotation not found',
    PURCHASE_ORDER_NOT_FOUND: 'Purchase Order not found',
    ACCOUNT_NOT_FOUND: 'Account not found',
    PARENT_ACCOUNT_NOT_FOUND: 'Parent account not found',
    INVALID_ACTION: 'Invalid action',
    INVALID_YEAR: 'Invalid year',
    INVALID_PARAMETERS: 'Invalid parameters',
    CONFIRMATION_TEXT_MUST_BE_CLOSE: 'Confirmation text must be "CLOSE"',
    BANK_TRANSACTION_NOT_FOUND: 'Bank transaction not found',
    BOOK_TRANSACTION_NOT_FOUND: 'Book transaction not found',
    BANK_TRANSACTION_ID_REQUIRED: 'bankTransactionId is required',
    BANK_AND_BOOK_IDS_REQUIRED: 'bankTransactionId and bookTransactionId are required',

    // ---------------------------------------------------------------------------
    // CRM
    // ---------------------------------------------------------------------------
    DEAL_NOT_FOUND: 'Deal not found',
    SUBJECT_REQUIRED: 'Subject is required',
    SUBJECT_MAX_LENGTH: 'Subject must be at most 255 characters',
    EMAIL_BODY_REQUIRED: 'Email body is required',
    UNSUPPORTED_FILE_FORMAT: 'Unsupported file format. Use .csv, .xlsx, or .xls',
    CONTACT_NOT_FOUND: 'Contact not found',
    CONTACT_NOT_FOUND_OR_DENIED: 'Contact not found or access denied',
    ACTIVITY_NOT_FOUND: 'Activity not found',
    EMAIL_SEND_FAILED: 'Failed to send email',
    LEAD_NOT_FOUND: 'Lead not found',
    LEAD_IMPORT_COLUMNS_REQUIRED: 'Column "name" is required in the file',
    LEAD_IMPORT_FILE_EMPTY: 'File is empty or has no data',
    DEAL_STAGE_INVALID: 'Invalid stage',
    DEAL_STAGE_CHANGED: 'Stage changed',
    DEAL_CREATED: 'Deal created',
    DEAL_ADMIN_ONLY_CREATE: 'Only admin can create deals',
    DEAL_ADMIN_ONLY_UPDATE: 'Only admin can update deals',
    CONTACT_ADMIN_ONLY_CREATE: 'Only admin can create contacts',
    CONTACT_ADMIN_ONLY_UPDATE: 'Only admin can update contacts',
    CONTACT_ADMIN_ONLY_DELETE: 'Only admin can delete contacts',
    CONTACT_MEMBER_CANNOT_DELETE: 'Member cannot delete contacts',
    LEAD_ADMIN_ONLY_CREATE: 'Only admin can create leads',
    LEAD_ADMIN_ONLY_UPDATE: 'Only admin can update leads',
    LEAD_ADMIN_ONLY_DELETE: 'Only admin can delete leads',
    LEAD_IMPORT_ADMIN_ONLY: 'Only admin can import leads',
    CONTACT_IMPORT_ADMIN_ONLY: 'Only admin can import contacts',

    // ---------------------------------------------------------------------------
    // POS
    // ---------------------------------------------------------------------------
    TRANSACTION_NOT_FOUND: 'Transaction not found',
    TRANSACTION_VOID_ONLY: 'Invalid status. Only VOIDED is allowed.',
    TRANSACTION_ONLY_COMPLETED_CAN_VOID: 'Only COMPLETED transactions can be voided',
    TRANSACTION_ADMIN_ONLY_CANCEL: 'Only admin can cancel transactions',
    TRANSACTION_NOT_COMPLETED: 'Transaction not found or not in completed status',
    TERMINAL_NOT_FOUND: 'Terminal not found',
    TERMINAL_DELETED: 'Terminal deleted successfully',
    TERMINAL_HAS_ACTIVE_SESSION: 'Terminal already has an active session. Close the session first.',
    TERMINAL_NOT_ACTIVE: 'Terminal is not active. Only active terminals can open sessions.',
    TERMINAL_ADMIN_ONLY_CREATE: 'Only admin can create terminals',
    TERMINAL_ADMIN_ONLY_UPDATE: 'Only admin can update terminals',
    TERMINAL_ADMIN_ONLY_DELETE: 'Only admin can delete terminals',
    TERMINAL_CANNOT_DELETE_ACTIVE_SESSION: 'Cannot delete terminal with active session. Close the session first.',
    TABLE_NOT_FOUND: 'Table not found',
    TABLE_NUMBER_DUPLICATE: 'Table number already in use',
    TABLE_DELETED: 'Table deleted successfully',
    TABLE_HAS_RESERVATION: 'Table already has a reservation at that time',
    TABLE_ADMIN_ONLY_CREATE: 'Only admin can create tables',
    TABLE_ADMIN_ONLY_UPDATE: 'Only admin can update tables',
    TABLE_ADMIN_ONLY_DELETE: 'Only admin can delete tables',
    TABLE_CANNOT_DELETE_ACTIVE_SESSION: 'Cannot delete table with active session. Complete the session first.',
    TABLE_CANNOT_DELETE_ACTIVE_RESERVATION: 'Cannot delete table with active reservation. Cancel or complete the reservation first.',
    TABLE_STATUS_TRANSITION_INVALID: 'Invalid table status transition',
    TABLE_CAPACITY_EXCEEDED: 'Table capacity is less than the number of guests',
    RESERVATION_NOT_FOUND: 'Reservation not found',
    RESERVATION_ADMIN_ONLY_CREATE: 'Only admin can create reservations',
    RESERVATION_ADMIN_ONLY_UPDATE: 'Only admin can update reservations',
    RESERVATION_ADMIN_ONLY_CANCEL: 'Only admin can cancel reservations',
    SESSION_NOT_FOUND: 'Session not found',
    SESSION_CLOSED: 'Session not found or already closed',
    SESSION_ONLY_OPEN_CAN_CLOSE: 'Only OPEN sessions can be closed',
    REFUND_NOT_FOUND: 'Refund not found',
    REFUND_STATUS_INVALID: 'Status must be APPROVED or REJECTED',
    REFUND_ALREADY_PROCESSED: 'Refund has already been processed',
    REFUND_ADMIN_ONLY: 'Only admin can approve or reject refunds',
    REFUND_AMOUNT_EXCEEDS_TRANSACTION: 'Refund amount exceeds transaction total',
    REWARD_NOT_FOUND: 'Reward not found',
    REWARD_OUT_OF_STOCK: 'Reward out of stock',
    REWARD_INACTIVE: 'Reward not found or already inactive',
    REWARD_DEACTIVATED: 'Reward deactivated successfully',
    REWARD_ADMIN_ONLY_CREATE: 'Only admin can create rewards',
    REWARD_ADMIN_ONLY_UPDATE: 'Only admin can update rewards',
    REWARD_ADMIN_ONLY_DELETE: 'Only admin can delete rewards',
    MEMBER_NOT_FOUND: 'Member not found',
    LOYALTY_POINTS_INSUFFICIENT: 'Insufficient points',
    KITCHEN_STATION_NOT_FOUND: 'Kitchen station not found',
    KITCHEN_STATION_NAME_DUPLICATE: 'Station name already in use',
    KITCHEN_STATION_DELETED: 'Kitchen station deleted successfully',
    KITCHEN_STATION_ADMIN_ONLY_CREATE: 'Only admin can create kitchen stations',
    KITCHEN_STATION_ADMIN_ONLY_UPDATE: 'Only admin can update kitchen stations',
    KITCHEN_STATION_ADMIN_ONLY_DELETE: 'Only admin can delete kitchen stations',
    KITCHEN_STATION_CANNOT_DELETE_ACTIVE_ORDERS: 'Cannot delete station with active orders. Wait for all orders to complete.',
    KITCHEN_ORDER_NOT_FOUND: 'Kitchen order not found',
    KITCHEN_ORDER_TRANSITION_INVALID: 'Invalid transition',
    KITCHEN_ORDER_ADMIN_ONLY_CREATE: 'Only admin can create kitchen orders',
    KITCHEN_ORDER_ADMIN_ONLY_UPDATE: 'Only admin can update kitchen order status',

    // ---------------------------------------------------------------------------
    // Field Service
    // ---------------------------------------------------------------------------
    JOB_NOT_FOUND: 'Job not found',
    CHECKLIST_NOT_FOUND: 'Checklist not found',

    // ---------------------------------------------------------------------------
    // Billing
    // ---------------------------------------------------------------------------
    SUBSCRIPTION_NOT_FOUND: 'Subscription not found',
    INVALID_SUBSCRIPTION_PLAN: 'Invalid subscription plan',
    PAYMENT_ALREADY_PROCESSED: 'Payment already processed',
    BILLING_PROOF_SUBMITTED: 'Payment proof submitted successfully. Waiting for admin verification.',
    PAYMENT_VERIFIED: 'Payment verified successfully. Tenant subscription has been activated.',
    PAYMENT_REJECTED: 'Payment rejected.',
    FILE_TOO_LARGE: 'File size must not exceed 5MB',
    UNSUPPORTED_FILE_TYPE: 'Unsupported file type. Use JPG, PNG, WebP, or PDF',
    FILE_UPLOAD_SUCCESS: 'File uploaded successfully',

    // ---------------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------------
    PLAN_NOT_FOUND: 'Plan not found',
    PLAN_NAME_REQUIRED: 'Plan name is required',
    SLUG_REQUIRED: 'Slug is required',
    SLUG_IN_USE: 'Slug already in use',
    SLUG_INVALID_FORMAT: 'Slug must contain only lowercase letters, numbers, and hyphens',

    // ---------------------------------------------------------------------------
    // Approval
    // ---------------------------------------------------------------------------
    APPROVAL_REQUEST_NOT_FOUND: 'Approval request not found',
    APPROVAL_LEVEL_NOT_FOUND: 'Approval level not found',

    // ---------------------------------------------------------------------------
    // Integration / Settings
    // ---------------------------------------------------------------------------
    INTEGRATION_NOT_FOUND: 'Integration not found',
    INVALID_PORT: 'Invalid port',
    PORT_RANGE: 'Port must be between 1-65535',
    INVALID_WHATSAPP_KEY_FORMAT: 'Invalid WhatsApp API Key format',
    INVALID_MIDTRANS_KEY_FORMAT: 'Invalid Midtrans Server Key format (must start with SB-Mid-)',
    INVALID_XENDIT_KEY_FORMAT: 'Invalid Xendit Secret Key format (must start with xnd_)',

    // ---------------------------------------------------------------------------
    // Workflow
    // ---------------------------------------------------------------------------
    INVALID_TRANSITION: 'Invalid transition',
    ENTITY_TYPE_REQUIRED: 'entityType is required',
    WORKFLOW_CONFIG_STATES_ARRAY: 'config.states must be a non-empty array',
    WORKFLOW_CONFIG_TRANSITIONS_ARRAY: 'config.transitions must be an array',
    WORKFLOW_SYSTEM_CANNOT_DELETE: 'Cannot delete system workflow',
    EMAIL_SENT_TO: 'Email sent to',

    // ---------------------------------------------------------------------------
    // AI
    // ---------------------------------------------------------------------------
    QUERY_REQUIRED: 'Query is required',
    UPLOAD_FILE_REQUIRED: 'File is required',
    UPLOAD_FILE_TYPE_NOT_SUPPORTED: 'File type not supported',
    UPLOAD_SUCCESS: 'File uploaded successfully',
    UPLOAD_RATE_LIMIT: 'Too many uploads. Please try again.',
    ANALYTICS_DASHBOARD_NOT_FOUND: 'Dashboard not found',
    ANALYTICS_CHART_NOT_FOUND: 'Chart not found',
    ANALYTICS_REPORT_NOT_FOUND: 'Report not found',
    ANALYTICS_ALERT_RULE_NOT_FOUND: 'Alert rule not found',
    ANALYTICS_ALERT_TRIGGER_NOT_FOUND: 'Alert trigger not found',
    ANALYTICS_ALERT_TRIGGER_ALREADY_ACKNOWLEDGED: 'Alert trigger already acknowledged',
    ANALYTICS_KPI_NOT_FOUND: 'KPI not found',
    WORKFLOW_DEFINITION_NOT_FOUND: 'Workflow definition not found',
    WORKFLOW_SYSTEM_CANNOT_MODIFY: 'Cannot modify system workflow',
    WORKFLOW_ENTITY_TYPE_REQUIRED: 'entityType is required',
    WORKFLOW_TRANSITION_FAILED: 'Invalid transition',
    WORKFLOW_ENTITY_NOT_FOUND: 'Entity not found or access denied',
    WORKFLOW_CONFIG_INITIAL_STATE_REQUIRED: 'config.initialState is required',
    WORKFLOW_CONFIG_FINAL_STATES_ARRAY: 'config.finalStates must be an array',
    WORKFLOW_DEFINITION_FIELDS_REQUIRED: 'entityType, name, and config are required',
    MONTH_NAMES_INVALID: 'Invalid month names',
    QUERY_MAX_LENGTH: 'Query must be at most 500 characters',
    FILE_REQUIRED: 'File is required',
    FILE_NAME_REQUIRED: 'File name is required',
    INVALID_DOCUMENT_TYPE: 'Invalid document type',

    // -------------------------------------------------------------------
    // Field Service
    // -------------------------------------------------------------------
    JOB_NOT_FOUND_EN: 'Job not found',
    CHECKLIST_NOT_FOUND_EN: 'Checklist not found',
    APPROVAL_REQUEST_NOT_FOUND_EN: 'Approval request not found',
    APPROVAL_LEVEL_NOT_FOUND_EN: 'Approval level not found',
    PLAN_NOT_FOUND_EN: 'Plan not found',
    BANK_TRANSACTION_NOT_FOUND_EN: 'Bank transaction not found',
    SESSION_NOT_FOUND_OR_DISABLED: 'Session not found or already disabled',
    INDUSTRY_PACK_NOT_FOUND: 'Industry pack not found',
    ORDER_ID_AND_STATUS_REQUIRED: 'orderId and status are required',
    INTEGRATION_ID_REQUIRED: 'Integration ID is required',
    SMTP_HOST_PORT_EMAIL_REQUIRED: 'SMTP Host, Port, and Email are required',
    SMTP_HOST_PORT_EMAIL_REQUIRED_FOR_TEST: 'SMTP Host, Port, and Email are required for test',
    ENTITY_PARAM_REQUIRED: 'Parameter "entity" is required',
    SUBJECT_AND_MESSAGE_REQUIRED: 'Subject and message are required',
    PLAN_SLUG_REQUIRED: 'Plan slug is required',
    FEATURE_KEY_REQUIRED: 'Feature key is required',
    PERIOD_NAME_REQUIRED: 'Period name is required',
    START_DATE_REQUIRED: 'Start date is required',
    END_DATE_REQUIRED: 'End date is required',
    SLUG_ONLY_LOWERCASE_HYPHEN: 'Slug must contain only lowercase letters, numbers, and hyphens',
    FILE_CANNOT_BE_EMPTY: 'File cannot be empty',
    FILE_UPLOAD_NOT_EMPTY: 'File upload must not be empty',
    NAME_REQUIRED: 'Name is required',

    // -----------------------------------------------------------------------
    // AI / Anomaly Detection
    // -----------------------------------------------------------------------
    ANOMALY_NOT_FOUND: 'Anomaly not found',
    ANOMALY_INVALID_STATUS: 'Invalid anomaly status',
    ANOMALY_STATUS_UPDATED: 'Anomaly status updated',
    ANOMALY_SCAN_FAILED: 'Anomaly scan failed',
    ANOMALY_ADMIN_ONLY: 'Only admin can manage anomalies',
} as const;

export type ApiMessageKey = keyof typeof MSG;
