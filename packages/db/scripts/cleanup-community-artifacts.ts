/**
 * Cleanup script (Session 72 final verification): bersihkan artifact eksperimen/smoke
 * di DB lokal sehingga state kembali ke seed-baseline.
 *
 * Yang dihapus (targeted, BUKAN reset DB):
 *  1. CommunityDuesPayment yatim: payment pada bill ber-status UNPAID & amountPaid=0.
 *     Pola ini tidak mungkin dihasilkan API pay (atomic $transaction selalu update bill)
 *     maupun seed (rng deterministik, payment hanya untuk plan PAID/PARTIAL).
 *  2. CommunityCashTransaction dengan description prefix 'Smoke test' (artefak smoke matrix).
 *  3. CommunityLetter dengan purpose prefix 'Smoke test surat' (artefak smoke Fase 2).
 *  4. CommunityEvent dengan title prefix 'Smoke test kegiatan' + kas transaksi yang
 *     ter-link ke kegiatan smoke tersebut (artefak smoke Fase 2).
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

    // 3. Hapus surat artefak smoke test (purpose prefix 'Smoke test surat')
    const smokeLetters = await prisma.communityLetter.findMany({
        where: { tenantId, purpose: { startsWith: 'Smoke test surat' } },
        select: { id: true, letterNumber: true, status: true, purpose: true },
    });
    if (smokeLetters.length) {
        await prisma.communityLetter.deleteMany({
            where: { id: { in: smokeLetters.map((l) => l.id) } },
        });
    }
    console.log(`\nSmoke surat dihapus: ${smokeLetters.length}`);
    for (const l of smokeLetters) {
        console.log(`  - ${l.letterNumber ?? '(DRAFT)'} status=${l.status} purpose=${l.purpose}`);
    }

    // 4. Hapus kegiatan artefak smoke test (title prefix 'Smoke test kegiatan')
    //    + kas transaksi yang ter-link ke kegiatan smoke tersebut (agar count-exak
    //    verify tetap konsisten setelah cleanup).
    const smokeEvents = await prisma.communityEvent.findMany({
        where: { tenantId, title: { startsWith: 'Smoke test kegiatan' } },
        select: { id: true, eventNumber: true, title: true, status: true },
    });
    if (smokeEvents.length) {
        await prisma.communityCashTransaction.deleteMany({
            where: { tenantId, eventId: { in: smokeEvents.map((e) => e.id) } },
        });
        await prisma.communityEvent.deleteMany({
            where: { id: { in: smokeEvents.map((e) => e.id) } },
        });
    }
    console.log(`\nSmoke kegiatan dihapus: ${smokeEvents.length}`);
    for (const e of smokeEvents) {
        console.log(`  - ${e.eventNumber} status=${e.status} title=${e.title}`);
    }

    await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
