/**
 * Session 73 — Community Fase 2: Surat Pengantar (PDF+QR) & Kegiatan.
 * Menambahkan namespace community.letters / events / verify + key baru
 * di layout.tabs, overview, cash.form, dan portal (myLetters / myEvents).
 * Paritas id/en dijamin identik secara struktural.
 */
const fs = require('fs')
const path = require('path')

const idAdditions = {
    layout: {
        tabs: {
            letters: 'Surat',
            events: 'Kegiatan',
        },
    },
    overview: {
        lettersThisMonth: 'Surat Bulan Ini',
        upcomingEvents: 'Kegiatan Mendatang',
    },
    cash: {
        form: {
            event: 'Kegiatan (opsional)',
            eventNone: '— Tidak terkait kegiatan —',
        },
    },
    letters: {
        title: 'Surat Pengantar',
        subtitle: 'Surat pengantar & domisili untuk warga',
        new: 'Buat Surat',
        back: 'Kembali ke Daftar Surat',
        downloadPdf: 'Unduh PDF',
        filterStatus: 'Filter Status',
        filterType: 'Filter Jenis',
        searchLabel: 'Cari',
        searchPlaceholder: 'Cari nomor, anggota, keperluan...',
        empty: 'Belum ada surat',
        emptyDesc: 'Buat surat pengantar pertama untuk warga.',
        draftNumber: 'Nomor Draft',
        edit: 'Edit',
        delete: 'Hapus',
        revoke: 'Cabut',
        copyVerify: 'Salin Link Verifikasi',
        issue: 'Terbitkan',
        editTitle: 'Edit Surat',
        newTitle: 'Buat Surat Baru',
        deleteConfirmDesc: 'Surat draft yang dihapus tidak dapat dipulihkan.',
        accessDenied: {
            title: 'Akses Ditolak',
            desc: 'Anda tidak memiliki izin untuk mengelola surat.',
        },
        table: {
            letterNumber: 'Nomor Surat',
            letterType: 'Jenis',
            member: 'Anggota',
            memberCode: 'Kode Anggota',
            purpose: 'Keperluan',
            destination: 'Tujuan',
            status: 'Status',
            issuedAt: 'Terbit',
            revokedAt: 'Dicabut',
        },
        status: {
            draft: 'Draft',
            issued: 'Terbit',
            revoked: 'Dicabut',
        },
        type: {
            pengantar: 'Pengantar',
            domisili: 'Domisili',
            sktm: 'SKTM',
            lainnya: 'Lainnya',
        },
        form: {
            member: 'Anggota',
            memberPlaceholder: 'Pilih anggota...',
            letterType: 'Jenis Surat',
            purpose: 'Keperluan',
            destination: 'Tujuan',
            notes: 'Catatan',
        },
        toast: {
            created: 'Surat berhasil dibuat',
            updated: 'Surat berhasil diperbarui',
            deleted: 'Surat berhasil dihapus',
            issued: 'Surat berhasil diterbitkan',
            revoked: 'Surat berhasil dicabut',
            linkCopied: 'Link verifikasi disalin',
            copyFailed: 'Gagal menyalin link',
        },
        revokeForm: {
            title: 'Cabut Surat',
            reason: 'Alasan Penarikan',
            reasonInvalid: 'Alasan harus 3-500 karakter',
            submit: 'Cabut Surat',
        },
        issueConfirm: {
            title: 'Terbitkan Surat?',
            desc: 'Surat akan ditandatangani secara digital dan nomor resmi diterbitkan. Tindakan ini tidak dapat dibatalkan.',
        },
        detail: {
            letterInfo: 'Informasi Surat',
            purpose: 'Keperluan',
            createdAt: 'Dibuat',
            updatedAt: 'Diperbarui',
            memberInfo: 'Informasi Pemohon',
            gender: 'Jenis Kelamin',
            male: 'Laki-laki',
            female: 'Perempuan',
            birthDate: 'Tanggal Lahir',
            nikStatus: 'Status NIK',
            nikStored: 'Tersimpan (terenkripsi)',
            nikMissing: 'Tidak tersedia',
            phone: 'Telepon',
            address: 'Alamat',
            history: 'Riwayat',
            issuedAt: 'Diterbitkan',
            revokedAt: 'Dicabut',
            revokeReason: 'Alasan Penarikan',
            verification: 'Verifikasi Publik',
            verifyDesc: 'Bagikan link ini untuk memverifikasi keaslian surat tanpa login.',
            verifyDraft: 'Link verifikasi tersedia setelah surat diterbitkan.',
            verifyRevoked: 'Surat ini telah dicabut — link verifikasi menunjukkan status tidak berlaku.',
        },
    },
    events: {
        title: 'Kegiatan',
        subtitle: 'Jadwal & anggaran kegiatan warga',
        new: 'Buat Kegiatan',
        editTitle: 'Edit Kegiatan',
        newTitle: 'Buat Kegiatan Baru',
        empty: 'Belum ada kegiatan',
        emptyDesc: 'Buat kegiatan pertama untuk warga.',
        deleteConfirmDesc: 'Kegiatan yang sudah memiliki transaksi kas tidak dapat dihapus.',
        searchPlaceholder: 'Cari nomor, judul, lokasi...',
        accessDenied: {
            title: 'Akses Ditolak',
            desc: 'Anda tidak memiliki izin untuk mengelola kegiatan.',
        },
        table: {
            eventNumber: 'Nomor',
            title: 'Judul',
            category: 'Kategori',
            startsAt: 'Mulai',
            endsAt: 'Selesai',
            location: 'Lokasi',
            budget: 'Anggaran',
            status: 'Status',
        },
        status: {
            planned: 'Terjadwal',
            ongoing: 'Berlangsung',
            done: 'Selesai',
            cancelled: 'Dibatalkan',
        },
        category: {
            rapat: 'Rapat',
            kerjaBakti: 'Kerja Bakti',
            perayaan: 'Perayaan',
            sosial: 'Sosial',
            lainnya: 'Lainnya',
        },
        form: {
            title: 'Judul',
            description: 'Deskripsi',
            category: 'Kategori',
            startsAt: 'Waktu Mulai',
            endsAt: 'Waktu Selesai',
            location: 'Lokasi',
            maxCapacity: 'Kuota Maksimal',
            budgetAmount: 'Anggaran',
            publishedAt: 'Dipublikasikan',
            titleRequired: 'Judul minimal 3 karakter',
            startsAtRequired: 'Waktu mulai wajib diisi',
            invalidDate: 'Waktu selesai harus setelah waktu mulai',
        },
        toast: {
            created: 'Kegiatan berhasil dibuat',
            updated: 'Kegiatan berhasil diperbarui',
            deleted: 'Kegiatan berhasil dihapus',
        },
        detail: {
            eventInfo: 'Informasi Kegiatan',
            publishedAt: 'Dipublikasikan',
            unpublished: 'Belum dipublikasikan',
            budgetTitle: 'Anggaran & Realisasi',
            income: 'Pemasukan',
            expense: 'Pengeluaran',
            budgetUsage: 'Penggunaan Anggaran',
            cashRealization: 'Realisasi Kas',
            noCash: 'Belum ada transaksi kas untuk kegiatan ini.',
        },
    },
    verify: {
        title: 'Verifikasi Surat Pengantar',
        subtitle: 'Halaman verifikasi keaslian surat pengantar',
        valid: 'SAH & VALID',
        invalid: 'TIDAK BERLAKU',
        draft: 'DRAF — BELUM RESMI',
        notFoundTitle: 'Surat tidak ditemukan',
        notFoundDesc: 'Link verifikasi tidak valid atau surat sudah tidak terdaftar. Pastikan link yang Anda buka lengkap dan benar.',
        nomor: 'Nomor Surat',
        jenis: 'Jenis Surat',
        pemohon: 'Nama Pemohon',
        keperluan: 'Keperluan',
        tujuan: 'Tujuan',
        tanggalTerbit: 'Tanggal Terbit',
        penandatangan: 'Penandatangan',
        tanggalDicabut: 'Tanggal Dibatalkan',
        alasanDicabut: 'Alasan Pembatalan',
        footer: 'Halaman ini diverifikasi otomatis oleh Qalcuity. NIK tidak ditampilkan untuk melindungi privasi.',
    },
    portal: {
        myLetters: {
            title: 'Surat Saya',
            quickDesc: 'Surat pengantar yang diterbitkan untuk Anda',
            empty: 'Belum ada surat',
            emptyDesc: 'Surat yang diterbitkan untuk Anda akan muncul di sini.',
            verify: 'Verifikasi',
        },
        myEvents: {
            title: 'Kegiatan Warga',
            quickDesc: 'Jadwal kegiatan lingkungan',
            empty: 'Belum ada kegiatan',
            emptyDesc: 'Kegiatan yang akan datang akan muncul di sini.',
        },
    },
}

const enAdditions = {
    layout: {
        tabs: {
            letters: 'Letters',
            events: 'Events',
        },
    },
    overview: {
        lettersThisMonth: 'Letters This Month',
        upcomingEvents: 'Upcoming Events',
    },
    cash: {
        form: {
            event: 'Event (optional)',
            eventNone: '— Not linked to an event —',
        },
    },
    letters: {
        title: 'Introduction Letters',
        subtitle: 'Introduction & domicile letters for residents',
        new: 'New Letter',
        back: 'Back to Letters',
        downloadPdf: 'Download PDF',
        filterStatus: 'Status Filter',
        filterType: 'Type Filter',
        searchLabel: 'Search',
        searchPlaceholder: 'Search number, member, purpose...',
        empty: 'No letters yet',
        emptyDesc: 'Create the first introduction letter for a resident.',
        draftNumber: 'Draft Number',
        edit: 'Edit',
        delete: 'Delete',
        revoke: 'Revoke',
        copyVerify: 'Copy Verify Link',
        issue: 'Issue',
        editTitle: 'Edit Letter',
        newTitle: 'Create New Letter',
        deleteConfirmDesc: 'Deleted draft letters cannot be recovered.',
        accessDenied: {
            title: 'Access Denied',
            desc: 'You do not have permission to manage letters.',
        },
        table: {
            letterNumber: 'Letter Number',
            letterType: 'Type',
            member: 'Member',
            memberCode: 'Member Code',
            purpose: 'Purpose',
            destination: 'Destination',
            status: 'Status',
            issuedAt: 'Issued',
            revokedAt: 'Revoked',
        },
        status: {
            draft: 'Draft',
            issued: 'Issued',
            revoked: 'Revoked',
        },
        type: {
            pengantar: 'Introduction',
            domisili: 'Domicile',
            sktm: 'SKTM',
            lainnya: 'Others',
        },
        form: {
            member: 'Member',
            memberPlaceholder: 'Select member...',
            letterType: 'Letter Type',
            purpose: 'Purpose',
            destination: 'Destination',
            notes: 'Notes',
        },
        toast: {
            created: 'Letter created successfully',
            updated: 'Letter updated successfully',
            deleted: 'Letter deleted successfully',
            issued: 'Letter issued successfully',
            revoked: 'Letter revoked successfully',
            linkCopied: 'Verify link copied',
            copyFailed: 'Failed to copy link',
        },
        revokeForm: {
            title: 'Revoke Letter',
            reason: 'Revocation Reason',
            reasonInvalid: 'Reason must be 3-500 characters',
            submit: 'Revoke Letter',
        },
        issueConfirm: {
            title: 'Issue Letter?',
            desc: 'The letter will be digitally signed and an official number issued. This action cannot be undone.',
        },
        detail: {
            letterInfo: 'Letter Information',
            purpose: 'Purpose',
            createdAt: 'Created',
            updatedAt: 'Updated',
            memberInfo: 'Applicant Information',
            gender: 'Gender',
            male: 'Male',
            female: 'Female',
            birthDate: 'Date of Birth',
            nikStatus: 'NIK Status',
            nikStored: 'Stored (encrypted)',
            nikMissing: 'Not available',
            phone: 'Phone',
            address: 'Address',
            history: 'History',
            issuedAt: 'Issued At',
            revokedAt: 'Revoked At',
            revokeReason: 'Revocation Reason',
            verification: 'Public Verification',
            verifyDesc: 'Share this link to verify the letter authenticity without login.',
            verifyDraft: 'Verify link becomes available after the letter is issued.',
            verifyRevoked: 'This letter has been revoked — the verify link shows invalid status.',
        },
    },
    events: {
        title: 'Events',
        subtitle: 'Resident event schedule & budget',
        new: 'New Event',
        editTitle: 'Edit Event',
        newTitle: 'Create New Event',
        empty: 'No events yet',
        emptyDesc: 'Create the first event for residents.',
        deleteConfirmDesc: 'Events with cash transactions cannot be deleted.',
        searchPlaceholder: 'Search number, title, location...',
        accessDenied: {
            title: 'Access Denied',
            desc: 'You do not have permission to manage events.',
        },
        table: {
            eventNumber: 'Number',
            title: 'Title',
            category: 'Category',
            startsAt: 'Starts',
            endsAt: 'Ends',
            location: 'Location',
            budget: 'Budget',
            status: 'Status',
        },
        status: {
            planned: 'Planned',
            ongoing: 'Ongoing',
            done: 'Done',
            cancelled: 'Cancelled',
        },
        category: {
            rapat: 'Meeting',
            kerjaBakti: 'Community Work',
            perayaan: 'Celebration',
            sosial: 'Social',
            lainnya: 'Others',
        },
        form: {
            title: 'Title',
            description: 'Description',
            category: 'Category',
            startsAt: 'Start Time',
            endsAt: 'End Time',
            location: 'Location',
            maxCapacity: 'Max Capacity',
            budgetAmount: 'Budget',
            publishedAt: 'Published At',
            titleRequired: 'Title must be at least 3 characters',
            startsAtRequired: 'Start time is required',
            invalidDate: 'End time must be after start time',
        },
        toast: {
            created: 'Event created successfully',
            updated: 'Event updated successfully',
            deleted: 'Event deleted successfully',
        },
        detail: {
            eventInfo: 'Event Information',
            publishedAt: 'Published',
            unpublished: 'Not published',
            budgetTitle: 'Budget & Realization',
            income: 'Income',
            expense: 'Expense',
            budgetUsage: 'Budget Usage',
            cashRealization: 'Cash Realization',
            noCash: 'No cash transactions for this event yet.',
        },
    },
    verify: {
        title: 'Letter Verification',
        subtitle: 'Introduction letter authenticity verification page',
        valid: 'VALID & AUTHENTIC',
        invalid: 'INVALID',
        draft: 'DRAFT — NOT OFFICIAL',
        notFoundTitle: 'Letter not found',
        notFoundDesc: 'The verification link is invalid or the letter is no longer registered. Please ensure the link you opened is complete and correct.',
        nomor: 'Letter Number',
        jenis: 'Letter Type',
        pemohon: 'Applicant Name',
        keperluan: 'Purpose',
        tujuan: 'Destination',
        tanggalTerbit: 'Issue Date',
        penandatangan: 'Signed By',
        tanggalDicabut: 'Revocation Date',
        alasanDicabut: 'Revocation Reason',
        footer: 'This page is automatically verified by Qalcuity. NIK is never displayed to protect privacy.',
    },
    portal: {
        myLetters: {
            title: 'My Letters',
            quickDesc: 'Introduction letters issued for you',
            empty: 'No letters yet',
            emptyDesc: 'Letters issued for you will appear here.',
            verify: 'Verify',
        },
        myEvents: {
            title: 'Community Events',
            quickDesc: 'Community event schedule',
            empty: 'No events yet',
            emptyDesc: 'Upcoming events will appear here.',
        },
    },
}

function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
        const sv = source[key]
        if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
            if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
                target[key] = {}
            }
            deepMerge(target[key], sv)
        } else {
            target[key] = sv
        }
    }
}

function flattenKeys(obj, prefix, out) {
    for (const k of Object.keys(obj)) {
        const v = obj[k]
        const p = prefix ? `${prefix}.${k}` : k
        if (v && typeof v === 'object' && !Array.isArray(v)) flattenKeys(v, p, out)
        else out.add(p)
    }
    return out
}

function process(file, additions, label) {
    const filePath = path.join(__dirname, '..', 'messages', file)
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    if (!json.community) throw new Error(`community namespace missing in ${file}`)
    deepMerge(json.community, additions)
    fs.writeFileSync(filePath, JSON.stringify(json, null, 4) + '\n', 'utf8')
    const keys = flattenKeys(additions, 'community', new Set())
    console.log(`[${label}] merged ${keys.size} leaf keys -> ${file}`)
}

process('id.json', idAdditions, 'id')
process('en.json', enAdditions, 'en')

// Paritas struktural: bandingkan semua leaf key di seluruh namespace community
const idJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'messages', 'id.json'), 'utf8'))
const enJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'messages', 'en.json'), 'utf8'))
const idKeys = flattenKeys(idJson.community, 'community', new Set())
const enKeys = flattenKeys(enJson.community, 'community', new Set())
const missingInEn = [...idKeys].filter((k) => !enKeys.has(k))
const missingInId = [...enKeys].filter((k) => !idKeys.has(k))
if (missingInEn.length || missingInId.length) {
    console.error('PARITY GAGAL!')
    if (missingInEn.length) console.error('  missing in en.json:', missingInEn.join(', '))
    if (missingInId.length) console.error('  missing in id.json:', missingInId.join(', '))
    process.exit(1)
}
console.log(`PARITY LOLOS: ${idKeys.size} leaf keys identik id/en (community namespace)`)
