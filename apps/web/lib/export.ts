/**
 * Export utilities for Qalcuity Reports
 * Supports CSV export, Excel (HTML table), and Print functionality
 */

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
 * Escape CSV value — handle commas, quotes, and newlines
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export data array to CSV file and trigger download
 */
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.map(escapeCSVValue).join(','),
    ...data.map(row =>
      headers.map(header => escapeCSVValue(row[header])).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
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
