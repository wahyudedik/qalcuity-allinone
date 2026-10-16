/**
 * Session 83 — Fix `t('common.error')` misuse.
 *
 * `common.error` is an OBJECT node `{ delete, load, save }` in messages JSON,
 * so `getNestedValue()` cannot return a string for it (audit flagged it as
 * "non-string leaf"). 8 frontend files used `t('common.error')` as a generic
 * error string. The correct existing key for that is `common.errorOccurred`
 * ("Terjadi Kesalahan" / "An Error Occurred").
 *
 * This script replaces ONLY exact `t('common.error')` call sites (closing
 * paren ensures `t('common.error.load')` / `.save` / `.delete` are untouched).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILES = [
    'components/ai/ai-chat.tsx',
    'app/(auth)/register/page.tsx',
    'app/(auth)/login/page.tsx',
    'app/dashboard/settings/page.tsx',
    'app/dashboard/inbox/page.tsx',
    'app/dashboard/crm/pipeline/page.tsx',
    'app/dashboard/crm/deals/page.tsx',
    'app/dashboard/community/portal/events/page.tsx',
];

const DRY = process.argv.includes('--dry');
let total = 0;

for (const rel of FILES) {
    const abs = path.join(ROOT, rel);
    const src = fs.readFileSync(abs, 'utf8');
    // Match t('common.error') or t("common.error") — exact key + closing paren.
    const re = /t\((['"])common\.error\1\)/g;
    const count = (src.match(re) || []).length;
    if (count === 0) {
        console.log(`0  ${rel}`);
        continue;
    }
    const out = src.replace(re, "t('common.errorOccurred')");
    if (!DRY) fs.writeFileSync(abs, out);
    total += count;
    console.log(`${count}  ${rel}`);
}

console.log(`\n${DRY ? '(dry-run) ' : ''}total replaced: ${total}`);
