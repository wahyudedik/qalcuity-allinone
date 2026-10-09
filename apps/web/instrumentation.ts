/**
 * Next.js Instrumentation Hook — dipanggil sekali saat server startup.
 *
 * https://nextjs.org/docs/pages/building-your-application/optimizing/instrumentation
 *
 * Next.js >= 14.1: `instrumentation.ts` di root project (folder ini) sudah stable
 * tanpa flag experimental. PENTING: file harus berada di root project (atau `src/`
 * jika ada) — BUKAN di dalam `app/`, karena itu lokasi yang di-scan Next.js.
 *
 * Fungsi: register process-level error handlers yang menangkap error yang LOLOS
 * dari semua lapisan (route handlers, cron jobs, background tasks) sehingga
 * tidak menghasilkan "silent crash" tanpa jejak.
 */

export async function register(): Promise<void> {
    // Hanya register di Node.js runtime — Edge Runtime (middleware) tidak punya
    // fs/process.on yang sama dan akan gagal compile.
    if (process.env.NEXT_RUNTIME !== 'nodejs') {
        return;
    }

    // Dynamic import: error-logger meng-import 'fs' — hanya aman di Node.js runtime.
    // Sengaja di-await agar handler ter-register SEBELUM request pertama diterima.
    const { logProcessError } = await import('./lib/error-logger');
    const { logger } = await import('./lib/logger');

    // Handler ini menangkap error yang lolos dari semua lapisan (route handlers,
    // cron, background). Tanpa handler, Node.js akan print stack trace ke stderr
    // lalu mematikan process — error TIDAK sempat ter-trace/di-log ke platform.
    //
    // JANGAN process.exit() di sini: biarkan app hidup jika memungkinkan.
    // Jika process memang crash total, aaPanel Node.js Project Manager akan
    // auto-restart (deployment method — AGENT.md Rule 8).
    process.on('uncaughtException', (err: Error) => {
        logProcessError('uncaughtException', err);
        logger.error('[FATAL] uncaughtException — process continues', err);
    });

    // Promise rejection yang tidak di-handle (biasanya dari async route handler
    // atau cron task yang lupa try/catch).
    process.on('unhandledRejection', (reason: unknown) => {
        logProcessError('unhandledRejection', reason);
    });
}
