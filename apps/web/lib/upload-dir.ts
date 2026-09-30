import { isAbsolute, join } from 'path';

/**
 * Shared helper resolusi direktori upload — dipakai oleh semua writer upload
 * (api/upload, api/billing/payments/upload, dst) agar konsisten.
 *
 * Jalur A (persistent storage):
 * - `UPLOAD_DIR` absolut (production) → dipakai langsung, di luar tree aplikasi
 *   sehingga file TIDAK hilang saat deploy/rebuild (`git pull` + build).
 * - `UPLOAD_DIR` relatif (development) → join ke cwd (backward compatible).
 * - Tidak diset → default `public/uploads` (perilaku lama sebelum fix 404).
 *
 * Catatan: URL yang di-return ke client SELALU relative `/uploads/...` —
 * format ini tidak berubah agar referensi DB lama (User.avatar, Tenant.logo,
 * BillingPayment.proofFileUrl, dst) tetap kompatibel.
 */

/** Base directory untuk semua file upload. */
export function getUploadBaseDir(): string {
    const configured = process.env.UPLOAD_DIR;
    if (!configured) return join(process.cwd(), 'public', 'uploads');
    return isAbsolute(configured) ? configured : join(process.cwd(), configured);
}

/**
 * Sub-directory di dalam base upload (tenantId, 'billing', dst).
 *
 * Menolak segmen yang mengandung path traversal ('..') atau separator path
 * ('/', '\\') maupun null byte — throw Error jika invalid.
 */
export function getUploadSubDir(segment: string): string {
    if (
        !segment ||
        segment.includes('..') ||
        segment.includes('/') ||
        segment.includes('\\') ||
        segment.includes('\0')
    ) {
        throw new Error(`Invalid upload sub-directory segment: ${JSON.stringify(segment)}`);
    }
    return join(getUploadBaseDir(), segment);
}
