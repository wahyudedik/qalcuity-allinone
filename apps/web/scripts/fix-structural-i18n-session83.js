/**
 * Session 83 — Phase A: structural i18n fixes (applies to BOTH locales).
 *
 * 1. Removes the root-level orphan block (verified 0 references via
 *    check-root-key-usage.js): duplicated leave/invoice keys + misplaced
 *    HR overview keys sitting at JSON root.
 * 2. Adds the 4 HR overview keys into hr.overview (the path the frontend
 *    actually calls: t('hr.overview.*')).
 * 3. Adds the missing hr.leave delete keys used by the leave detail page
 *    (previously masked by || fallbacks in code).
 *
 * Round-trip safety: messages/*.json verified byte-identical under
 * JSON.stringify(obj, null, 4) with no trailing newline.
 */
const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.resolve(__dirname, '..', 'messages');

// Root-level keys that are orphaned duplicates (0 t() references).
const ROOT_ORPHANS = [
    'toast', 'emptyDescription', 'confirmDeleteTitle', 'confirmDeleteMessage',
    'type', 'status', 'error', 'confirm', 'processing', 'detailTitle',
    'approve', 'reject', 'backToList', 'fields', 'timeline', 'employeeInfo',
    'summary', 'actions', 'noLeaveRequests', 'birthdayNotAvailable',
    'birthdayFieldMissing', 'loadError',
];

const HR_OVERVIEW_ADDS = {
    noLeaveRequests: { id: 'Belum ada pengajuan cuti', en: 'No leave requests yet' },
    birthdayNotAvailable: { id: 'Data ulang tahun belum tersedia', en: 'Birthday data not available' },
    birthdayFieldMissing: { id: 'Field dateOfBirth belum ada di data karyawan', en: 'dateOfBirth field not available in employee data' },
    loadError: { id: 'Gagal memuat data HR', en: 'Failed to load HR data' },
};

const HR_LEAVE_CONFIRM_ADDS = {
    deleteTitle: { id: 'Hapus Cuti', en: 'Delete Leave' },
    deleteMessage: { id: 'Apakah Anda yakin ingin menghapus data cuti ini?', en: 'Are you sure you want to delete this leave data?' },
};

const HR_LEAVE_TOAST_ADDS = {
    deleteSuccess: { id: 'Cuti berhasil dihapus', en: 'Leave deleted successfully' },
    deleteFailed: { id: 'Gagal menghapus cuti', en: 'Failed to delete leave' },
};

function loadLocale(name) {
  const raw = fs.readFileSync(path.join(MESSAGES_DIR, `${name}.json`), 'utf8');
  return JSON.parse(raw.replace(/^\uFEFF/, ''));
}

function saveLocale(name, obj) {
  fs.writeFileSync(path.join(MESSAGES_DIR, `${name}.json`), JSON.stringify(obj, null, 4));
}

function processLocale(name) {
    const obj = loadLocale(name);
    const log = [];

    // 1. Remove root-level orphans
    for (const key of ROOT_ORPHANS) {
        if (key in obj) {
            delete obj[key];
            log.push(`  removed root "${key}"`);
        }
    }

    // Guard: root orphans must NOT have removed anything the namespaces need
    if (obj.hr === undefined) throw new Error('hr namespace disappeared!');
    if (obj.inbox === undefined || obj.apiDocs === undefined) throw new Error('legit root keys disappeared!');

    // 2. hr.overview adds
    if (!obj.hr.overview) throw new Error('hr.overview missing');
    for (const [k, v] of Object.entries(HR_OVERVIEW_ADDS)) {
        obj.hr.overview[k] = v[name];
        log.push(`  hr.overview.${k} = "${v[name]}"`);
    }

    // 3. hr.leave confirm/toast adds
    if (!obj.hr.leave) throw new Error('hr.leave missing');
    for (const [k, v] of Object.entries(HR_LEAVE_CONFIRM_ADDS)) {
        obj.hr.leave.confirm[k] = v[name];
        log.push(`  hr.leave.confirm.${k} = "${v[name]}"`);
    }
    for (const [k, v] of Object.entries(HR_LEAVE_TOAST_ADDS)) {
        obj.hr.leave.toast[k] = v[name];
        log.push(`  hr.leave.toast.${k} = "${v[name]}"`);
    }

    saveLocale(name, obj);
    console.log(`[${name}.json]`);
    for (const l of log) console.log(l);
    console.log('');
}

for (const locale of ['id', 'en']) processLocale(locale);

// Final structural validation
for (const locale of ['id', 'en']) {
    const obj = loadLocale(locale);
    JSON.parse(JSON.stringify(obj));
    console.log(`${locale}.json re-parse OK — top-level keys: ${Object.keys(obj).length}`);
}
console.log('Phase A done.');
