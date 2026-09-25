/**
 * PDF Generator for Financial Documents
 * Uses jsPDF + jspdf-autotable for server-side PDF generation.
 * Supports: Invoice, Quotation, Purchase Order.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompanyInfo {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    logo?: string | null;
}

export interface PDFItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface InvoicePDFData {
    invoiceNumber: string;
    createdAt: string;
    dueDate: string;
    status: string;
    customerName: string;
    customerEmail?: string | null;
    customerPhone?: string | null;
    customerAddress?: string | null;
    items: PDFItem[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    notes?: string | null;
}

export interface QuotationPDFData {
    quotationNumber: string;
    createdAt: string;
    validUntil: string;
    status: string;
    customerName: string;
    customerEmail?: string | null;
    customerPhone?: string | null;
    customerAddress?: string | null;
    items: PDFItem[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    discount: number;
    total: number;
    notes?: string | null;
    terms?: string | null;
}

export interface PurchaseOrderPDFData {
    poNumber: string;
    createdAt: string;
    expectedDelivery?: string | null;
    status: string;
    supplierName: string;
    supplierEmail?: string | null;
    supplierPhone?: string | null;
    supplierAddress?: string | null;
    items: PDFItem[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    notes?: string | null;
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * Format number as Indonesian Rupiah (Rp X.XXX.XXX)
 */
export function formatCurrencyIDR(amount: number): string {
    return `Rp ${Math.round(amount)
        .toLocaleString('id-ID')
        .replace(/,/g, '.')}`;
}

/**
 * Format date as DD MMMM YYYY (Bahasa Indonesia)
 */
export function formatDateID(dateStr: string): string {
    const date = new Date(dateStr);
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}

/**
 * Format status label for display
 */
function formatStatus(status: string): string {
    const map: Record<string, string> = {
        DRAFT: 'Draf',
        SENT: 'Terkirim',
        PAID: 'Dibayar',
        OVERDUE: 'Jatuh Tempo',
        PARTIALLY_PAID: 'Dibayar Sebagian',
        CANCELLED: 'Dibatalkan',
        ACCEPTED: 'Diterima',
        REJECTED: 'Ditolak',
        EXPIRED: 'Kedaluwarsa',
        CONFIRMED: 'Dikonfirmasi',
        RECEIVED: 'Diterima',
    };
    return map[status.toUpperCase()] || status;
}

/**
 * Get today's date string in Indonesian format
 */
function getTodayString(): string {
    return formatDateID(new Date().toISOString());
}

// ---------------------------------------------------------------------------
// Base PDF Helpers
// ---------------------------------------------------------------------------

/**
 * Create a new jsPDF document (A4 portrait)
 */
function createDoc(): jsPDF {
    return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
}

/**
 * Draw company header on the PDF
 */
function drawCompanyHeader(doc: jsPDF, company: CompanyInfo): number {
    let y = 15;

    // Company name
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(company.name, 15, y);
    y += 7;

    // Company details
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);

    if (company.address) {
        doc.text(company.address, 15, y);
        y += 5;
    }
    if (company.phone) {
        doc.text(`Telp: ${company.phone}`, 15, y);
        y += 5;
    }
    if (company.email) {
        doc.text(`Email: ${company.email}`, 15, y);
        y += 5;
    }
    if (company.website) {
        doc.text(`Web: ${company.website}`, 15, y);
        y += 5;
    }

    // Separator line
    y += 3;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, 195, y);
    y += 8;

    doc.setTextColor(0, 0, 0);
    return y;
}

/**
 * Draw document title and metadata (right-aligned)
 */
function drawDocumentTitle(
    doc: jsPDF,
    title: string,
    docNumber: string,
    dateLabel: string,
    dateValue: string,
    secondLabel?: string,
    secondValue?: string,
): number {
    let y = 30;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 120, y, { align: 'right' });
    y += 10;

    // Document number
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`${dateLabel}: ${dateValue}`, 195, y, { align: 'right' });
    y += 5;
    doc.text(`No: ${docNumber}`, 195, y, { align: 'right' });
    y += 5;
    if (secondLabel && secondValue) {
        doc.text(`${secondLabel}: ${secondValue}`, 195, y, { align: 'right' });
        y += 5;
    }

    doc.setTextColor(0, 0, 0);
    return Math.max(y, 50);
}

/**
 * Draw billing party (customer or supplier) info
 */
function drawPartyInfo(
    doc: jsPDF,
    y: number,
    label: string,
    name: string,
    email?: string | null,
    phone?: string | null,
    address?: string | null,
): number {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(label, 15, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(name, 15, y);
    y += 5;

    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    if (address) {
        doc.text(address, 15, y);
        y += 4.5;
    }
    if (email) {
        doc.text(email, 15, y);
        y += 4.5;
    }
    if (phone) {
        doc.text(phone, 15, y);
        y += 4.5;
    }

    doc.setTextColor(0, 0, 0);
    return y + 5;
}

/**
 * Draw items table
 */
function drawItemsTable(doc: jsPDF, y: number, items: PDFItem[]): number {
    const tableData = items.map((item, idx) => [
        String(idx + 1),
        item.description,
        String(item.quantity),
        formatCurrencyIDR(item.unitPrice),
        formatCurrencyIDR(item.total),
    ]);

    autoTable(doc, {
        startY: y,
        head: [['No', 'Deskripsi', 'Qty', 'Harga Satuan', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: {
            fillColor: [59, 130, 246],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
        },
        bodyStyles: {
            fontSize: 9,
            textColor: [50, 50, 50],
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 12 },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'right', cellWidth: 35 },
            4: { halign: 'right', cellWidth: 35 },
        },
        margin: { left: 15, right: 15 },
    });

    return (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
}

/**
 * Draw totals section
 */
function drawTotals(
    doc: jsPDF,
    y: number,
    subtotal: number,
    taxRate: number,
    taxAmount: number,
    total: number,
    discount?: number,
): number {
    const startX = 120;
    const labelX = startX;
    const valueX = 195;

    // Subtotal
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal', labelX, y, { align: 'right' });
    doc.text(formatCurrencyIDR(subtotal), valueX, y, { align: 'right' });
    y += 6;

    // Discount (if applicable)
    if (discount && discount > 0) {
        doc.text('Diskon', labelX, y, { align: 'right' });
        doc.text(`-${formatCurrencyIDR(discount)}`, valueX, y, { align: 'right' });
        y += 6;
    }

    // Tax
    if (taxAmount > 0) {
        doc.text(`PPN (${taxRate}%)`, labelX, y, { align: 'right' });
        doc.text(formatCurrencyIDR(taxAmount), valueX, y, { align: 'right' });
        y += 6;
    }

    // Total line
    doc.setDrawColor(50, 50, 50);
    doc.line(startX - 50, y, valueX, y);
    y += 6;

    // Grand Total
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', labelX, y, { align: 'right' });
    doc.text(formatCurrencyIDR(total), valueX, y, { align: 'right' });
    y += 10;

    return y;
}

/**
 * Draw footer with generation timestamp
 */
function drawFooter(doc: jsPDF, y: number): void {
    const pageHeight = doc.internal.pageSize.height;
    const footerY = Math.max(y + 10, pageHeight - 20);

    doc.setDrawColor(200, 200, 200);
    doc.line(15, footerY, 195, footerY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(
        `Dicetak pada ${getTodayString()} — Qalcuity All-in-One`,
        105,
        footerY + 5,
        { align: 'center' },
    );
}

/**
 * Draw notes section
 */
function drawNotes(doc: jsPDF, y: number, label: string, text: string): number {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(label, 15, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const lines = doc.splitTextToSize(text, 170);
    doc.text(lines, 15, y);
    y += lines.length * 4.5 + 5;

    doc.setTextColor(0, 0, 0);
    return y;
}

// ---------------------------------------------------------------------------
// Document Generators
// ---------------------------------------------------------------------------

/**
 * Generate Invoice PDF
 */
export function generateInvoicePDF(
    data: InvoicePDFData,
    company: CompanyInfo,
): jsPDF {
    const doc = createDoc();

    // Company header
    drawCompanyHeader(doc, company);

    // Document title + metadata
    const metaY = drawDocumentTitle(
        doc,
        'INVOICE',
        data.invoiceNumber,
        'Tanggal',
        formatDateID(data.createdAt),
        'Jatuh Tempo',
        formatDateID(data.dueDate),
    );

    // Status badge
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const statusText = `Status: ${formatStatus(data.status)}`;
    doc.text(statusText, 195, metaY - 5, { align: 'right' });

    // Customer info
    const partyY = drawPartyInfo(
        doc,
        metaY,
        'Kepada:',
        data.customerName,
        data.customerEmail,
        data.customerPhone,
        data.customerAddress,
    );

    // Items table
    const tableY = drawItemsTable(doc, partyY, data.items);

    // Totals
    const totalsY = drawTotals(
        doc,
        tableY,
        data.subtotal,
        data.taxRate,
        data.taxAmount,
        data.total,
    );

    // Notes
    let finalY = totalsY;
    if (data.notes) {
        finalY = drawNotes(doc, totalsY, 'Catatan:', data.notes);
    }

    // Footer
    drawFooter(doc, finalY);

    return doc;
}

/**
 * Generate Quotation PDF
 */
export function generateQuotationPDF(
    data: QuotationPDFData,
    company: CompanyInfo,
): jsPDF {
    const doc = createDoc();

    // Company header
    drawCompanyHeader(doc, company);

    // Document title + metadata
    const metaY = drawDocumentTitle(
        doc,
        'QUOTATION',
        data.quotationNumber,
        'Tanggal',
        formatDateID(data.createdAt),
        'Berlaku Hingga',
        formatDateID(data.validUntil),
    );

    // Status badge
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const statusText = `Status: ${formatStatus(data.status)}`;
    doc.text(statusText, 195, metaY - 5, { align: 'right' });

    // Customer info
    const partyY = drawPartyInfo(
        doc,
        metaY,
        'Kepada:',
        data.customerName,
        data.customerEmail,
        data.customerPhone,
        data.customerAddress,
    );

    // Items table
    const tableY = drawItemsTable(doc, partyY, data.items);

    // Totals (with discount)
    const totalsY = drawTotals(
        doc,
        tableY,
        data.subtotal,
        data.taxRate,
        data.taxAmount,
        data.total,
        data.discount,
    );

    // Notes + Terms
    let finalY = totalsY;
    if (data.notes) {
        finalY = drawNotes(doc, finalY, 'Catatan:', data.notes);
    }
    if (data.terms) {
        finalY = drawNotes(doc, finalY, 'Syarat & Ketentuan:', data.terms);
    }

    // Footer
    drawFooter(doc, finalY);

    return doc;
}

/**
 * Generate Purchase Order PDF
 */
export function generatePurchaseOrderPDF(
    data: PurchaseOrderPDFData,
    company: CompanyInfo,
): jsPDF {
    const doc = createDoc();

    // Company header
    drawCompanyHeader(doc, company);

    // Document title + metadata
    const metaY = drawDocumentTitle(
        doc,
        'PURCHASE ORDER',
        data.poNumber,
        'Tanggal',
        formatDateID(data.createdAt),
        'Pengiriman',
        data.expectedDelivery ? formatDateID(data.expectedDelivery) : '-',
    );

    // Status badge
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const statusText = `Status: ${formatStatus(data.status)}`;
    doc.text(statusText, 195, metaY - 5, { align: 'right' });

    // Supplier info
    const partyY = drawPartyInfo(
        doc,
        metaY,
        'Supplier:',
        data.supplierName,
        data.supplierEmail,
        data.supplierPhone,
        data.supplierAddress,
    );

    // Items table
    const tableY = drawItemsTable(doc, partyY, data.items);

    // Totals
    const totalsY = drawTotals(
        doc,
        tableY,
        data.subtotal,
        data.taxRate,
        data.taxAmount,
        data.total,
    );

    // Notes
    let finalY = totalsY;
    if (data.notes) {
        finalY = drawNotes(doc, finalY, 'Catatan:', data.notes);
    }

    // Footer
    drawFooter(doc, finalY);

    return doc;
}
