/**
 * Session 44 — Add additional controlEngine i18n keys
 * Run: node scripts/add-session44-control-engine-keys.js
 */
const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.resolve(__dirname, '../../../packages/i18n/messages');

// ── ID (Bahasa Indonesia) ──────────────────────────────────────────────────
const idPatch = {
    controlEngine: {
        importSuccess: 'Berhasil import {count} konfigurasi',
        importError: 'Gagal import',
        resetAllButton: 'Reset Semua',
        core: 'Core',
        modules: {
            projects: 'Proyek',
            projectsDesc: 'Proyek, tugas, grafik gantt',
            fieldService: 'Layanan Lapangan',
            fieldServiceDesc: 'Pekerjaan lapangan, penjadwalan teknisi',
        },
        workflow: {
            autoTransition: 'Transisi Otomatis',
            resetButton: 'Reset',
        },
        dashboard: {
            sizeSmall: 'Kecil',
            sizeMedium: 'Sedang',
            sizeLarge: 'Besar',
            hideWidget: 'Sembunyikan widget',
            showWidget: 'Tampilkan widget',
            revenueChart: 'Grafik Pendapatan',
            expenseChart: 'Grafik Pengeluaran',
            cashFlow: 'Arus Kas',
            salesPipeline: 'Pipeline Penjualan',
            stockLevels: 'Level Stok',
            employeeCount: 'Jumlah Karyawan',
            recentTransactions: 'Transaksi Terbaru',
            topProducts: 'Produk Terlaris',
            overdueInvoices: 'Invoice Jatuh Tempo',
            attendanceOverview: 'Ringkasan Kehadiran',
        },
        permissions: {
            viewerCanExport: 'Viewer Bisa Export',
            viewerCanExportDesc: 'Izinkan role Viewer untuk export data',
            memberCanDelete: 'Member Bisa Hapus',
            memberCanDeleteDesc: 'Izinkan role Member untuk menghapus data',
        },
    },
};

// ── EN (English) ───────────────────────────────────────────────────────────
const enPatch = {
    controlEngine: {
        importSuccess: 'Successfully imported {count} configurations',
        importError: 'Failed to import',
        resetAllButton: 'Reset All',
        core: 'Core',
        modules: {
            projects: 'Projects',
            projectsDesc: 'Projects, tasks, gantt charts',
            fieldService: 'Field Service',
            fieldServiceDesc: 'Field jobs, technician scheduling',
        },
        workflow: {
            autoTransition: 'Auto Transition',
            resetButton: 'Reset',
        },
        dashboard: {
            sizeSmall: 'Small',
            sizeMedium: 'Medium',
            sizeLarge: 'Large',
            hideWidget: 'Hide widget',
            showWidget: 'Show widget',
            revenueChart: 'Revenue Chart',
            expenseChart: 'Expense Chart',
            cashFlow: 'Cash Flow',
            salesPipeline: 'Sales Pipeline',
            stockLevels: 'Stock Levels',
            employeeCount: 'Employee Count',
            recentTransactions: 'Recent Transactions',
            topProducts: 'Top Products',
            overdueInvoices: 'Overdue Invoices',
            attendanceOverview: 'Attendance Overview',
        },
        permissions: {
            viewerCanExport: 'Viewer Can Export',
            viewerCanExportDesc: 'Allow Viewer role to export data',
            memberCanDelete: 'Member Can Delete',
            memberCanDeleteDesc: 'Allow Member role to delete data',
        },
    },
};

// ── Deep merge helper ──────────────────────────────────────────────────────
function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
        if (
            source[key] &&
            typeof source[key] === 'object' &&
            !Array.isArray(source[key]) &&
            target[key] &&
            typeof target[key] === 'object' &&
            !Array.isArray(target[key])
        ) {
            deepMerge(target[key], source[key]);
        } else {
            // Only set if not already present
            if (target[key] === undefined) {
                target[key] = source[key];
            }
        }
    }
}

// ── Process each file ──────────────────────────────────────────────────────
function processFile(filename, patch) {
    const filePath = path.join(MESSAGES_DIR, filename);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Deep merge — only adds missing keys, never overwrites
    deepMerge(data, patch);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 4) + '\n', 'utf-8');
    console.log(`✅ ${filename}: controlEngine additional keys added`);
}

processFile('id.json', idPatch);
processFile('en.json', enPatch);

console.log('\n✅ Done — additional controlEngine keys added to id.json & en.json');
