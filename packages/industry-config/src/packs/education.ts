/**
 * @qalcuity/industry-config — Education Industry Pack
 *
 * Industry pack untuk sekolah, universitas, kursus online,
 * lembaga training, dan bisnis pendidikan lainnya. Menyediakan konfigurasi
 * lengkap untuk Student Management, Scheduling, Grade Tracking,
 * Fee Management, dan Certification.
 */

import type { IndustryPack } from '../types';

/**
 * Education Industry Pack.
 *
 * @example
 * ```typescript
 * import { educationIndustryPack } from '@qalcuity/industry-config';
 *
 * // Get pack info
 * console.log(educationIndustryPack.name); // "Education"
 *
 * // Check module
 * const studentModule = educationIndustryPack.modules.studentManagement;
 * // { enabled: true, label: "Manajemen Siswa" }
 *
 * // Get custom fields for contact (student)
 * const studentFields = educationIndustryPack.customFields.contact;
 * // [{ name: 'studentId', ... }, ...]
 * ```
 */
export const educationIndustryPack: IndustryPack = {
    id: 'education',
    name: 'Education',
    description: 'Industry pack untuk sekolah, universitas, kursus online, lembaga training, dan bisnis pendidikan lainnya',

    // Base industry type
    baseIndustry: 'education',

    // Module toggles
    modules: {
        studentManagement: { enabled: true, label: 'Manajemen Siswa/Mahasiswa' },
        scheduling: { enabled: true, label: 'Penjadwalan Kelas' },
        gradeTracking: { enabled: true, label: 'Penilaian & Nilai' },
        feeManagement: { enabled: true, label: 'Manajemen SPP & Biaya' },
        certification: { enabled: true, label: 'Sertifikasi & Kelulusan' },
        hr: { enabled: true, label: 'Manajemen Dosen/Guru' },
        finance: { enabled: true, label: 'Keuangan' },
        crm: { enabled: false, label: 'CRM' },
        inventory: { enabled: false, label: 'Persediaan' },
        projects: { enabled: false, label: 'Manajemen Proyek' },
    },

    // Custom fields
    customFields: {
        contact: [
            { name: 'studentId', type: 'text', label: 'Nomor Induk Siswa/Mahasiswa', required: true },
            { name: 'enrollmentDate', type: 'date', label: 'Tanggal Pendaftaran', required: true },
            { name: 'program', type: 'select', label: 'Program', options: ['SD', 'SMP', 'SMA', 'D3', 'S1', 'S2', 'S3', 'Kursus', 'Training', 'Workshop'], required: true },
            { name: 'major', type: 'text', label: 'Jurusan/Program Studi', required: false },
            { name: 'guardianName', type: 'text', label: 'Nama Wali/Orang Tua', required: false },
            { name: 'guardianPhone', type: 'text', label: 'Telepon Wali/Orang Tua', required: false },
            { name: 'scholarshipStatus', type: 'select', label: 'Status Beasiswa', options: ['Tidak Ada', 'Full', 'Partial', 'Partial 50%'], required: false },
        ],
        invoice: [
            { name: 'academicYear', type: 'text', label: 'Tahun Ajaran', required: true },
            { name: 'semester', type: 'select', label: 'Semester', options: ['Ganjil', 'Genap', 'Antara'], required: true },
            { name: 'feeType', type: 'select', label: 'Jenis Biaya', options: ['SPP', 'Uang Pendaftaran', 'Uang Praktik', 'Uang Ujian', 'Uang Seragam', 'Biaya Kegiatan', 'Lainnya'], required: true },
            { name: 'installmentPlan', type: 'boolean', label: 'Cicilan', required: false },
        ],
        task: [
            { name: 'classSection', type: 'text', label: 'Kelas/Section', required: false },
            { name: 'academicYear', type: 'text', label: 'Tahun Ajaran', required: false },
            { name: 'semester', type: 'select', label: 'Semester', options: ['Ganjil', 'Genap', 'Antara'], required: false },
        ],
    },

    // Dashboard widgets
    dashboardWidgets: [
        { id: 'enrollment-stats', title: 'Statistik Pendaftaran', module: 'studentManagement', size: 'large' },
        { id: 'fee-collection', title: 'Tunggakan SPP', module: 'feeManagement', size: 'medium' },
        { id: 'class-schedule', title: 'Jadwal Kelas Hari Ini', module: 'scheduling', size: 'medium' },
        { id: 'grade-distribution', title: 'Distribusi Nilai', module: 'gradeTracking', size: 'medium' },
        { id: 'attendance-rate', title: 'Tingkat Kehadiran', module: 'studentManagement', size: 'medium' },
    ],

    // Workflow definitions
    workflows: {
        enrollment: {
            states: ['APPLIED', 'REVIEWING', 'ACCEPTED', 'REJECTED', 'ENROLLED', 'WITHDRAWN'],
            initialState: 'APPLIED',
            transitions: [
                { from: 'APPLIED', to: 'REVIEWING', roles: ['ADMIN', 'MEMBER'] },
                { from: 'REVIEWING', to: 'ACCEPTED', roles: ['ADMIN'] },
                { from: 'REVIEWING', to: 'REJECTED', roles: ['ADMIN'] },
                { from: 'ACCEPTED', to: 'ENROLLED', roles: ['MEMBER', 'ADMIN'] },
                { from: 'APPLIED', to: 'WITHDRAWN', roles: ['ADMIN'] },
                { from: 'ACCEPTED', to: 'WITHDRAWN', roles: ['ADMIN'] },
            ],
        },
        feePayment: {
            states: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED'],
            initialState: 'PENDING',
            transitions: [
                { from: 'PENDING', to: 'PARTIAL', roles: ['ADMIN', 'MEMBER'] },
                { from: 'PARTIAL', to: 'PAID', roles: ['ADMIN', 'MEMBER'] },
                { from: 'PENDING', to: 'PAID', roles: ['ADMIN', 'MEMBER'] },
                { from: 'PENDING', to: 'OVERDUE', roles: ['ADMIN'] },
                { from: 'OVERDUE', to: 'PAID', roles: ['ADMIN', 'MEMBER'] },
                { from: 'PENDING', to: 'WAIVED', roles: ['ADMIN'] },
            ],
        },
        certification: {
            states: ['PENDING', 'VERIFIED', 'ISSUED', 'REVOKED'],
            initialState: 'PENDING',
            transitions: [
                { from: 'PENDING', to: 'VERIFIED', roles: ['ADMIN'] },
                { from: 'VERIFIED', to: 'ISSUED', roles: ['ADMIN'] },
                { from: 'ISSUED', to: 'REVOKED', roles: ['ADMIN'] },
            ],
        },
    },
};
