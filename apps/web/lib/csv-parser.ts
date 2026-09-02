/**
 * CSV Parser — Pure JavaScript, no external dependencies.
 * 
 * Supports:
 * - Comma, semicolon, and tab delimiters (auto-detected)
 * - Quoted values (double quotes)
 * - Newlines inside quoted fields
 * - UTF-8 and ISO-8859-1 encodings
 * - BOM (Byte Order Mark) stripping
 */

export interface CsvParseResult {
    headers: string[];
    rows: Record<string, string>[];
    totalRows: number;
}

/**
 * Detect the delimiter used in a CSV line.
 * Checks the first few lines for the most common delimiter.
 */
function detectDelimiter(text: string): string {
    const firstLines = text.split('\n').slice(0, 5).join('\n');
    const commaCount = (firstLines.match(/,/g) || []).length;
    const semicolonCount = (firstLines.match(/;/g) || []).length;
    const tabCount = (firstLines.match(/\t/g) || []).length;

    if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
    if (semicolonCount > commaCount) return ';';
    return ',';
}

/**
 * Strip BOM (Byte Order Mark) from the beginning of the text.
 */
function stripBom(text: string): string {
    if (text.charCodeAt(0) === 0xFEFF) {
        return text.slice(1);
    }
    return text;
}

/**
 * Parse a single CSV line respecting quoted fields.
 * Returns an array of field values.
 */
function parseLine(line: string, delimiter: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
        const char = line[i];

        if (inQuotes) {
            if (char === '"') {
                // Check for escaped quote (doubled)
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i += 2;
                } else {
                    inQuotes = false;
                    i++;
                }
            } else {
                current += char;
                i++;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
                i++;
            } else if (char === delimiter) {
                fields.push(current);
                current = '';
                i++;
            } else {
                current += char;
                i++;
            }
        }
    }

    fields.push(current);
    return fields;
}

/**
 * Parse CSV text into an array of objects.
 * 
 * @param text - Raw CSV text content
 * @param delimiter - Optional delimiter override (auto-detected if omitted)
 * @returns Parsed result with headers and row objects
 */
export function parseCsv(text: string, delimiter?: string): CsvParseResult {
    // Strip BOM and normalize line endings
    let cleaned = stripBom(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Remove trailing empty lines
    cleaned = cleaned.replace(/\n+$/, '');

    if (!cleaned.trim()) {
        return { headers: [], rows: [], totalRows: 0 };
    }

    const detectedDelimiter = delimiter || detectDelimiter(cleaned);

    // Split into lines, handling quoted newlines
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];

        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < cleaned.length && cleaned[i + 1] === '"') {
                    currentLine += '""';
                    i++;
                } else {
                    inQuotes = false;
                    currentLine += char;
                }
            } else {
                currentLine += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
                currentLine += char;
            } else if (char === '\n') {
                lines.push(currentLine);
                currentLine = '';
            } else {
                currentLine += char;
            }
        }
    }
    if (currentLine) {
        lines.push(currentLine);
    }

    if (lines.length === 0) {
        return { headers: [], rows: [], totalRows: 0 };
    }

    // Parse headers
    const headers = parseLine(lines[0], detectedDelimiter).map((h) =>
        h.trim().replace(/^"|"$/g, '')
    );

    // Parse data rows
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines

        const values = parseLine(line, detectedDelimiter);
        const row: Record<string, string> = {};

        for (let j = 0; j < headers.length; j++) {
            const value = j < values.length ? values[j].trim().replace(/^"|"$/g, '') : '';
            row[headers[j]] = value;
        }

        rows.push(row);
    }

    return {
        headers,
        rows,
        totalRows: rows.length,
    };
}

/**
 * Parse a Buffer containing CSV data.
 * Handles both UTF-8 and ISO-8859-1 encodings.
 * 
 * @param buffer - Raw file buffer
 * @param encoding - Optional encoding hint (default: utf-8)
 * @returns Parsed CSV result
 */
export function parseCsvBuffer(
    buffer: Buffer,
    encoding: BufferEncoding = 'utf-8'
): CsvParseResult {
    const text = buffer.toString(encoding);
    return parseCsv(text);
}
