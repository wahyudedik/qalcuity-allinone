/**
 * Excel Parser — Uses xlsx library to parse XLSX and XLS files.
 * 
 * Features:
 * - Reads all sheets or a specific sheet
 * - Converts to array of objects (header row → keys)
 * - Handles merged cells gracefully
 * - Strips whitespace from headers
 */

import * as XLSX from 'xlsx';

export interface ExcelParseResult {
    headers: string[];
    rows: Record<string, string>[];
    totalRows: number;
    sheetNames: string[];
}

/**
 * Parse an Excel buffer into an array of objects.
 * 
 * @param buffer - Raw file buffer (XLSX or XLS)
 * @param sheetName - Optional specific sheet name (defaults to first sheet)
 * @returns Parsed result with headers and row objects
 */
export function parseExcel(
    buffer: Buffer,
    sheetName?: string
): ExcelParseResult {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;

    if (sheetNames.length === 0) {
        return { headers: [], rows: [], totalRows: 0, sheetNames: [] };
    }

    // Use specified sheet or first sheet
    const targetSheet = sheetName && sheetNames.includes(sheetName)
        ? sheetName
        : sheetNames[0];

    const worksheet = workbook.Sheets[targetSheet];
    if (!worksheet) {
        return { headers: [], rows: [], totalRows: 0, sheetNames };
    }

    // Convert to JSON with header row (header:1 returns array-of-arrays)
    const jsonData: unknown[][] = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        raw: false,
        defval: '',
        blankrows: false,
    }) as unknown[][];

    if (jsonData.length === 0) {
        return { headers: [], rows: [], totalRows: 0, sheetNames };
    }

    // First row is headers
    const rawHeaders = jsonData[0] as unknown[];
    const headers = rawHeaders.map((h) => String(h || '').trim());

    // Remaining rows are data
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < jsonData.length; i++) {
        const values = jsonData[i] as unknown[];
        // Skip completely empty rows
        const hasData = values.some((v) => v !== '' && v !== null && v !== undefined);
        if (!hasData) continue;

        const row: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
            const value = j < values.length ? String(values[j] ?? '').trim() : '';
            row[headers[j]] = value;
        }
        rows.push(row);
    }

    return {
        headers,
        rows,
        totalRows: rows.length,
        sheetNames,
    };
}

/**
 * Parse an Excel buffer and return data from all sheets.
 * 
 * @param buffer - Raw file buffer (XLSX or XLS)
 * @returns Map of sheet name → parsed result
 */
export function parseAllExcelSheets(
    buffer: Buffer
): Map<string, ExcelParseResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const results = new Map<string, ExcelParseResult>();

    for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) continue;

        const jsonData2: unknown[][] = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
            header: 1,
            raw: false,
            defval: '',
            blankrows: false,
        }) as unknown[][];

        if (jsonData2.length === 0) {
            results.set(sheetName, {
                headers: [],
                rows: [],
                totalRows: 0,
                sheetNames: workbook.SheetNames,
            });
            continue;
        }

        const rawHeaders = jsonData2[0] as unknown[];
        const headers = rawHeaders.map((h) => String(h || '').trim());

        const rows: Record<string, string>[] = [];
        for (let i = 1; i < jsonData2.length; i++) {
            const values = jsonData2[i] as unknown[];
            const hasData = values.some((v) => v !== '' && v !== null && v !== undefined);
            if (!hasData) continue;

            const row: Record<string, string> = {};
            for (let j = 0; j < headers.length; j++) {
                const value = j < values.length ? String(values[j] ?? '').trim() : '';
                row[headers[j]] = value;
            }
            rows.push(row);
        }

        results.set(sheetName, {
            headers,
            rows,
            totalRows: rows.length,
            sheetNames: workbook.SheetNames,
        });
    }

    return results;
}

/**
 * Validate file type by checking magic bytes (for server-side validation).
 * 
 * @param buffer - First few bytes of the file
 * @returns 'xlsx' | 'xls' | 'csv' | 'unknown'
 */
export function detectFileType(buffer: Buffer): string {
    if (buffer.length < 4) return 'unknown';

    // XLSX: PKZIP magic bytes (0x50, 0x4B)
    if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
        return 'xlsx';
    }

    // XLS: OLE2 magic bytes (0xD0, 0xCF)
    if (buffer[0] === 0xD0 && buffer[1] === 0xCF) {
        return 'xls';
    }

    // CSV: Check if it looks like text
    const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 100));
    if (/^[a-zA-Z0-9\s,;"'\t\r\n]/.test(text)) {
        return 'csv';
    }

    return 'unknown';
}
