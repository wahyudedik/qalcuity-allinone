/**
 * Export utilities for Qalcuity Reports
 * Supports CSV export (with UTF-8 BOM for Excel), Excel (HTML table), and Print functionality
 */

// ============================================
// Formatting Helpers
// ============================================

/**
 * Format a number as Indonesian Rupiah currency (Rp X.XXX.XXX)
 * @param value - Number to format
 * @returns Formatted string like "Rp 1.500.000"
 */
export function formatCurrencyIDR(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Rp 0';
  const num = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return 'Rp 0';
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

/**
 * Format a date string/Date to DD/MM/YYYY
 * @param value - Date string or Date object
 * @returns Formatted string like "24/09/2026"
 */
export function formatDateID(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  try {
    const date = typeof value === 'string' ? new Date(value) : value instanceof Date ? value : new Date(String(value));
    if (isNaN(date.getTime())) return String(value);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(value);
  }
}

/**
 * Get current timestamp string for filenames (YYYY-MM-DD_HHmmss)
 */
export function getFileTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
}

// ============================================
// CSV Export
// ============================================

/**
 * Escape HTML special characters to prevent XSS in HTML context.
 */
function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Build HTML entities from char codes to avoid encoding issues in source
  const amp = String.fromCharCode(38) + 'amp;';
  const lt = String.fromCharCode(38) + 'lt;';
  const gt = String.fromCharCode(38) + 'gt;';
  const quot = String.fromCharCode(38) + 'quot;';
  const apos = String.fromCharCode(38) + '#039;';
  return str
    .replace(/&/g, amp)
    .replace(/</g, lt)
    .replace(/>/g, gt)
    .replace(/"/g, quot)
    .replace(/'/g, apos);
}

/**
 * Escape CSV value — handle commas, quotes, newlines, and carriage returns
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate CSV-compatible content string from data array
 * Uses UTF-8 BOM for Microsoft Excel compatibility
 */
function generateCSVContent(
  data: Record<string, unknown>[],
  headerMap?: Record<string, string>
): string {
  if (data.length === 0) return '';

  const keys = Object.keys(data[0]);
  const displayHeaders = headerMap
    ? keys.map(k => headerMap[k] || k)
    : keys;

  return [
    displayHeaders.map(escapeCSVValue).join(','),
    ...data.map(row =>
      keys.map(key => escapeCSVValue(row[key])).join(',')
    )
  ].join('\r\n');
}

/**
 * Export data array to CSV file and trigger download
 * Uses UTF-8 BOM for Microsoft Excel compatibility
 *
 * @param data - Array of objects to export
 * @param filename - Filename without extension (e.g., "invoices")
 * @param headerMap - Optional mapping of field names to display headers
 *   e.g., { "invoiceNumber": "No. Invoice", "totalAmount": "Total (Rp)" }
 *   If omitted, raw field keys are used as headers.
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  headerMap?: Record<string, string>
) {
  if (data.length === 0) return;

  const csvContent = generateCSVContent(data, headerMap);

  // UTF-8 BOM prefix for Excel compatibility with Indonesian characters
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  // Add timestamp to filename if not already present
  const timestamp = getFileTimestamp();
  const finalFilename = filename.includes('_20') || filename.includes('-20')
    ? filename
    : `${filename}_${timestamp}`;
  link.download = `${finalFilename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Export data to Excel-compatible HTML file
 * Uses HTML table format which Excel can open natively
 */
export function exportToExcel(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);

  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${filename}</x:Name>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row =>
    `<tr>${headers.map(h => `<td>${escapeHtml(row[h])}</td>`).join('')}</tr>`
  ).join('\n')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Print a specific element by ID
 */
export function printReport(elementId: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Laporan Qalcuity</title>
      <style>
        @page { margin: 20mm; }
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        h1 { font-size: 18px; margin-bottom: 8px; }
        h2 { font-size: 14px; margin-bottom: 16px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 12px; }
        th { background-color: #f2f2f2; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .border-t { border-top: 2px solid #333; }
        .mt-4 { margin-top: 16px; }
        .text-sm { font-size: 12px; }
        .text-gray { color: #666; }
        .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 10px; color: #999; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      ${element.innerHTML}
      <div class="footer">
        Dicetak pada ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        &mdash; Qalcuity All-in-One
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 300);
}

/**
 * Format data for export — add readable headers
 */
export function formatExportData<T extends Record<string, unknown>>(
  data: T[],
  headerMap: Record<string, string>
): Record<string, unknown>[] {
  return data.map(row => {
    const newRow: Record<string, unknown> = {};
    Object.entries(headerMap).forEach(([key, label]) => {
      newRow[label] = row[key];
    });
    return newRow;
  });
}
