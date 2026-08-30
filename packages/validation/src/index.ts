// ============================================
// @qalcuity/validation
// Shared validation rules & schemas
// ============================================

// --------------------------------------------
// Email Validation
// --------------------------------------------

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

/**
 * Validate email with detailed error message
 */
export function validateEmail(email: string): ValidationResult {
    if (!email || email.trim().length === 0) {
        return { valid: false, error: 'Email wajib diisi' };
    }
    if (!isValidEmail(email)) {
        return { valid: false, error: 'Format email tidak valid' };
    }
    if (email.length > 255) {
        return { valid: false, error: 'Email terlalu panjang (maks 255 karakter)' };
    }
    return { valid: true };
}

// --------------------------------------------
// Phone Validation
// --------------------------------------------

/**
 * Validate Indonesian phone number
 * Supports formats: 08xx, +628xx, 628xx
 */
export function isValidPhone(phone: string): boolean {
    const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,11}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

/**
 * Validate phone with detailed error message
 */
export function validatePhone(phone: string): ValidationResult {
    if (!phone || phone.trim().length === 0) {
        return { valid: true }; // Phone is optional in most cases
    }
    const cleaned = phone.replace(/[\s-]/g, '');
    if (!isValidPhone(cleaned)) {
        return {
            valid: false,
            error: 'Nomor telepon tidak valid. Gunakan format: 08xx, +628xx, atau 628xx',
        };
    }
    return { valid: true };
}

// --------------------------------------------
// NIK (Nomor Induk Kependudukan) Validation
// --------------------------------------------

/**
 * Validate Indonesian NIK (16 digits)
 */
export function isValidNIK(nik: string): boolean {
    const nikRegex = /^[0-9]{16}$/;
    return nikRegex.test(nik);
}

/**
 * Validate NIK with detailed error message
 */
export function validateNIK(nik: string): ValidationResult {
    if (!nik || nik.trim().length === 0) {
        return { valid: true }; // NIK is optional
    }
    if (!isValidNIK(nik)) {
        return { valid: false, error: 'NIK harus 16 digit angka' };
    }
    return { valid: true };
}

// --------------------------------------------
// NPWP (Nomor Pokok Wajib Pajak) Validation
// --------------------------------------------

/**
 * Validate Indonesian NPWP (15 digits, formatted as XX.XXX.XXX.X-XXX.XXX)
 */
export function isValidNPWP(npwp: string): boolean {
    const cleaned = npwp.replace(/[.\s-]/g, '');
    const npwpRegex = /^[0-9]{15}$/;
    return npwpRegex.test(cleaned);
}

/**
 * Validate NPWP with detailed error message
 */
export function validateNPWP(npwp: string): ValidationResult {
    if (!npwp || npwp.trim().length === 0) {
        return { valid: true }; // NPWP is optional
    }
    if (!isValidNPWP(npwp)) {
        return {
            valid: false,
            error: 'NPWP harus 15 digit angka. Format: XX.XXX.XXX.X-XXX.XXX',
        };
    }
    return { valid: true };
}

// --------------------------------------------
// Price / Amount Validation
// --------------------------------------------

/**
 * Validate price/amount (non-negative number)
 */
export function isValidPrice(price: number): boolean {
    return typeof price === 'number' && !isNaN(price) && price >= 0;
}

/**
 * Validate price with detailed error message
 */
export function validatePrice(price: unknown, fieldName = 'Harga'): ValidationResult {
    if (price === null || price === undefined || price === '') {
        return { valid: false, error: `${fieldName} wajib diisi` };
    }
    const num = Number(price);
    if (isNaN(num)) {
        return { valid: false, error: `${fieldName} harus berupa angka` };
    }
    if (num < 0) {
        return { valid: false, error: `${fieldName} tidak boleh negatif` };
    }
    if (num > 999_999_999_999.99) {
        return { valid: false, error: `${fieldName} terlalu besar (maks Rp 999.999.999.999,99)` };
    }
    return { valid: true };
}

// --------------------------------------------
// Quantity Validation
// --------------------------------------------

/**
 * Validate quantity (positive integer)
 */
export function isValidQuantity(qty: number): boolean {
    return Number.isInteger(qty) && qty > 0;
}

/**
 * Validate quantity with detailed error message
 */
export function validateQuantity(qty: unknown): ValidationResult {
    if (qty === null || qty === undefined || qty === '') {
        return { valid: false, error: 'Jumlah wajib diisi' };
    }
    const num = Number(qty);
    if (isNaN(num) || !Number.isInteger(num)) {
        return { valid: false, error: 'Jumlah harus berupa bilangan bulat' };
    }
    if (num <= 0) {
        return { valid: false, error: 'Jumlah harus lebih dari 0' };
    }
    if (num > 999_999) {
        return { valid: false, error: 'Jumlah terlalu besar (maks 999.999)' };
    }
    return { valid: true };
}

// --------------------------------------------
// Date Validation
// --------------------------------------------

/**
 * Validate date string (ISO 8601 format)
 */
export function isValidDate(dateStr: string): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}

/**
 * Validate date is not in the past
 */
export function isDateNotPast(dateStr: string): boolean {
    if (!isValidDate(dateStr)) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
}

/**
 * Validate date is not in the future
 */
export function isDateNotFuture(dateStr: string): boolean {
    if (!isValidDate(dateStr)) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date <= today;
}

/**
 * Validate date range (start <= end)
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
    if (!isValidDate(startDate) || !isValidDate(endDate)) return false;
    return new Date(startDate) <= new Date(endDate);
}

/**
 * Validate date with detailed error message
 */
export function validateDate(dateStr: string, fieldName = 'Tanggal'): ValidationResult {
    if (!dateStr || dateStr.trim().length === 0) {
        return { valid: false, error: `${fieldName} wajib diisi` };
    }
    if (!isValidDate(dateStr)) {
        return { valid: false, error: `${fieldName} tidak valid` };
    }
    return { valid: true };
}

/**
 * Validate date range with detailed error message
 */
export function validateDateRange(
    startDate: string,
    endDate: string,
    startFieldName = 'Tanggal Mulai',
    endFieldName = 'Tanggal Selesai'
): ValidationResult {
    const startResult = validateDate(startDate, startFieldName);
    if (!startResult.valid) return startResult;

    const endResult = validateDate(endDate, endFieldName);
    if (!endResult.valid) return endResult;

    if (!isValidDateRange(startDate, endDate)) {
        return { valid: false, error: `${startFieldName} harus sebelum atau sama dengan ${endFieldName}` };
    }
    return { valid: true };
}

// --------------------------------------------
// String Validation
// --------------------------------------------

/**
 * Validate required string field
 */
export function validateRequired(value: unknown, fieldName: string): ValidationResult {
    if (value === null || value === undefined) {
        return { valid: false, error: `${fieldName} wajib diisi` };
    }
    if (typeof value === 'string' && value.trim().length === 0) {
        return { valid: false, error: `${fieldName} wajib diisi` };
    }
    return { valid: true };
}

/**
 * Validate string length
 */
export function validateLength(
    value: string,
    fieldName: string,
    min?: number,
    max?: number
): ValidationResult {
    if (min !== undefined && value.length < min) {
        return { valid: false, error: `${fieldName} minimal ${min} karakter` };
    }
    if (max !== undefined && value.length > max) {
        return { valid: false, error: `${fieldName} maksimal ${max} karakter` };
    }
    return { valid: true };
}

// --------------------------------------------
// SKU Validation
// --------------------------------------------

/**
 * Validate SKU format (alphanumeric, hyphens, underscores)
 */
export function isValidSKU(sku: string): boolean {
    const skuRegex = /^[A-Za-z0-9_-]+$/;
    return skuRegex.test(sku);
}

/**
 * Validate SKU with detailed error message
 */
export function validateSKU(sku: string): ValidationResult {
    if (!sku || sku.trim().length === 0) {
        return { valid: false, error: 'SKU wajib diisi' };
    }
    if (!isValidSKU(sku)) {
        return { valid: false, error: 'SKU hanya boleh berisi huruf, angka, hyphen, dan underscore' };
    }
    if (sku.length > 50) {
        return { valid: false, error: 'SKU maksimal 50 karakter' };
    }
    return { valid: true };
}

// --------------------------------------------
// Password Validation
// --------------------------------------------

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
    if (!password || password.length === 0) {
        return { valid: false, error: 'Password wajib diisi' };
    }
    if (password.length < 8) {
        return { valid: false, error: 'Password minimal 8 karakter' };
    }
    if (password.length > 128) {
        return { valid: false, error: 'Password maksimal 128 karakter' };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, error: 'Password harus mengandung minimal 1 huruf besar' };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, error: 'Password harus mengandung minimal 1 huruf kecil' };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, error: 'Password harus mengandung minimal 1 angka' };
    }
    return { valid: true };
}

// --------------------------------------------
// Form Validation Helpers
// --------------------------------------------

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

export interface ValidationErrors {
    [field: string]: string;
}

/**
 * Validate multiple fields and return all errors
 * @param validations Array of [fieldName, validationResult] pairs
 * @returns Object with field names as keys and error messages as values
 */
export function validateAll(
    validations: [string, ValidationResult][]
): ValidationErrors {
    const errors: ValidationErrors = {};
    for (const [field, result] of validations) {
        if (!result.valid && result.error) {
            errors[field] = result.error;
        }
    }
    return errors;
}

/**
 * Check if there are any validation errors
 */
export function hasErrors(errors: ValidationErrors): boolean {
    return Object.keys(errors).length > 0;
}

/**
 * Get first error message from validation errors
 */
export function getFirstError(errors: ValidationErrors): string | undefined {
    const keys = Object.keys(errors);
    return keys.length > 0 ? errors[keys[0]] : undefined;
}

/**
 * Clear error for a specific field
 */
export function clearError(errors: ValidationErrors, field: string): ValidationErrors {
    const newErrors = { ...errors };
    delete newErrors[field];
    return newErrors;
}

// --------------------------------------------
// Composite Validators
// --------------------------------------------

/**
 * Validate invoice creation data
 */
export function validateInvoiceCreate(data: {
    customerName?: string;
    items?: Array<{ description?: string; quantity?: number; unitPrice?: number }>;
    dueDate?: string;
}): ValidationErrors {
    const validations: [string, ValidationResult][] = [
        ['customerName', validateRequired(data.customerName, 'Nama Customer')],
        ['dueDate', validateDate(data.dueDate || '', 'Tanggal Jatuh Tempo')],
    ];

    if (data.items && data.items.length > 0) {
        data.items.forEach((item, index) => {
            validations.push(
                [`items[${index}].description`, validateRequired(item.description, `Deskripsi item ${index + 1}`)],
                [`items[${index}].quantity`, validateQuantity(item.quantity)],
                [`items[${index}].unitPrice`, validatePrice(item.unitPrice, `Harga satuan item ${index + 1}`)]
            );
        });
    } else {
        validations.push(['items', { valid: false, error: 'Minimal 1 item wajib diisi' }]);
    }

    return validateAll(validations);
}

/**
 * Validate contact creation data
 */
export function validateContactCreate(data: {
    name?: string;
    email?: string;
    phone?: string;
    taxId?: string;
}): ValidationErrors {
    const validations: [string, ValidationResult][] = [
        ['name', validateRequired(data.name, 'Nama')],
        ['email', data.email ? validateEmail(data.email) : { valid: true }],
        ['phone', data.phone ? validatePhone(data.phone) : { valid: true }],
        ['taxId', data.taxId ? validateNPWP(data.taxId) : { valid: true }],
    ];

    return validateAll(validations);
}

/**
 * Validate product creation data
 */
export function validateProductCreate(data: {
    sku?: string;
    name?: string;
    price?: number;
    cost?: number;
    stock?: number;
    minStock?: number;
}): ValidationErrors {
    const validations: [string, ValidationResult][] = [
        ['sku', validateSKU(data.sku || '')],
        ['name', validateRequired(data.name, 'Nama Produk')],
        ['price', validatePrice(data.price, 'Harga Jual')],
        ['cost', data.cost !== undefined ? validatePrice(data.cost, 'Harga Beli') : { valid: true }],
        ['stock', data.stock !== undefined ? validateQuantity(data.stock) : { valid: true }],
        ['minStock', data.minStock !== undefined ? validateQuantity(data.minStock) : { valid: true }],
    ];

    return validateAll(validations);
}

/**
 * Validate employee creation data
 */
export function validateEmployeeCreate(data: {
    employeeId?: string;
    name?: string;
    email?: string;
    joinDate?: string;
    salary?: number;
}): ValidationErrors {
    const validations: [string, ValidationResult][] = [
        ['employeeId', validateRequired(data.employeeId, 'ID Karyawan')],
        ['name', validateRequired(data.name, 'Nama')],
        ['email', validateEmail(data.email || '')],
        ['joinDate', validateDate(data.joinDate || '', 'Tanggal Masuk')],
        ['salary', data.salary !== undefined ? validatePrice(data.salary, 'Gaji') : { valid: true }],
    ];

    return validateAll(validations);
}

/**
 * Validate login data
 */
export function validateLogin(data: {
    email?: string;
    password?: string;
}): ValidationErrors {
    const validations: [string, ValidationResult][] = [
        ['email', validateEmail(data.email || '')],
        ['password', validateRequired(data.password, 'Password')],
    ];

    return validateAll(validations);
}

/**
 * Validate registration data
 */
export function validateRegister(data: {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
}): ValidationErrors {
    const validations: [string, ValidationResult][] = [
        ['name', validateRequired(data.name, 'Nama')],
        ['email', validateEmail(data.email || '')],
        ['password', validatePassword(data.password || '')],
    ];

    if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
        validations.push(['confirmPassword', { valid: false, error: 'Konfirmasi password tidak cocok' }]);
    }

    return validateAll(validations);
}

// --------------------------------------------
// API Validation Middleware Helpers
// --------------------------------------------

/**
 * Create a validation middleware for API routes
 * Returns a function that validates request body and returns errors
 */
export function createValidator<T>(
    validator: (data: T) => ValidationErrors
) {
    return (data: T): { valid: boolean; errors: ValidationErrors } => {
        const errors = validator(data);
        return {
            valid: !hasErrors(errors),
            errors,
        };
    };
}

/**
 * Format validation errors as API response
 */
export function formatValidationResponse(errors: ValidationErrors) {
    return {
        success: false as const,
        error: 'Validasi gagal',
        details: errors,
        statusCode: 400,
    };
}
