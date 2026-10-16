/**
 * Session 83 — Comprehensive i18n key audit
 *
 * Scans all t('dotted.key') usages in apps/web source files and resolves each
 * key against messages/id.json and messages/en.json.
 *
 * Reports:
 *   1. Keys used in code but MISSING in one/both locales
 *   2. Keys resolving to a non-string leaf (object instead of string)
 *   3. Self-referencing entries ("key.path": "key.path")
 *   4. Root-level leaf keys that are never referenced (orphan candidates)
 *
 * Usage: node scripts/audit-i18n-keys.js
 */
const fs = require('fs');
const path = require('path');

const APP_DIR = path.resolve(__dirname, '..');
const MESSAGES_DIR = path.join(APP_DIR, 'messages');
const SCAN_DIRS = ['app', 'components', 'lib', 'hooks'];
const SKIP_DIRS = new Set(['node_modules', '.next', '__tests__', 'dist', '.turbo']);

// Matches t('key'), t("key"), t(`key`) — literal dotted keys only.
// Skips template literals containing ${...} (dynamic keys).
const T_CALL_RE = /\bt\(\s*(['"`])([a-zA-Z][a-zA-Z0-9_.]*)\1\s*[,)]/g;
// Dynamic template keys like t(`prefix.${x}`) — counted separately, not audited.
const T_DYNAMIC_RE = /\bt\(\s*`[^`]*\$\{/g;

function loadLocale(name) {
    const raw = fs.readFileSync(path.join(MESSAGES_DIR, name), 'utf8');
    return JSON.parse(raw.replace(/^\uFEFF/, ''));
}

function walkSource(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) walkSource(path.join(dir, entry.name), files);
        } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
            files.push(path.join(dir, entry.name));
        }
    }
    return files;
}

/** Resolve dotted path; returns { found, isStringLeaf, exists } */
function resolve(obj, dotted) {
    const keys = dotted.split('.');
    let current = obj;
    for (const key of keys) {
        if (current === null || current === undefined || typeof current !== 'object') {
            return { found: false, exists: false, isStringLeaf: false };
        }
        if (!(key in current)) return { found: false, exists: false, isStringLeaf: false };
        current = current[key];
    }
    return { found: true, exists: true, isStringLeaf: typeof current === 'string' };
}

/** Collect all leaf paths of a locale object. */
function collectLeaves(obj, prefix = '', out = []) {
    for (const [key, value] of Object.entries(obj)) {
        const p = prefix ? `${prefix}.${key}` : key;
        if (value !== null && typeof value === 'object') {
            collectLeaves(value, p, out);
        } else {
            out.push({ path: p, value });
        }
    }
    return out;
}

function main() {
    const id = loadLocale('id.json');
    const en = loadLocale('en.json');

    const files = SCAN_DIRS.flatMap((d) => walkSource(path.join(APP_DIR, d)));

    /** key -> Set of relative file paths */
    const usedKeys = new Map();
    let dynamicCount = 0;

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const rel = path.relative(APP_DIR, file);

        dynamicCount += (content.match(T_DYNAMIC_RE) || []).length;

        let m;
        T_CALL_RE.lastIndex = 0;
        while ((m = T_CALL_RE.exec(content)) !== null) {
            const key = m[2];
            if (!usedKeys.has(key)) usedKeys.set(key, new Set());
            usedKeys.get(key).add(rel);
        }
    }

    const missingInId = [];
    const missingInEn = [];
    const nonStringLeaf = [];
    const selfRef = [];

    for (const [key, keyFiles] of [...usedKeys.entries()].sort()) {
        const rId = resolve(id, key);
        const rEn = resolve(en, key);
        const sample = [...keyFiles].slice(0, 3).join(', ');
        if (!rId.found || !rId.isStringLeaf) {
            missingInId.push({ key, reason: rId.found ? 'non-string leaf' : 'missing', files: sample });
        }
        if (!rEn.found || !rEn.isStringLeaf) {
            missingInEn.push({ key, reason: rEn.found ? 'non-string leaf' : 'missing', files: sample });
        }
    }

    for (const locale of [['id', id], ['en', en]]) {
        for (const leaf of collectLeaves(locale[1])) {
            if (leaf.value === leaf.path) selfRef.push({ locale: locale[0], key: leaf.path });
        }
    }

    // Root-level leaves that are never referenced by a literal t() call
    const rootOrphans = [];
    for (const leaf of collectLeaves(id)) {
        if (!leaf.path.includes('.')) {
            if (!usedKeys.has(leaf.path)) rootOrphans.push(leaf.path);
        }
    }

    // Machine-readable report for the fix-injector step
    const report = {
        generatedAt: new Date().toISOString(),
        filesScanned: files.length,
        literalKeysUsed: usedKeys.size,
        dynamicCalls: dynamicCount,
        missingInId: missingInId.map((x) => ({ key: x.key, reason: x.reason, files: [...(usedKeys.get(x.key) || [])] })),
        missingInEn: missingInEn.map((x) => ({ key: x.key, reason: x.reason, files: [...(usedKeys.get(x.key) || [])] })),
        selfRef,
        rootOrphans,
    };
    fs.writeFileSync(path.join(__dirname, 'i18n-audit-report-session83.json'), JSON.stringify(report, null, 2));

    const line = (s = '') => console.log(s);
    line('══════════════════════════════════════════════════════════');
    line(' i18n AUDIT — apps/web Session 83');
    line('══════════════════════════════════════════════════════════');
    line(` Source files scanned : ${files.length}`);
    line(` Literal t() keys used : ${usedKeys.size}`);
    line(` Dynamic t(` + '`${...}`' + `) calls   : ${dynamicCount} (not audited)`);
    line('');
    line(` ❌ MISSING in id.json : ${missingInId.length}`);
    for (const x of missingInId) line(`    - ${x.key}  [${x.reason}]  ← ${x.files}`);
    line('');
    line(` ❌ MISSING in en.json : ${missingInEn.length}`);
    for (const x of missingInEn) line(`    - ${x.key}  [${x.reason}]  ← ${x.files}`);
    line('');
    line(` ⚠️  Self-referencing entries ("key": "key") : ${selfRef.length}`);
    for (const x of selfRef.slice(0, 40)) line(`    - [${x.locale}] ${x.key}`);
    if (selfRef.length > 40) line(`    … and ${selfRef.length - 40} more`);
    line('');
    line(` ℹ️  Root-level leaves never referenced literally : ${rootOrphans.length}`);
    for (const k of rootOrphans) line(`    - ${k}`);
    line('══════════════════════════════════════════════════════════');

    const totalIssues = missingInId.length + missingInEn.length;
    line(totalIssues === 0 ? ' RESULT: PASS — no missing keys' : ` RESULT: ${totalIssues} missing-key issue(s)`);
}

main();
