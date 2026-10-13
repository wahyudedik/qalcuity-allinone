/**
 * Cleanup script (Session 72 final verification): bersihkan artifact eksperimen/smoke
 * di DB lokal sehingga state kembali ke seed-baseline.
 *
 * Yang dihapus (targeted, BUKAN reset DB):
 *  1. CommunityDuesPayment yatim: payment pada bill ber-status UNPAID & amountPaid=0.
 *     Pola ini tidak mungkin dihasilkan API pay (atomic $transaction selalu update bill)
 *     maupun seed (rng deterministik, payment hanya untuk plan PAID/PARTIAL).
 *  2. CommunityCashTransaction dengan description prefix 'Smoke test' (artefak smoke matrix).
 *
 * Idempoten: aman dijalankan berulang.
 */
import { prisma } from '../src';

async function main() {
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'rt02-melati' } });
    if (!tenant) throw new Error('Tenant rt02-melati tidak ditemukan');
    const tenantId = tenant.id;

    // 1. Hapus payment yatim (bill UNPAID + amountPaid=0 tapi punya payment)
    const orphanPayments = await prisma.communityDuesPayment.findMany({
        where: {
            tenantId,
            bill: { status: 'UNPAID', amountPaid: 0 },
        },
        select: { id: true, paymentNumber: true, amount: true },
    });
    if (orphanPayments.length) {
        await prisma.communityDuesPayment.deleteMany({
            where: { id: { in: orphanPayments.map((p) => p.id) } },
        });
    }
    console.log(`Orphan payments dihapus: ${orphanPayments.length}`);
    for (const p of orphanPayments) {
        console.log(`  - ${p.paymentNumber} amount=${p.amount.toNumber()}`);
    }

    // 2. Hapus cash transaction artefak smoke test
    const smokeTx = await prisma.communityCashTransaction.findMany({
        where: { tenantId, description: { startsWith: 'Smoke test' } },
        select: { id: true, txNumber: true, description: true, amount: true },
    });
    if (smokeTx.length) {
        await prisma.communityCashTransaction.deleteMany({
            where: { id: { in: smokeTx.map((t) => t.id) } },
        });
    }
    console.log(`\nSmoke cash transactions dihapus: ${smokeTx.length}`);
    for (const t of smokeTx) {
        console.log(`  - ${t.txNumber} amount=${t.amount.toNumber()} desc=${t.description}`);
    }

    await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
