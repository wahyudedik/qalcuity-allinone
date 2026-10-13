/**
 * Community Fase 2 — render PDF surat (kop RT + identitas warga + QR verifikasi).
 * Referensi: plans/community-phase2-implementation.md §3.3, §3.6, §3.7, §5.4.
 *
 * Aturan keamanan (HARD):
 * - NIK plain (hasil `safeDecrypt`/`bodySnapshot.member.nik`) HANYA hidup di memori
 *   render ini — tidak pernah di-return, di-log, atau masuk response JSON.
 * - Isi surat diambil dari `bodySnapshot` yang dibekukan saat ISSUE (immutability).
 *   Untuk DRAFT (belum ada snapshot) dibangun dari data live via `buildLetterSnapshot`.
 * - DRAFT diberi watermark "DRAF — BUKAN DOKUMEN RESMI"; QR hanya untuk surat
 *   yang sudah punya `verifyToken` (ISSUED/REVOKED).
 *
 * Pola jsPDF di-COPY dari pdf-generator.ts (bukan import silang) sesuai §5.4.
 */

import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import {
    buildLetterSnapshot,
    getLetterTypeDef,
    letterVerifyUrl,
    type CommunityLetterSnapshot,
    type SnapshotMemberInput,
    type SnapshotTenantInput,
} from './community-letter';

// ─── Tipe input ───────────────────────────────────────────────────────────────

/** Baris surat yang dibutuhkan render PDF. */
export interface PdfLetterInput {
    letterNumber: string | null;
    letterType: string;
    purpose: string;
    destination: string | null;
    status: string;
    issuedAt: Date | string | null;
    signedByName: string | null;
    /** Snapshot beku (ISSUED/REVOKED). Bila kosong → dibangun dari member/tenant. */
    bodySnapshot?: unknown;
    verifyToken?: string | null;
}

export interface RenderPdfOptions {
    /** Paksa watermark DRAF (default: `letter.status === 'DRAFT'`). */
    draft?: boolean;
    /** Tanggal dokumen untuk DRAFT (default: now). */
    renderDate?: Date | null;
}

// ─── Konstanta layout (mm, A4 portrait 210×297) ──────────────────────────────

const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const CONTENT_WIDTH = 210 - MARGIN_LEFT - MARGIN_RIGHT; // 170mm
const QR_SIZE = 30; // 3cm (§5.4)
const BULAN_ID = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
];

/** Format tanggal Indonesia: "13 Oktober 2026". */
function formatTanggalId(value: Date | string | null | undefined): string {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getDate()} ${BULAN_ID[date.getMonth()]} ${date.getFullYear()}`;
}

// ─── Helper gambar ────────────────────────────────────────────────────────────

/** Kop surat 3 baris + garis ganda. Mengembalikan posisi Y setelah garis. */
function drawKop(doc: jsPDF, snapshot: CommunityLetterSnapshot): number {
    const rt = snapshot.rt;
    const line1 = (rt.kopLine1 ?? rt.name).toUpperCase();
    const line2 = (rt.kopLine2 ?? `KELURAHAN ${(rt.kelurahan ?? '').toUpperCase()}`).toUpperCase();
    const line3Parts = [`RT ${rt.name}`, rt.rwNumber ? `RW ${rt.rwNumber}` : null].filter(Boolean);
    const line3 = line3Parts.join(' / ');
    const addressLine = [rt.address, rt.kecamatan ? `Kec. ${rt.kecamatan}` : null, rt.kabupaten]
        .filter(Boolean)
        .join(', ');

    let y = 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(line1, 105, y, { align: 'center' });
    y += 6;
    doc.setFontSize(12);
    doc.text(line2, 105, y, { align: 'center' });
    y += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (addressLine) {
        doc.text(addressLine, 105, y, { align: 'center' });
        y += 4.5;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(line3, 105, y, { align: 'center' });

    // Garis ganda kop
    y += 3;
    doc.setLineWidth(0.8);
    doc.line(MARGIN_LEFT, y, 210 - MARGIN_RIGHT, y);
    doc.setLineWidth(0.2);
    doc.line(MARGIN_LEFT, y + 1.2, 210 - MARGIN_RIGHT, y + 1.2);
    return y + 8;
}

/** Blok identitas warga (Nama, NIK, Alamat, RT/RW) — NIK hanya di memori render. */
function drawIdentity(doc: jsPDF, snapshot: CommunityLetterSnapshot, startY: number): number {
    const member = snapshot.member;
    const rows: Array<[string, string]> = [
        ['Nama', member.fullName || '-'],
        ['NIK', member.nik || '-'],
        ['Alamat/Rumah', member.address || '-'],
        ['RT/RW', member.rtRw || '-'],
    ];
    const labelWidth = 32;
    let y = startY;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    for (const [label, value] of rows) {
        doc.text(`${label}`, MARGIN_LEFT + 8, y);
        doc.text(':', MARGIN_LEFT + 8 + labelWidth, y);
        const lines = doc.splitTextToSize(value, CONTENT_WIDTH - 8 - labelWidth - 3);
        doc.text(lines, MARGIN_LEFT + 8 + labelWidth + 3, y);
        y += 6 * (lines.length || 1);
    }
    return y + 2;
}

/** Paragraf ber-wrap dengan indentasi blok. */
function drawParagraph(
    doc: jsPDF,
    text: string,
    startY: number,
    opts: { indent?: number; spacingAfter?: number } = {}
): number {
    const indent = opts.indent ?? 8;
    const maxWidth = CONTENT_WIDTH - indent;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const lines: string[] = doc.splitTextToSize(text, maxWidth) as string[];
    let y = startY;
    for (const line of lines) {
        doc.text(line, MARGIN_LEFT + indent, y);
        y += 6;
    }
    return y + (opts.spacingAfter ?? 4);
}

/** Blok tanda tangan di kanan. */
function drawSignature(
    doc: jsPDF,
    snapshot: CommunityLetterSnapshot,
    dateText: string,
    startY: number
): number {
    const rt = snapshot.rt;
    const place = (rt.kelurahan ?? rt.name).toUpperCase();
    const x = 210 - MARGIN_RIGHT - 65;
    let y = startY;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`${place}, ${dateText}`, x, y);
    y += 6;
    const roleLine = snapshot.signedByName ? `Ketua ${rt.name}` : `Ketua ${rt.name}`;
    doc.text(roleLine, x, y);
    y += 22; // ruang tanda tangan
    const signerName = snapshot.signedByName ?? 'Ketua';
    doc.setFont('helvetica', 'bold');
    doc.text(signerName, x, y);
    const nameWidth = doc.getTextWidth(signerName);
    doc.setLineWidth(0.2);
    doc.line(x, y + 1, x + nameWidth, y + 1);
    return y + 4;
}

/** Footer: QR verifikasi 3cm + URL teks + nomor dokumen. */
async function drawFooter(
    doc: jsPDF,
    snapshot: CommunityLetterSnapshot,
    verifyToken: string | null
): Promise<void> {
    const pageHeight = doc.internal.pageSize.height;
    const footerTop = pageHeight - MARGIN_RIGHT - QR_SIZE - 8;

    doc.setLineWidth(0.2);
    doc.line(MARGIN_LEFT, footerTop - 5, 210 - MARGIN_RIGHT, footerTop - 5);

    const docLabel = `Dokumen: ${snapshot.letterNumber ?? '(tanpa nomor — DRAF)'}`;

    if (verifyToken) {
        const url = letterVerifyUrl(verifyToken);
        const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 300 });
        doc.addImage(dataUrl, 'PNG', MARGIN_LEFT, footerTop, QR_SIZE, QR_SIZE);

        const textX = MARGIN_LEFT + QR_SIZE + 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('Verifikasi keaslian dokumen:', textX, footerTop + 6);
        const urlLines: string[] = doc.splitTextToSize(url, CONTENT_WIDTH - QR_SIZE - 5);
        doc.text(urlLines, textX, footerTop + 10);
        doc.text(docLabel, textX, footerTop + 10 + 4 * (urlLines.length || 1));
    } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(docLabel, MARGIN_LEFT, footerTop + 8);
        doc.setFontSize(7);
        doc.text('QR verifikasi terbit setelah surat disahkan.', MARGIN_LEFT, footerTop + 13);
    }
}

/** Watermark diagonal untuk DRAFT. */
function drawDraftWatermark(doc: jsPDF): void {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(38);
    doc.setTextColor(214, 214, 214);
    doc.text('DRAF — BUKAN DOKUMEN RESMI', pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 45,
    });
    doc.setTextColor(0, 0, 0);
}

// ─── Render utama ─────────────────────────────────────────────────────────────

/**
 * Render PDF surat → `Uint8Array`.
 *
 * `Promise` karena `qrcode.toDataURL()` async (deviasi kecil dari signature spec
 * yang menulis `: Uint8Array` — jadwal render tetap satu fungsi).
 *
 * Sumber isi: `letter.bodySnapshot` (dibekukan saat ISSUE) — immutability §3.6.
 * Bila snapshot tidak ada (DRAFT), dibangun dari `member`/`tenant` via
 * `buildLetterSnapshot` (NIK plain hanya di memori render).
 */
export async function renderCommunityLetterPdf(
    letter: PdfLetterInput,
    member: SnapshotMemberInput,
    tenant: SnapshotTenantInput,
    opts: RenderPdfOptions = {}
): Promise<Uint8Array> {
    const snapshot: CommunityLetterSnapshot =
        (letter.bodySnapshot as CommunityLetterSnapshot | null | undefined) ??
        buildLetterSnapshot(member, tenant, letter.letterType, letter.purpose, letter.destination, {
            letterNumber: letter.letterNumber,
            issuedAt: letter.issuedAt ? new Date(letter.issuedAt) : null,
            signedByName: letter.signedByName,
        });

    const typeDef = getLetterTypeDef(letter.letterType);
    const isDraft = opts.draft ?? letter.status === 'DRAFT';
    const dateValue = letter.issuedAt ?? opts.renderDate ?? new Date();
    const dateText = formatTanggalId(dateValue);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    if (isDraft) drawDraftWatermark(doc);

    let y = drawKop(doc, snapshot);

    // Judul surat (centered, underlined)
    const title = typeDef.labelId.toUpperCase();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(title, 105, y, { align: 'center' });
    const titleWidth = doc.getTextWidth(title);
    doc.setLineWidth(0.3);
    doc.line(105 - titleWidth / 2, y + 1, 105 + titleWidth / 2, y + 1);
    y += 7;

    // Nomor surat
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Nomor: ${snapshot.letterNumber ?? '—'}`, 105, y, { align: 'center' });
    y += 10;

    // Paragraf pembuka
    const signerLabel = snapshot.signedByName ?? `Ketua ${snapshot.rt.name}`;
    y = drawParagraph(
        doc,
        `Yang bertanda tangan di bawah ini ${signerLabel}, dengan ini menerangkan bahwa:`,
        y,
        { indent: 0, spacingAfter: 4 }
    );

    // Blok identitas
    y = drawIdentity(doc, snapshot, y);

    // Keperluan & tujuan
    y = drawParagraph(doc, `Keperluan: ${snapshot.purpose}`, y, { spacingAfter: 2 });
    if (snapshot.destination) {
        y = drawParagraph(doc, `Tujuan: ${snapshot.destination}`, y, { spacingAfter: 4 });
    }

    // Paragraf isi (bodyTemplate jenis surat)
    y = drawParagraph(doc, `Nama tersebut di atas ${typeDef.bodyTemplate}`, y, { spacingAfter: 4 });

    // Penutup
    y = drawParagraph(
        doc,
        'Demikian surat ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.',
        y,
        { spacingAfter: 6 }
    );

    // Blok tanda tangan kanan
    drawSignature(doc, snapshot, dateText, y);

    // Footer QR / nomor dokumen
    await drawFooter(doc, snapshot, letter.verifyToken ?? null);

    const buffer = doc.output('arraybuffer');
    return new Uint8Array(buffer);
}
