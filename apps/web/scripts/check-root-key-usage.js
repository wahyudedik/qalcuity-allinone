/**
 * Verifies whether any source file calls t() with keys belonging to the
 * root-level orphan namespaces (toast.*, type.*, status.*, ... or bare
 * leaves like processing, detailTitle). Used before deleting the orphan block.
 */
const fs = require('fs');
const path = require('path');

const APP_DIR = path.resolve(__dirname, '..');
const SKIP = new Set(['node_modules', '.next', '__tests__', 'dist', '.turbo']);

function walk(d, acc = []) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) {
            if (!SKIP.has(e.name)) walk(path.join(d, e.name), acc);
        } else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.d.ts')) {
            acc.push(path.join(d, e.name));
        }
    }
    return acc;
}

const files = ['app', 'components', 'lib', 'hooks']
    .map((d) => path.join(APP_DIR, d))
    .flatMap((d) => (fs.existsSync(d) ? walk(d) : []));

const re = /\bt\(\s*(['"`])([a-zA-Z][a-zA-Z0-9_.]*)\1\s*[,)]/g;
const rootNs = ['toast.', 'type.', 'status.', 'error.', 'confirm.', 'fields.', 'timeline.', 'employeeInfo.', 'summary.', 'actions.'];
const rootLeaf = ['processing', 'detailTitle', 'approve', 'reject', 'backToList', 'emptyDescription', 'confirmDeleteTitle', 'confirmDeleteMessage'];

const hits = new Map();
for (const f of files) {
    const c = fs.readFileSync(f, 'utf8');
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(c)) !== null) {
        const k = m[2];
        if (rootNs.some((p) => k.startsWith(p)) || rootLeaf.includes(k)) {
            if (!hits.has(k)) hits.set(k, new Set());
            hits.get(k).add(path.relative(APP_DIR, f));
        }
    }
}

console.log('Files scanned:', files.length);
console.log('Used keys hitting ROOT-LEVEL orphan namespaces:', hits.size);
for (const [k, fs2] of hits) console.log('  ' + k + '  <- ' + [...fs2].join(', '));
